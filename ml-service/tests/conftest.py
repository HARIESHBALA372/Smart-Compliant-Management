"""Shared pytest fixtures: a fully wired Engine with deterministic fallbacks.

The engine deliberately points at *missing* model artifacts so the test run
exercises the keyword fallback, rule-based priority scorer, hashing embedder
and CSV-bootstrapped duplicate index - no training step required.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

BASE = Path(__file__).resolve().parent.parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

from app.config import Settings
from app.services.analysis_service import build_engine


def _ensure_dataset() -> Path:
    csv_path = BASE / "data" / "raw" / "complaints.csv"
    if csv_path.exists():
        return csv_path
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    from training.dataset import generate_dataset

    generate_dataset().to_csv(csv_path, index=False)
    return csv_path


@pytest.fixture(scope="session")
def dataset_path() -> Path:
    return _ensure_dataset()


@pytest.fixture(scope="session")
def settings(dataset_path: Path) -> Settings:
    return Settings(
        EMBEDDING_BACKEND="tfidf",
        EMBEDDING_MODEL="test-embedder",
        DUPLICATE_THRESHOLD=0.85,
        MAX_SIMILAR_RESULTS=5,
        MODEL_PATH="models/__not_trained__.joblib",
        VECTORIZER_PATH="models/__not_trained__.joblib",
        LABEL_ENCODER_PATH="models/__not_trained__.joblib",
        PRIORITY_MODEL_PATH="models/__not_trained__.joblib",
        PRIORITY_VECTORIZER_PATH="models/__not_trained__.joblib",
        DUPLICATES_INDEX_PATH="models/__not_trained__.json",
        MAX_BATCH_SIZE=3,
        TRAINING_ENABLED=False,
        API_KEY="",
    )


@pytest.fixture(scope="session")
def engine(settings: Settings):
    eng = build_engine(settings)
    assert eng.status == "ready", f"engine failed to become ready: {eng.boot_errors}"
    return eng