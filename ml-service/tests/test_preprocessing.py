"""Unit tests for preprocessing: keyword extraction, summary and sentiment."""

from __future__ import annotations

import pytest

from app.services.preprocessing_service import (
    analyze_sentiment,
    extract_keywords,
    generate_summary,
    preprocessor,
)


def test_preprocessor_cleans_and_tokenizes() -> None:
    prepared = preprocessor.preprocess("  The STREET LIGHT near the school has not been working!  ")
    assert "street" in prepared.tokens
    assert "the" in prepared.tokens  # raw tokens keep stop words
    assert "the" not in prepared.features.split()  # stop words removed from features
    assert prepared.features
    assert prepared.cleaned == "the street light near the school has not been working"


def test_keywords_extraction() -> None:
    keywords = extract_keywords("the street light near anna nagar school stopped working three days ago")
    assert isinstance(keywords, list)
    assert len(keywords) >= 3
    assert any("street light" in k or k == "street light" for k in keywords)


def test_summary_is_shortened() -> None:
    long_text = "The water pipeline in velachery has burst. " * 20
    summary = generate_summary(long_text)
    assert len(summary) <= len(long_text)
    assert summary.strip()


def test_sentiment_negative() -> None:
    sentiment, confidence = analyze_sentiment("absolutely terrible, nothing works and it is horrible")
    assert sentiment == "negative"
    assert confidence >= 0.7


def test_sentiment_positive() -> None:
    sentiment, confidence = analyze_sentiment("excellent work, thank you for the wonderful repair")
    assert sentiment == "positive"
    assert confidence >= 0.6


def test_sentiment_returns_tuple() -> None:
    result = analyze_sentiment("the bus is late but the driver is polite")
    assert isinstance(result, tuple) and len(result) == 2


def test_empty_text_returns_empty_features() -> None:
    prepared = preprocessor.preprocess("")
    assert prepared.features == ""
    assert analyze_sentiment("") == ("neutral", 0.0)
    assert extract_keywords("") == []