"""Classification service: wraps the complaint category classifier."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from app.models.complaint_classifier import ComplaintClassifier
from app.utils.exceptions import EmptyComplaintError


@dataclass
class ClassificationResult:
    category: str
    confidence: float
    probabilities: Dict[str, float]
    model_name: str


class ClassificationService:
    """Delegates to the classifier model (ML or keyword fallback)."""

    def __init__(self, classifier: ComplaintClassifier) -> None:
        self.classifier = classifier

    def classify(self, text: str) -> ClassificationResult:
        if not text or not text.strip():
            raise EmptyComplaintError()
        category, confidence, probabilities = self.classifier.predict(text)
        return ClassificationResult(
            category=category,
            confidence=confidence,
            probabilities=probabilities,
            model_name=self.classifier.name,
        )


__all__ = ["ClassificationService", "ClassificationResult"]