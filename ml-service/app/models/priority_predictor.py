"""Priority / severity prediction.

Hybrid design:
- A transparent **rule-based scorer** (category baseline, urgency, safety,
  scale, disruption, duration) always produces a priority and confidence.
- If a trained Logistic Regression priority model is present, its probabilities
  are blended with the rule scores for the final decision.

Calibrated against the spec's examples (burst pipeline -> Critical;
damaged bench -> Low; "street light not working for three days" -> High).
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib

from app.services.preprocessing_service import _TOKEN_RE, preprocessor
from app.utils.exceptions import MLProcessingError
from app.utils.logger import get_logger

logger = get_logger("ml-service.priority")

PRIORITY_LEVELS: List[str] = ["Low", "Medium", "High", "Critical"]
_PRI_LOW, _PRI_MED, _PRI_HIGH, _PRI_CRITICAL = PRIORITY_LEVELS

# Category baseline severity (0 = Low ... 3.5 = Critical).
_CATEGORY_BASE: Dict[str, float] = {
    "Water Supply": 2.2,
    "Electricity": 2.2,
    "Roads": 2.0,
    "Garbage/Waste": 1.8,
    "Drainage": 2.6,
    "Street Lights": 1.6,
    "Public Transport": 1.2,
    "Traffic": 2.0,
    "Public Safety": 3.4,
    "Sanitation": 1.6,
    "Government Services": 1.0,
    "Other": 0.6,
}

_URGENCY_TERMS = frozenset(
    "urgent urgently immediately immediate critical emergency asap right away soon today now quick quickly serious severe important priority".split()
)
_SAFETY_TERMS = frozenset(
    "danger dangerous unsafe hazard hazardous risk risky fire shock electrocution snake accident crash injury hurt wound flood burst flooding collapse collapsing collapsed falling broke sharp wire open manhole children child school".split()
)
_SCALE_TERMS = frozenset(
    "entire whole all many every hundred hundreds fifty twenty thirty forty sixty eighty ninety residents houses families buildings streets roads area colony people everyone everybody".split()
)
_DISRUPTION_TERMS = frozenset(
    "no not stopped stop working failed failure off out outage disconnected unavailable shut down leaking leak leaked burst flooding blocked jam plugged clogged damaged damage cut".split()
)
_DURATION_RE = re.compile(r"\b(\d+|[a-z]+)\s+(day|days|week|weeks|month|months|year|years|hour|hours)\b")

_CENTERS: Dict[str, float] = {
    _PRI_LOW: 1.2,
    _PRI_MED: 3.4,
    _PRI_HIGH: 5.8,
    _PRI_CRITICAL: 8.2,
}

# Combo signals that heavily indicate a critical service failure.
_CRITICAL_COMBOS = (("burst",), ("flood",), ("flooding",), ("overflow",))


def _rule_scores(text: str, category: Optional[str] = None) -> Dict[str, float]:
    cleaned = preprocessor.clean(text)
    tokens = set(_TOKEN_RE.findall(cleaned))

    total = _CATEGORY_BASE.get(category or "", 0.6) if category else 0.6

    safety_hits = tokens & _SAFETY_TERMS
    if safety_hits:
        total += min(len(safety_hits) * 1.5, 4.5)

    urgency_hits = tokens & _URGENCY_TERMS
    if urgency_hits:
        total += min(len(urgency_hits) * 0.8, 2.4)

    scale_hits = tokens & _SCALE_TERMS
    if scale_hits:
        total += min(len(scale_hits) * 1.2, 2.4)

    disruption_hits = tokens & _DISRUPTION_TERMS
    if disruption_hits:
        total += min(len(disruption_hits) * 0.8, 2.4)

    duration = 0.0
    m = _DURATION_RE.search(cleaned)
    if m:
        try:
            num = int(m.group(1))
        except ValueError:
            num = 3
        duration = 0.6 if num <= 2 else (1.0 if num <= 7 else 1.4)
    if "night" in cleaned:
        duration += 0.6
    total += duration

    # Prolonged outage: duration + disruption simultaneously.
    if m and disruption_hits:
        total += 1.2

    # Critical combo (burst/flood/overflow) within a water/drainage context.
    category_low = (category or "").lower()
    context = "water" in category_low or "drain" in category_low or "safety" in category_low
    if context and any(all(tok in tokens for tok in combo) for combo in _CRITICAL_COMBOS):
        total += 2.0

    # Confidence via proximity to level centers.
    scores: Dict[str, float] = {}
    for level, center in _CENTERS.items():
        scores[level] = max(0.05, 1.6 - abs(total - center))
    return scores


def _softmax(scores: Dict[str, float]) -> Dict[str, float]:
    import math

    vals = {k: math.exp(v) for k, v in scores.items()}
    denom = sum(vals.values()) or 1.0
    return {k: v / denom for k, v in vals.items()}


class PriorityPredictor:
    """Hybrid rule + optional ML priority predictor."""

    def __init__(self, model_path: Path, vectorizer_path: Path) -> None:
        self.model_path = model_path
        self.vectorizer_path = vectorizer_path
        self.model: Any = None
        self.vectorizer: Any = None
        self.loaded = False

    def load(self) -> None:
        try:
            self.model = joblib.load(self.model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
            self.loaded = True
            logger.info("Priority model loaded")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Priority model not loaded, using rule-based scoring only: {exc}")
            self.model = self.vectorizer = None
            self.loaded = False

    def predict(self, text: str, category: Optional[str] = None) -> Tuple[str, float]:
        """Return (priority, confidence)."""
        features = preprocessor.preprocess(text).features
        rule_probs = _softmax(_rule_scores(text, category))

        if self.loaded:
            try:
                vector = self.vectorizer.transform([features or " "])
                probs = self.model.predict_proba(vector)[0]
                # Map the model's class indices back onto the canonical order,
                # tolerating models trained on a subset of priorities.
                ml_probs = {level: 0.0 for level in PRIORITY_LEVELS}
                for class_idx, prob in zip(self.model.classes_, probs):
                    ml_probs[PRIORITY_LEVELS[int(class_idx)]] = float(prob)
                combined = {level: 0.5 * ml_probs[level] + 0.5 * rule_probs[level] for level in PRIORITY_LEVELS}
            except Exception as exc:  # noqa: BLE001
                raise MLProcessingError(f"Priority prediction failed: {exc}") from exc
        else:
            combined = rule_probs

        priority = max(combined, key=combined.get)
        confidence = round(min(0.97, 0.5 + 0.8 * combined[priority]), 3)
        return priority, confidence

    @staticmethod
    def explanation(text: str, category: Optional[str], priority: str) -> str:
        cleaned = preprocessor.clean(text)
        tokens = set(_TOKEN_RE.findall(cleaned))
        reasons: List[str] = []
        if tokens & _SAFETY_TERMS:
            reasons.append("contains safety-related vocabulary")
        if tokens & _URGENCY_TERMS:
            reasons.append("strong urgency markers")
        if tokens & _SCALE_TERMS:
            reasons.append("affects many people or a large area")
        if _DURATION_RE.search(cleaned):
            reasons.append("has been ongoing for a number of days")
        if not reasons:
            return f"Predicted {priority} based on the nature of the service issue and reported details."
        return f"Predicted {priority} because the complaint {', '.join(reasons)}."


__all__ = ["PriorityPredictor", "PRIORITY_LEVELS", "_rule_scores"]