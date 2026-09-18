"""API routes for the ML service.

Production endpoints
- ``GET  /health``
- ``POST /api/v1/analyze``
- ``POST /api/v1/analyze/batch``
- ``GET  /api/v1/model-info``

Frontend-compat endpoints (the existing React app calls these)
- ``POST /predict-category``, ``POST /predict-priority``
- ``POST /analyze-sentiment``, ``POST /suggest-similar``, ``POST /retrain-model``
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Request

from app.schemas.complaint_schema import (
    AnalysisResult,
    AnalyzeRequest,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    HealthResponse,
    ModelInfoResponse,
    PredictionResponse,
    RetrainResponse,
    SentimentResponse,
    SimilarComplaintResponse,
    TextRequest,
)
from app.config import resolve_path
from app.utils.exceptions import InvalidRequestError, MLProcessingError
from app.utils.logger import get_logger

logger = get_logger("ml-service.api")

router = APIRouter()


def _engine(request: Request):
    return request.app.state.engine


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health",
    description="Liveness + model readiness probe used by container/cloud healthchecks.",
)
async def health(request: Request) -> HealthResponse:
    data = _engine(request).health()
    return HealthResponse(**data)


@router.post(
    "/api/v1/analyze",
    response_model=AnalysisResult,
    summary="Analyze a complaint",
    description="Classify the category, predict priority, recommend a department, "
    "detect duplicates, extract keywords and summarize a single complaint.",
)
async def analyze(request: Request, payload: AnalyzeRequest) -> AnalysisResult:
    start = time.perf_counter()
    logger.info(f"analyze request: {payload.complaint_id or 'n/a'}")
    result = _engine(request).analyze(payload)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    result["processing_time_ms"] = elapsed_ms
    logger.info(f"analysis completed in {elapsed_ms}ms for category={result['category']}")
    return AnalysisResult(**result)


@router.post(
    "/api/v1/analyze/batch",
    response_model=BatchAnalyzeResponse,
    summary="Analyze multiple complaints",
    description="Runs the full analysis pipeline over up to 100 complaints in one call.",
)
async def analyze_batch(request: Request, payload: BatchAnalyzeRequest) -> BatchAnalyzeResponse:
    engine = _engine(request)
    max_size = engine.settings.MAX_BATCH_SIZE
    if len(payload.complaints) > max_size:
        raise InvalidRequestError(f"Batch size exceeds limit of {max_size}.")

    start = time.perf_counter()
    results: List[AnalysisResult] = []
    for item in payload.complaints:
        result = engine.analyze(item)
        results.append(AnalysisResult(**result))
    total_ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(f"batch analysis completed: {len(results)} complaints in {total_ms}ms")
    return BatchAnalyzeResponse(status="success", results=results, processing_time_ms=total_ms)


@router.get(
    "/api/v1/model-info",
    response_model=ModelInfoResponse,
    summary="Deployed model information",
    description="Model names, version, category count and duplicate settings.",
)
async def model_info(request: Request) -> ModelInfoResponse:
    return ModelInfoResponse(**_engine(request).model_info())


# --- Frontend compatibility endpoints -----------------------------------------

@router.post(
    "/predict-category",
    response_model=PredictionResponse,
    summary="Predict category (legacy)",
    description="Legacy endpoint consumed by the existing frontend. Prefer /api/v1/analyze for new integrations.",
)
async def predict_category(request: Request, payload: TextRequest) -> PredictionResponse:
    classification = _engine(request).classifier_service.classify(payload.text)
    return PredictionResponse(prediction=classification.category, confidence=classification.confidence)


@router.post(
    "/predict-priority",
    response_model=PredictionResponse,
    summary="Predict priority (legacy)",
    description="Legacy endpoint consumed by the existing frontend. Prefer /api/v1/analyze for new integrations.",
)
async def predict_priority(request: Request, payload: TextRequest) -> PredictionResponse:
    classification = _engine(request).classifier_service.classify(payload.text)
    priority = _engine(request).priority_service.predict(payload.text, category=classification.category)
    return PredictionResponse(prediction=priority.priority, confidence=priority.confidence)


@router.post(
    "/analyze-sentiment",
    response_model=SentimentResponse,
    summary="Analyze sentiment (legacy)",
    description="Lightweight lexicon-based sentiment classification for the existing frontend.",
)
async def analyze_sentiment(request: Request, payload: TextRequest) -> SentimentResponse:
    result = _engine(request).sentiment(payload.text)
    return SentimentResponse(**result)


@router.post(
    "/suggest-similar",
    response_model=List[SimilarComplaintResponse],
    summary="Suggest similar complaints (legacy)",
    description="Returns the most similar existing complaints with similarity scores.",
)
async def suggest_similar(request: Request, payload: TextRequest) -> List[SimilarComplaintResponse]:
    matches = _engine(request).similar(payload.text)
    return [SimilarComplaintResponse(**m) for m in matches]


@router.post(
    "/retrain-model",
    response_model=RetrainResponse,
    summary="Trigger model retraining (legacy)",
    description="Runs the training pipeline offline (only when TRAINING_ENABLED=true and a dataset exists).",
)
async def retrain_model(request: Request) -> RetrainResponse:
    engine = _engine(request)
    if not engine.settings.TRAINING_ENABLED:
        return RetrainResponse(
            message="Retraining is disabled (TRAINING_ENABLED=false). "
            "Run the training scripts offline: python training/train_classifier.py"
        )
    result = await _retrain(engine.settings)
    engine.load(bootstrap_duplicates=False)
    return RetrainResponse(message=result)


async def _retrain(settings: Any) -> str:
    python = "python"
    base = resolve_path(".")
    commands = [
        [python, str(Path(base) / "training" / "train_classifier.py")],
        [python, str(Path(base) / "training" / "train_priority.py")],
        [python, str(Path(base) / "training" / "build_duplicate_index.py")],
    ]
    results = []
    for cmd in commands:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise MLProcessingError(f"Retraining failed: {stderr.decode()[-500:]}")
        results.append(stdout.decode()[-200:].strip())
    return "Retraining completed: " + "; ".join(results)


__all__ = ["router"]