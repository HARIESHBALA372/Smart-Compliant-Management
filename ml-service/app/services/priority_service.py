"""Priority service: wraps the hybrid priority predictor."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.models.priority_predictor import PriorityPredictor
from app.utils.exceptions import EmptyComplaintError


@dataclass
class PriorityResult:
    priority: str
    confidence: float
    explanation: str
    model_name: str


class PriorityService:
    """Predict complaint priority via the hybrid rule + ML predictor."""

    def __init__(self, predictor: PriorityPredictor) -> None:
        self.predictor = predictor

    def predict(self, text: str, category: Optional[str] = None) -> PriorityResult:
        if not text or not text.strip():
            raise EmptyComplaintError()
        priority, confidence = self.predictor.predict(text, category=category)
        explanation = self.predictor.explanation(text, category, priority)
        return PriorityResult(
            priority=priority,
            confidence=confidence,
            explanation=explanation,
            model_name="hybrid-rule/ml" if self.predictor.loaded else "rule-based",
        )


__all__ = ["PriorityService", "PriorityResult"]