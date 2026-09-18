"""API-level tests for the ML service (production + legacy endpoints)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture(scope="module")
def client(engine, settings: Settings) -> TestClient:
    application = create_app(engine=engine, settings=settings)
    return TestClient(application)


def test_openapi_docs_available(client: TestClient) -> None:
    assert client.get("/openapi.json").status_code == 200


def test_root_info(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["health"] == "/health"
    assert body["analyze"] == "/api/v1/analyze"


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["category_model_loaded"] is False
    assert body["duplicate_index_loaded"] is True


def test_model_info(client: TestClient) -> None:
    response = client.get("/api/v1/model-info")
    assert response.status_code == 200
    body = response.json()
    assert body["classifier"] == "keyword-fallback"
    assert body["categories"] == 12
    assert body["embedding_backend"] == "hashing"
    assert body["status"] == "ready"


def test_analyze_success(client: TestClient) -> None:
    payload = {"complaint_id": "TST-1", "text": "The street light near the school has not been working for three days."}
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["complaint_id"] == "TST-1"
    assert body["category"] == "Street Lights"
    assert body["priority"] in {"Low", "Medium", "High", "Critical"}
    assert 0.0 <= body["priority_confidence"] <= 1.0
    assert body["recommended_department"] == "Electricity"
    assert isinstance(body["keywords"], list) and len(body["keywords"]) >= 3
    assert body["summary"]
    assert body["prediction_reason"]
    assert body["processing_time_ms"] >= 0.0


def test_analyze_empty_text_is_rejected(client: TestClient) -> None:
    response = client.post("/api/v1/analyze", json={"text": "   "})
    assert response.status_code == 422
    assert response.json()["status"] == "error"


def test_analyze_missing_text_is_rejected(client: TestClient) -> None:
    response = client.post("/api/v1/analyze", json={"complaint_id": "X"})
    assert response.status_code == 422
    assert response.json()["status"] == "error"


def test_analyze_extra_fields_rejected(client: TestClient) -> None:
    response = client.post("/api/v1/analyze", json={"text": "ok", "unexpected": 1})
    assert response.status_code == 422


def test_analyze_invalid_json(client: TestClient) -> None:
    response = client.post("/api/v1/analyze", content="{not-json", headers={"Content-Type": "application/json"})
    assert response.status_code == 422


def test_batch_analyze(client: TestClient) -> None:
    response = client.post(
        "/api/v1/analyze/batch",
        json={
            "complaints": [
                {"complaint_id": "B1", "text": "garbage is piled up in the street since one week"},
                {"complaint_id": "B2", "text": "traffic signal is not working today"},
                {"complaint_id": "B3", "text": "pension payment is delayed"},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert len(body["results"]) == 3
    assert {r["complaint_id"] for r in body["results"]} == {"B1", "B2", "B3"}
    assert body["processing_time_ms"] >= 0.0


def test_batch_exceeds_limit(client: TestClient) -> None:
    complaints = [{"text": f"complaint number {i}"} for i in range(5)]
    response = client.post("/api/v1/analyze/batch", json={"complaints": complaints})
    assert response.status_code == 422
    body = response.json()
    assert body["status"] == "error"
    assert "limit" in body["message"].lower()


# --- Legacy frontend endpoints -------------------------------------------------

def test_predict_category_compat(client: TestClient) -> None:
    response = client.post("/predict-category", json={"text": "water pipeline has burst near the junction"})
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == "Water Supply"
    assert 0.0 < body["confidence"] <= 1.0


def test_predict_priority_compat(client: TestClient) -> None:
    response = client.post("/predict-priority", json={"text": "water pipeline has burst and is flooding the road"})
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] in {"Low", "Medium", "High", "Critical"}


def test_analyze_sentiment_compat(client: TestClient) -> None:
    response = client.post("/analyze-sentiment", json={"text": "water is not available since many days"})
    assert response.status_code == 200
    body = response.json()
    assert body["sentiment"] in {"positive", "negative", "neutral"}
    assert 0.0 <= body["confidence"] <= 1.0


def test_suggest_similar_compat(client: TestClient, dataset_path) -> None:
    import pandas as pd

    sample = pd.read_csv(dataset_path).iloc[0]
    response = client.post("/suggest-similar", json={"text": sample["text"]})
    assert response.status_code == 200
    matches = response.json()
    assert isinstance(matches, list) and len(matches) >= 1
    first = matches[0]
    assert set(first.keys()) == {"complaintId", "title", "similarity", "resolutionSummary"}
    assert 0.0 <= first["similarity"] <= 1.0


def test_retrain_model_disabled(client: TestClient) -> None:
    response = client.post("/retrain-model")
    assert response.status_code == 200
    assert "disabled" in response.json()["message"].lower()


def test_api_key_guard():  # noqa: ANN201
    settings = Settings(API_KEY="test-api-key-1234567890", API_KEY_HEADER="X-API-Key")
    from app.services.analysis_service import build_engine

    application = create_app(engine=build_engine(settings), settings=settings)
    guarded = TestClient(application)
    assert guarded.get("/health").status_code == 200  # public
    assert guarded.post("/api/v1/analyze", json={"text": "hello"}).status_code == 401
    with_guard = guarded.post(
        "/api/v1/analyze", json={"text": "street light broken"}, headers={"X-API-Key": "test-api-key-1234567890"}
    )
    assert with_guard.status_code == 200