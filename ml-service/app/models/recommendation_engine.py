"""Department recommendation engine.

The category -> department mapping is loaded from a JSON config file
(``config/department_mapping.json`` by default) so it can be changed without
touching code. The final recommendation reason is tailored with any detected
domain phrases from the complaint text.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

from app.services.preprocessing_service import preprocessor
from app.utils.exceptions import MLServiceError
from app.utils.logger import get_logger

logger = get_logger("ml-service.recommendation")


class RecommendationConfigError(MLServiceError):
    status_code = 503
    message = "Department mapping configuration is missing or invalid."
    code = "recommendation_config_error"


class DepartmentRecommender:
    """Map a complaint category to a department with an explainable reason."""

    def __init__(self, mapping_path: Path) -> None:
        self.mapping_path = mapping_path
        self.mapping: Dict[str, Dict[str, str]] = {}
        self.loaded = False

    def load(self) -> None:
        try:
            with open(self.mapping_path, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
            self.mapping = {
                str(category): {"department": str(item.get("department", "General")),
                                "reason": str(item.get("reason", "Routed to the responsible department."))}
                for category, item in raw.items()
                if isinstance(item, dict) and not str(category).startswith("_")
            }
            self.loaded = True
            logger.info(f"Department mapping loaded ({len(self.mapping)} categories)")
        except Exception as exc:  # noqa: BLE001
            raise RecommendationConfigError(f"Failed to load department mapping: {exc}") from exc

    def recommend(self, category: str) -> Tuple[str, str]:
        if not self.loaded:
            raise RecommendationConfigError("Department mapping is not loaded.")
        entry = self.mapping.get(category, self.mapping.get("Other", {}))
        return entry.get("department", "General"), entry.get("reason", "Routed to the responsible department.")

    def recommend_for_text(self, category: str, text: str) -> Tuple[str, str]:
        department, base_reason = self.recommend(category)
        cleaned = preprocessor.clean(text)
        detail = ""
        for phrase in self.mapping.get(category, {}).get("_mentions", []) or []:
            if phrase in cleaned:
                detail = f" Mentions of '{phrase}' found."
                break
        return department, base_reason + detail


__all__ = ["DepartmentRecommender", "RecommendationConfigError"]