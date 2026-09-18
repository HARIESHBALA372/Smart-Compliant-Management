"""Pydantic request/response models for the ML service API."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_TEXT_LENGTH = 2000


class AnalyzeRequest(BaseModel):
    """A single complaint submitted for intelligent analysis."""

    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [{
        "complaint_id": "CMP1001",
        "text": "The street light near the school has not been working for three days.",
        "location": "Chennai",
        "user_id": "USER123",
    }]})

    complaint_id: Optional[str] = Field(
        default=None, max_length=128, description="Optional client-side complaint identifier (echoed back)."
    )
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH, description="Complaint description text.")
    location: Optional[str] = Field(default=None, max_length=255, description="Optional location string.")
    user_id: Optional[str] = Field(default=None, max_length=128, description="Optional user identifier.")

    @field_validator("text")
    @classmethod
    def _text_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Complaint text cannot be empty.")
        return stripped


class AnalysisResult(BaseModel):
    """Full analysis result for one complaint."""

    model_config = ConfigDict(json_schema_extra={"examples": [{
        "complaint_id": "CMP1001",
        "category": "Street Lights",
        "category_confidence": 0.94,
        "priority": "High",
        "priority_confidence": 0.89,
        "recommended_department": "Electricity",
        "recommendation_reason": "The complaint relates to street lighting infrastructure.",
        "is_duplicate": False,
        "duplicate_similarity": 0.12,
        "matched_complaint_ids": [],
        "keywords": ["street light", "school", "three days"],
        "summary": "Street light near the school has been non-functional for three days.",
        "prediction_reason": "The complaint contains strong indicators related to street-light infrastructure and prolonged service failure.",
        "status": "success",
        "model_version": "1.0.0",
        "processing_time_ms": 145,
    }]})

    complaint_id: Optional[str] = Field(default=None, description="Complaint identifier echoed from the request.")
    category: str = Field(..., description="Predicted complaint category.")
    category_confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for the category.")
    priority: str = Field(..., description="Predicted priority: Low, Medium, High or Critical.")
    priority_confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for the priority.")
    recommended_department: str = Field(..., description="Recommended department for the complaint.")
    recommendation_reason: str = Field(..., description="Brief reason behind the department recommendation.")
    is_duplicate: bool = Field(..., description="Whether similar existing complaints were found.")
    duplicate_similarity: float = Field(..., ge=0.0, le=1.0, description="Highest similarity to an existing complaint.")
    matched_complaint_ids: List[str] = Field(default_factory=list, description="Existing complaints above the threshold.")
    keywords: List[str] = Field(default_factory=list, description="Extracted keywords and entities.")
    summary: str = Field(..., description="Short extractive summary of the complaint.")
    prediction_reason: str = Field(..., description="Concise, user-facing explanation of the prediction.")
    status: str = Field(default="success", description="Always 'success' for completed analysis.")
    model_version: str = Field(default="", description="ML models version used for this analysis.")
    processing_time_ms: float = Field(..., description="End-to-end processing time in milliseconds.")


class BatchAnalyzeRequest(BaseModel):
    """Multiple complaints for batch analysis."""

    model_config = ConfigDict(json_schema_extra={"examples": [{
        "complaints": [
            {"complaint_id": "CMP001", "text": "Garbage has not been collected for one week."},
            {"complaint_id": "CMP002", "text": "Road has a large pothole near the school."},
        ],
    }]})

    complaints: List[AnalyzeRequest] = Field(..., min_length=1, description="Complaints to analyze (max 100).")


class BatchAnalyzeResponse(BaseModel):
    """Envelope for batch analysis results."""

    status: str = "success"
    results: List[AnalysisResult]
    processing_time_ms: float


class HealthResponse(BaseModel):
    """Service + model health payload."""

    status: str = "healthy"
    service: str
    model_loaded: bool
    category_model_loaded: bool
    priority_model_loaded: bool
    duplicate_index_loaded: bool
    version: str


class ModelInfoResponse(BaseModel):
    """Details about the deployed models."""

    classifier: str
    version: str
    categories: int
    embedding_model: str
    embedding_backend: str
    duplicate_threshold: float
    status: str


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    status: str = "error"
    message: str
    error: Optional[str] = None


# --- Frontend compatibility payloads ------------------------------------------

class TextRequest(BaseModel):
    """Legacy endpoints accept only `text`."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"text": "Water is not available in my area."}]})

    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH)

    @field_validator("text")
    @classmethod
    def _text_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Complaint text cannot be empty.")
        return stripped


class PredictionResponse(BaseModel):
    """Legacy category/priority prediction response."""

    prediction: str
    confidence: float


class SentimentResponse(BaseModel):
    """Legacy sentiment analysis response."""

    sentiment: str
    confidence: float


class SimilarComplaintResponse(BaseModel):
    """Legacy similar-complaint item (frontend camelCase contract)."""

    complaintId: str
    title: str
    similarity: float
    resolutionSummary: str


class RetrainResponse(BaseModel):
    """Legacy retrain response."""

    message: str


__all__ = [
    "AnalyzeRequest",
    "AnalysisResult",
    "BatchAnalyzeRequest",
    "BatchAnalyzeResponse",
    "HealthResponse",
    "ModelInfoResponse",
    "ErrorResponse",
    "TextRequest",
    "PredictionResponse",
    "SentimentResponse",
    "SimilarComplaintResponse",
    "RetrainResponse",
]