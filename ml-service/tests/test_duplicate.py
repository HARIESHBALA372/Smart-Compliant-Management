"""Unit tests for duplicate detection (index building, scoring, persistence)."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from app.models.duplicate_detector import (
    DuplicateDetector,
    HashingEmbedder,
    SentenceTransformerEmbedder,
    build_embedder,
    sentence_transformers_available,
)
from app.utils.exceptions import DuplicateDetectionError

DOCS = [
    {
        "complaint_id": "C1",
        "title": "Street light broken near park",
        "text": "the street light near anna nagar park is not working since three days",
        "resolution_summary": "Street light repaired.",
    },
    {
        "complaint_id": "C2",
        "title": "Street light broken near school",
        "text": "street light near the school has been off for one week",
        "resolution_summary": "Bulb replaced by crew.",
    },
    {
        "complaint_id": "C3",
        "title": "Water pipeline burst",
        "text": "water pipeline near the junction has burst and is flooding the road",
        "resolution_summary": "Pipeline fixed.",
    },
]


def test_exact_copy_is_flagged_as_duplicate() -> None:
    detector = DuplicateDetector(threshold=0.85, embedder=HashingEmbedder())
    detector.build_index(DOCS)
    assert detector.loaded is True
    is_dup, similarity, matched, _ = detector.detect(DOCS[0]["text"])
    assert is_dup is True
    assert similarity > 0.95
    assert "C1" in matched


def test_unrelated_text_is_not_duplicate() -> None:
    detector = DuplicateDetector(threshold=0.85, embedder=HashingEmbedder())
    detector.build_index(DOCS)
    is_dup, similarity, matched, _ = detector.detect("my electric bill seems incorrect for this month")
    assert is_dup is False
    assert matched == []


def test_save_load_roundtrip(tmp_path: Path) -> None:
    detector = DuplicateDetector(threshold=0.85, embedder=HashingEmbedder())
    detector.build_index(DOCS)
    path = tmp_path / "index.json"
    detector.save(path)
    assert path.exists()

    loaded = DuplicateDetector(threshold=0.85, embedder=HashingEmbedder())
    assert loaded.load(path) is True
    assert len(loaded.documents) == len(DOCS)
    is_dup, _, matched, _ = loaded.detect(DOCS[0]["text"])
    assert is_dup is True


def test_missing_index_file_loads_gracefully(tmp_path: Path) -> None:
    detector = DuplicateDetector(threshold=0.85, embedder=HashingEmbedder())
    assert detector.load(tmp_path / "missing.json") is False
    assert detector.loaded is False
    assert detector.find_similar("anything") == []


def test_empty_index_needs_embedder() -> None:
    detector = DuplicateDetector(threshold=0.85, embedder=None)
    with pytest.raises(DuplicateDetectionError):
        detector.build_index(DOCS)


def test_build_embedder_selection() -> None:
    assert build_embedder("tfidf", "whatever").name == "hashing"
    expected = SentenceTransformerEmbedder if sentence_transformers_available() else HashingEmbedder
    assert isinstance(build_embedder("auto", "all-MiniLM-L6-v2"), expected)
    assert isinstance(build_embedder("sentence-transformers", "all-MiniLM-L6-v2"), (HashingEmbedder, SentenceTransformerEmbedder))
    assert isinstance(HashingEmbedder().encode(["hello world"]), np.ndarray)


def test_threshold_respected() -> None:
    detector = DuplicateDetector(threshold=0.9999, embedder=HashingEmbedder())
    detector.build_index(DOCS)
    is_dup, similarity, matched, _ = detector.detect(DOCS[0]["text"])
    assert is_dup is False or similarity >= 0.9999
    assert detector.effective_threshold == 0.9999