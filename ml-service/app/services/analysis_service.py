"""ML service composition root.

Builds every model/service once at startup, wires configuration, and exposes a
single ``analyze`` orchestration used by the API and the tests.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import Settings, get_settings, resolve_path
from app.models.complaint_classifier import ComplaintClassifier
from app.models.duplicate_detector import DuplicateDetector, build_embedder
from app.models.priority_predictor import PriorityPredictor
from app.models.recommendation_engine import DepartmentRecommender
from app.schemas.complaint_schema import AnalyzeRequest
from app.services.classification_service import ClassificationService
from app.services.duplicate_service import DuplicateService
from app.services.preprocessing_service import (
    analyze_sentiment,
    extract_keywords,
    generate_summary,
)
from app.services.priority_service import PriorityService
from app.services.recommendation_service import RecommendationService
from app.utils.exceptions import MLProcessingError
from app.utils.logger import get_logger

logger = get_logger("ml-service.engine")

# Sample dataset used to auto-bootstrap the duplicate index when no trained index exists.
DEFAULT_SAMPLE_DATASET = "data/raw/complaints.csv"


@dataclass
class Engine:
    settings: Settings
    classifier: ComplaintClassifier
    priority: PriorityPredictor
    recommender: DepartmentRecommender
    detection: DuplicateDetector
    classifier_service: ClassificationService
    priority_service: PriorityService
    recommendation_service: RecommendationService
    duplicate_service: DuplicateService
    status: str = "initialized"
    boot_errors: List[str] = field(default_factory=list)

    # ------------------------------------------------------------------
    @classmethod
    def build(cls, settings: Settings | None = None) -> "Engine":
        cfg = settings or get_settings()
        classifier = ComplaintClassifier(
            model_path=resolve_path(cfg.MODEL_PATH),
            vectorizer_path=resolve_path(cfg.VECTORIZER_PATH),
            encoder_path=resolve_path(cfg.LABEL_ENCODER_PATH),
        )
        priority = PriorityPredictor(
            model_path=resolve_path(cfg.PRIORITY_MODEL_PATH),
            vectorizer_path=resolve_path(cfg.PRIORITY_VECTORIZER_PATH),
        )
        recommender = DepartmentRecommender(resolve_path(cfg.DEPARTMENT_MAPPING_PATH))

        embedder = build_embedder(cfg.EMBEDDING_BACKEND, cfg.EMBEDDING_MODEL)
        detector = DuplicateDetector(
            threshold=cfg.DUPLICATE_THRESHOLD,
            max_results=cfg.MAX_SIMILAR_RESULTS,
            embedder=embedder,
        )

        engine = cls(
            settings=cfg,
            classifier=classifier,
            priority=priority,
            recommender=recommender,
            detection=detector,
            classifier_service=ClassificationService(classifier),
            priority_service=PriorityService(priority),
            recommendation_service=RecommendationService(recommender),
            duplicate_service=DuplicateService(detector, cfg),
        )
        return engine

    def load(self, bootstrap_duplicates: bool = True) -> None:
        """Load model artifacts and the duplicate index. Failures degrade gracefully."""
        self.boot_errors.clear()
        try:
            self.classifier.load()
        except Exception as exc:  # noqa: BLE001
            self.boot_errors.append(f"classifier: {exc}")
        try:
            self.priority.load()
        except Exception as exc:  # noqa: BLE001
            self.boot_errors.append(f"priority: {exc}")
        try:
            self.recommender.load()
        except Exception as exc:  # noqa: BLE001
            self.boot_errors.append(f"recommendation: {exc}")

        if bootstrap_duplicates and not self.detection.loaded:
            index_path = resolve_path(self.settings.DUPLICATES_INDEX_PATH)
            loaded = self.detection.load(index_path)
            if not loaded:
                self._bootstrap_duplicates_from_sample()
        else:
            self.detection.load(resolve_path(self.settings.DUPLICATES_INDEX_PATH))

        self.status = "ready"
        loaded = sum(
            [self.classifier.loaded, self.priority.loaded, self.recommender.loaded, self.detection.loaded]
        )
        logger.info(f"ML engine ready (models loaded: {loaded}/4)")

    def _bootstrap_duplicates_from_sample(self) -> None:
        csv_path = resolve_path(DEFAULT_SAMPLE_DATASET)
        if not csv_path.exists() or self.detection.embedder is None:
            return
        try:
            import pandas as pd

            frame = pd.read_csv(csv_path)
            if "existing" in frame.columns:
                frame = frame[frame["existing"] == True]  # noqa: E712
            frame = frame.sample(min(200, len(frame)), random_state=42)
            docs = frame.to_dict(orient="records")
            self.detection.build_index(docs)
            logger.info(f"Duplicate index bootstrapped from sample dataset ({len(docs)} complaints)")
        except Exception as exc:  # noqa: BLE001
            self.boot_errors.append(f"duplicate bootstrapping: {exc}")

    # ------------------------------------------------------------------
    def analyze(self, request: AnalyzeRequest) -> Dict[str, Any]:
        start = time.perf_counter()
        text = request.text
        complaint_id = request.complaint_id

        category_result = self.classifier_service.classify(text)
        priority_result = self.priority_service.predict(text, category=category_result.category)
        duplicate_result = self.duplicate_service.detect(text)
        recommendation = self.recommendation_service.recommend_for_text(
            category_result.category, text
        )
        department = recommendation.department
        dept_reason = recommendation.reason
        keywords = extract_keywords(text)
        summary = generate_summary(text)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        return {
            "complaint_id": complaint_id,
            "category": category_result.category,
            "category_confidence": category_result.confidence,
            "priority": priority_result.priority,
            "priority_confidence": priority_result.confidence,
            "recommended_department": department,
            "recommendation_reason": dept_reason,
            "is_duplicate": duplicate_result.is_duplicate,
            "duplicate_similarity": duplicate_result.max_similarity,
            "matched_complaint_ids": duplicate_result.matched_ids,
            "keywords": keywords,
            "summary": summary,
            "prediction_reason": priority_result.explanation,
            "status": "success",
            "model_version": self.settings.MODEL_VERSION,
            "processing_time_ms": elapsed_ms,
        }

    def sentiment(self, text: str) -> Dict[str, Any]:
        sentiment, confidence = analyze_sentiment(text)
        return {"sentiment": sentiment, "confidence": confidence}

    def similar(self, text: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        result = self.duplicate_service.detect(text, limit=limit)
        out = [
            {
                "complaintId": m.complaint_id,
                "title": m.title,
                "similarity": m.similarity,
                "resolutionSummary": m.resolution_summary,
            }
            for m in result.matches
        ]
        return out

    def model_info(self) -> Dict[str, Any]:
        return {
            "classifier": self.classifier.name,
            "version": self.settings.MODEL_VERSION,
            "categories": len(self.classifier.categories),
            "embedding_model": self.detection.embedder.model_name if self.detection.embedder else "n/a",
            "embedding_backend": self.detection.embedder.name if self.detection.embedder else "n/a",
            "duplicate_threshold": self.settings.DUPLICATE_THRESHOLD,
            "status": self.status,
        }

    def health(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "service": self.settings.APP_SERVICE_NAME,
            "model_loaded": self.classifier.loaded or True,  # keyword fallback always available
            "category_model_loaded": self.classifier.loaded,
            "priority_model_loaded": self.priority.loaded,
            "duplicate_index_loaded": self.detection.loaded,
            "version": self.settings.MODEL_VERSION,
        }


def build_engine(settings: Settings | None = None) -> Engine:
    engine = Engine.build(settings or get_settings())
    engine.load()
    return engine


__all__ = ["Engine", "build_engine", "MLProcessingError"]