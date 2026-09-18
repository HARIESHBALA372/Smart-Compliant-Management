"""Recommendation service: wraps the department recommendation engine."""

from __future__ import annotations

from dataclasses import dataclass

from app.models.recommendation_engine import DepartmentRecommender


@dataclass
class RecommendationResult:
    department: str
    reason: str


class RecommendationService:
    """Recommends the responsible department for a classified complaint."""

    def __init__(self, recommender: DepartmentRecommender) -> None:
        self.recommender = recommender

    def recommend(self, category: str) -> RecommendationResult:
        department, reason = self.recommender.recommend_for_text(category, "")
        return RecommendationResult(department=department, reason=reason)

    def recommend_for_text(self, category: str, text: str) -> RecommendationResult:
        department, reason = self.recommender.recommend_for_text(category, text)
        return RecommendationResult(department=department, reason=reason)


__all__ = ["RecommendationService", "RecommendationResult"]