"""Duplicate service: wires the duplicate detector with runtime configuration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from app.config import Settings
from app.models.duplicate_detector import DuplicateDetector, DuplicateMatch
from app.utils.exceptions import EmptyComplaintError


@dataclass
class DuplicateResult:
    is_duplicate: bool
    max_similarity: float
    matched_ids: List[str]
    matches: List[DuplicateMatch]


class DuplicateService:
    """Compares a complaint against the existing-complaint index."""

    def __init__(self, detector: DuplicateDetector, settings: Settings) -> None:
        self.detector = detector
        self.settings = settings

    def _sync_threshold(self) -> None:
        # Reflect the live configuration (tests/settings may change it).
        self.detector.threshold = self.settings.DUPLICATE_THRESHOLD

    def detect(self, text: str, limit: Optional[int] = None) -> DuplicateResult:
        if not text or not text.strip():
            raise EmptyComplaintError()
        self._sync_threshold()
        is_duplicate, max_similarity, matched_ids, matches = self.detector.detect(text)
        if limit and len(matches) > limit:
            matches = matches[:limit]
        return DuplicateResult(
            is_duplicate=is_duplicate,
            max_similarity=max_similarity,
            matched_ids=matched_ids,
            matches=matches,
        )


__all__ = ["DuplicateService", "DuplicateResult"]