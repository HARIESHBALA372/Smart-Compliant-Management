"""Unit tests for the complaint category classifier (fallback + trained paths)."""

from __future__ import annotations

from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

from app.models.complaint_classifier import ComplaintClassifier, DEFAULT_CATEGORIES


def test_spec_categories_are_supported() -> None:
    required = {
        "Water Supply", "Electricity", "Roads", "Garbage/Waste", "Drainage",
        "Street Lights", "Public Transport", "Traffic", "Public Safety",
        "Sanitation", "Government Services", "Other",
    }
    assert len(DEFAULT_CATEGORIES) == 12
    assert required == set(DEFAULT_CATEGORIES)


def test_fallback_is_available_without_artifacts(tmp_path: Path) -> None:
    clf = ComplaintClassifier(tmp_path / "m.joblib", tmp_path / "v.joblib", tmp_path / "e.joblib")
    clf.load()
    assert clf.loaded is False
    assert clf.name == "keyword-fallback"

    category, confidence, probs = clf.predict("the street light near the school has not been working")
    assert category == "Street Lights"
    assert confidence > 0.5
    assert probs == {category: confidence}


def test_fallback_defaults_to_other() -> None:
    clf = ComplaintClassifier(Path("nope"), Path("nope"), Path("nope"))
    clf.load()
    category, _, _ = clf.predict("suggestion about a community notice board")
    assert category == "Other"


def _minimal_artifacts(tmp_path: Path):
    texts = ["water supply is not available today", "power cut in the colony", "garbage is piling up"]
    labels = ["Water Supply", "Electricity", "Garbage/Waste"]
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(texts)
    encoder = LabelEncoder()
    y = encoder.fit_transform(labels)
    model = LogisticRegression(max_iter=500)
    model.fit(X, y)

    model_path = tmp_path / "classifier.joblib"
    vec_path = tmp_path / "vectorizer.joblib"
    enc_path = tmp_path / "encoder.joblib"
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vec_path)
    joblib.dump(encoder, enc_path)
    return model_path, vec_path, enc_path


def test_ml_path_is_used_when_loaded(tmp_path: Path) -> None:
    model, vec, enc = _minimal_artifacts(tmp_path)
    clf = ComplaintClassifier(model, vec, enc)
    clf.load()
    assert clf.loaded is True
    assert clf.name == "TF-IDF + Logistic Regression"
    assert set(clf.categories) == {"Water Supply", "Electricity", "Garbage/Waste"}

    category, confidence, probs = clf.predict("water supply problem in anna nagar")
    assert category == "Water Supply"
    assert confidence > 0.0
    assert set(probs.keys()) == set(clf.categories)
    assert abs(sum(probs.values()) - 1.0) < 0.01


def test_missing_artifacts_do_not_crash_predict(engine, tmp_path: Path) -> None:
    engine.classifier.predict("power outage reported")
    # Integration: classifier service still returns valid results.
    result = engine.classifier_service.classify("the main water pipeline burst")
    assert result.category == "Water Supply"
    assert 0.0 < result.confidence <= 1.0