"""Complaint category classifier.

Wraps scikit-learn artifacts (vectorizer + LogisticRegression + label encoder).
A transparent keyword-based *fallback* keeps the service functional even before
training artifacts exist; the ML path is used whenever models are loaded.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib

from app.services.preprocessing_service import preprocessor
from app.utils.exceptions import MLProcessingError
from app.utils.logger import get_logger

logger = get_logger("ml-service.classifier")

# Keyword fallback: complaint phrase -> category (the spec's 12 categories).
_FALLBACK_KEYWORDS: List[Tuple[str, str]] = [
    ("street light", "Street Lights"),
    ("streetlight", "Street Lights"),
    ("lamp post", "Street Lights"),
    ("lamp", "Street Lights"),
    ("light", "Street Lights"),
    ("dark", "Street Lights"),
    ("water", "Water Supply"),
    ("pipeline", "Water Supply"),
    ("borewell", "Water Supply"),
    ("sewage", "Drainage"),
    ("drain", "Drainage"),
    ("drainage", "Drainage"),
    ("flood", "Drainage"),
    ("overflow", "Drainage"),
    ("garbage", "Garbage/Waste"),
    ("waste", "Garbage/Waste"),
    ("trash", "Garbage/Waste"),
    ("rubbish", "Garbage/Waste"),
    ("litter", "Garbage/Waste"),
    ("dump", "Garbage/Waste"),
    ("sanitation", "Sanitation"),
    ("mosquito", "Sanitation"),
    ("pest", "Sanitation"),
    ("power", "Electricity"),
    ("electricity", "Electricity"),
    ("voltage", "Electricity"),
    ("transformer", "Electricity"),
    ("outage", "Electricity"),
    ("wire", "Electricity"),
    ("road", "Roads"),
    ("pothole", "Roads"),
    ("asphalt", "Roads"),
    ("footpath", "Roads"),
    ("speed bump", "Roads"),
    ("speed breaker", "Roads"),
    ("manhole", "Roads"),
    ("bus", "Public Transport"),
    ("metro", "Public Transport"),
    ("train", "Public Transport"),
    ("commute", "Public Transport"),
    ("traffic", "Traffic"),
    ("signal", "Traffic"),
    ("parking", "Traffic"),
    ("accident", "Traffic"),
    ("rash driving", "Traffic"),
    ("safety", "Public Safety"),
    ("hazard", "Public Safety"),
    ("danger", "Public Safety"),
    ("collapse", "Public Safety"),
    ("abandoned", "Public Safety"),
    ("shock", "Public Safety"),
    ("snake", "Public Safety"),
    ("stray", "Public Safety"),
    ("fire", "Public Safety"),
    ("license", "Government Services"),
    ("permit", "Government Services"),
    ("certificate", "Government Services"),
    ("pension", "Government Services"),
    ("ration", "Government Services"),
    ("tax", "Government Services"),
]

DEFAULT_CATEGORIES: List[str] = [
    "Water Supply",
    "Electricity",
    "Roads",
    "Garbage/Waste",
    "Drainage",
    "Street Lights",
    "Public Transport",
    "Traffic",
    "Public Safety",
    "Sanitation",
    "Government Services",
    "Other",
]


class ComplaintClassifier:
    """TF-IDF + Logistic Regression complaint classifier wrapper."""

    def __init__(
        self,
        model_path: Path,
        vectorizer_path: Path,
        encoder_path: Path,
        categories: Optional[List[str]] = None,
    ) -> None:
        self.model_path = model_path
        self.vectorizer_path = vectorizer_path
        self.encoder_path = encoder_path
        self.model: Any = None
        self.vectorizer: Any = None
        self.encoder: Any = None
        self.categories: List[str] = list(categories) if categories else list(DEFAULT_CATEGORIES)
        self.loaded = False

    @property
    def name(self) -> str:
        return "TF-IDF + Logistic Regression" if self.loaded else "keyword-fallback"

    def load(self) -> None:
        """Load trained artifacts. Falls back to keyword classification on failure."""
        try:
            self.model = joblib.load(self.model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
            self.encoder = joblib.load(self.encoder_path)
            self.categories = list(self.encoder.classes_)
            self.loaded = True
            logger.info(f"Complaint classifier loaded with {len(self.categories)} categories")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Classifier model not loaded, using keyword fallback: {exc}")
            self.model = self.vectorizer = self.encoder = None
            self.loaded = False

    def predict(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        """Return (category, confidence, probabilities_by_category)."""
        cleaned = preprocessor.clean(text)
        features = preprocessor.preprocess(text).features

        if self.loaded:
            try:
                vector = self.vectorizer.transform([features])
                probs = self.model.predict_proba(vector)[0]
                prob_map: Dict[str, float] = {
                    self.categories[i]: round(float(p), 4) for i, p in enumerate(probs)
                }
                best = int(probs.argmax())
                return self.categories[best], round(float(probs[best]), 4), prob_map
            except Exception as exc:  # noqa: BLE001
                raise MLProcessingError(f"Classification failed: {exc}") from exc

        # Deterministic keyword fallback.
        category = self._fallback_category(cleaned)
        confidence = self._fallback_confidence(cleaned, category)
        return category, confidence, {category: confidence}

    def _fallback_category(self, cleaned: str) -> str:
        for keyword, category in _FALLBACK_KEYWORDS:
            if keyword in cleaned:
                return category
        return "Other"

    def _fallback_confidence(self, cleaned: str, category: str) -> float:
        matched = [k for k, c in _FALLBACK_KEYWORDS if c == category and k in cleaned]
        return round(min(0.5 + 0.1 * len(matched), 0.95), 3)


__all__ = ["ComplaintClassifier", "DEFAULT_CATEGORIES"]