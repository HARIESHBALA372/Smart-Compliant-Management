"""Unit tests for the hybrid priority predictor (rule-based scorer)."""

from __future__ import annotations

from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from app.models.priority_predictor import PRIORITY_LEVELS, PriorityPredictor


def test_spec_burst_pipeline_is_critical() -> None:
    predictor = PriorityPredictor(Path("nope"), Path("nope"))
    predictor.load()
    priority, confidence = predictor.predict(
        "The main water pipeline has burst and water is flooding the road.", category="Water Supply"
    )
    assert priority == "Critical"
    assert confidence > 0.5


def test_spec_damaged_bench_is_low() -> None:
    predictor = PriorityPredictor(Path("nope"), Path("nope"))
    predictor.load()
    priority, confidence = predictor.predict("The park bench is damaged.", category="Other")
    assert priority == "Low"
    assert confidence > 0.5


def test_spec_street_light_three_days_is_high() -> None:
    predictor = PriorityPredictor(Path("nope"), Path("nope"))
    predictor.load()
    priority, confidence = predictor.predict(
        "The street light near the school has not been working for three days.", category="Street Lights"
    )
    assert priority == "High"
    assert confidence > 0.5


def test_explanation() -> None:
    predictor = PriorityPredictor(Path("nope"), Path("nope"))
    text = "water pipeline burst and is flooding many houses"
    explanation = predictor.explanation(text, "Water Supply", "Critical")
    assert isinstance(explanation, str) and explanation.startswith("Predicted Critical")


def test_rule_scores_are_ordered() -> None:
    from app.models.priority_predictor import _rule_scores

    scores = _rule_scores("The main water pipeline has burst and water is flooding the road.", "Water Supply")
    assert scores["Critical"] >= scores["High"] >= scores["Medium"] >= scores["Low"]


def test_ml_blend_can_be_loaded(tmp_path: Path) -> None:
    texts = ["water pipeline burst is flooding", "street light is off", "bench has a small crack"]
    labels = ["Critical", "High", "Low"]
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(texts)
    model = LogisticRegression(max_iter=500)
    model.fit(X, [PRIORITY_LEVELS.index(l) for l in labels])

    model_path = tmp_path / "priority.joblib"
    vec_path = tmp_path / "vectorizer.joblib"
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vec_path)

    predictor = PriorityPredictor(model_path, vec_path)
    predictor.load()
    assert predictor.loaded is True
    priority, confidence = predictor.predict("the water pipeline burst today", category="Water Supply")
    assert priority in PRIORITY_LEVELS
    assert 0.0 < confidence <= 1.0