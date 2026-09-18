# Smart Complaint ML Service

A production-ready FastAPI microservice that analyzes complaint text for the
Smart Complaint Management platform: category classification, severity-priority
prediction, duplicate detection, department recommendation, keyword extraction
and summarization.

## Features

- **Category classification** across 12 complaint categories using TF-IDF +
  Logistic Regression, with a deterministic keyword fallback so the service is
  functional before training artifacts exist.
- **Priority prediction** using a hybrid of a transparent rule-based scorer
  (calibrated against real-world examples) blended 50/50 with a trained
  sklearn model when available.
- **Duplicate detection** against an index of known complaints. Embeddings are
  produced by an offline hashing embedder (default) or
  `sentence-transformers` when installed (`EMBEDDING_BACKEND=auto`).
- **Department recommendation** via `config/department_mapping.json` aligned to
  the backend's department names (Water Supply, Electricity, Roads, Sanitation,
  Transportation, Public Safety, General).
- **Keyword extraction, summarization and sentiment** from lexicons + NLP.
- Centralized error handling, structured JSON logging with secret redaction,
  and an optional `X-API-Key` guard.

## Quick start

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# 1. Generate the sample dataset
python training/dataset.py --output data/raw/complaints.csv

# 2. Train models + duplicate index
python training/train_classifier.py
python training/train_priority.py
python training/build_duplicate_index.py
python training/evaluate.py

# 3. Run the service
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive API documentation.

## API

| Method | Path                     | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | `/health`                | Liveness + model readiness probe             |
| POST   | `/api/v1/analyze`        | Full analysis for one complaint              |
| POST   | `/api/v1/analyze/batch`  | Full analysis for up to `MAX_BATCH_SIZE`     |
| GET    | `/api/v1/model-info`     | Deployed model names, version, categories    |

Legacy frontend-compatible endpoints: `POST /predict-category`,
`POST /predict-priority`, `POST /analyze-sentiment`, `POST /suggest-similar`,
`POST /retrain-model`.

### Example

```json
POST /api/v1/analyze
{
  "text": "The street light near the school has not been working for three days.",
  "complaint_id": "SCM-2026-000010"
}
```

```json
{
  "status": "success",
  "category": "Street Lights",
  "category_confidence": 0.91,
  "priority": "High",
  "priority_confidence": 0.89,
  "recommended_department": "Electricity",
  "recommendation_reason": "Matches the Electricity department.",
  "is_duplicate": false,
  "duplicate_similarity": 0.0,
  "matched_complaint_ids": [],
  "keywords": ["street light", "school", "working", "three days"],
  "summary": "The street light near the school has not been working for three days.",
  "prediction_reason": "Predicted High because the complaint ...",
  "model_version": "1.0.0",
  "processing_time_ms": 12.3
}
```

Errors use `{"status": "error", "message": "...", "error": "..."}` with
meaningful HTTP status codes (400 empty text, 422 invalid payload, 503 model
unavailable).

## Configuration

Copy `.env.example` to `.env`. Key variables:

| Variable                  | Default                          | Description                                  |
| ------------------------- | -------------------------------- | -------------------------------------------- |
| `MODEL_PATH`              | `models/complaint_classifier.joblib` | Trained classifier artifact               |
| `DUPLICATE_THRESHOLD`     | `0.85`                           | Similarity cutoff to flag duplicates         |
| `EMBEDDING_BACKEND`       | `auto`                           | `auto`/`sentence-transformers`/`tfidf`       |
| `EMBEDDING_MODEL`         | `all-MiniLM-L6-v2`               | Sentence-transformer model name              |
| `DUPLICATES_INDEX_PATH`   | `models/duplicates_index.json`   | Serialized duplicate index                   |
| `DEPARTMENT_MAPPING_PATH` | `config/department_mapping.json` | Category -> department mapping                |
| `CORS_ORIGINS`            | `*`                              | Comma-separated allowed origins              |
| `API_KEY`                 | *(empty)*                        | When set, requires `X-API-Key` header        |
| `TRAINING_ENABLED`        | `false`                          | Allow legacy `/retrain-model` at runtime     |
| `MAX_BATCH_SIZE`          | `100`                            | Batch analysis cap                           |

## Training pipeline

Scripts live in `training/` and write reports to `reports/`:

- `dataset.py` - deterministic synthetic dataset generator (12 categories).
- `train_classifier.py` - category model + `reports/model_evaluation.json`.
- `train_priority.py` - priority model + `reports/priority_evaluation.json`.
- `build_duplicate_index.py` - serialized embedding index.
- `evaluate.py` - re-evaluate both models on a fresh 80/20 split.

Reports include accuracy, precision/recall/F1 (macro and weighted) and the
confusion matrix. The split ratio is configurable with `--test-size`.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
pytest --cov=app --cov-fail-under=80 --cov-report=term-missing
```

## Docker

```bash
docker build -t smart-complaint-ml-service .
docker run --rm -p 8000:8000 smart-complaint-ml-service
```

The image pre-builds the offline duplicate index and exposes a `/health`
healthcheck. Optional sentence-transformers embeddings are not included to keep
the image small; install `requirements-optional.txt` to enable them.

## Project layout

```
ml-service/
├── app/
│   ├── api/routes.py          # API + legacy compat endpoints
│   ├── config.py              # pydantic-settings, fail-fast env validation
│   ├── main.py                # FastAPI factory, middleware, error handling
│   ├── models/                # classifier, priority, duplicate detector, recommender
│   ├── schemas/               # request/response models
│   ├── services/              # orchestration + preprocessing
│   └── utils/                 # JSON logging, centralized exceptions
├── config/department_mapping.json
├── data/raw/complaints.csv    # sample dataset
├── models/                    # trained artifacts + duplicate index (generated)
├── training/                  # dataset + training/evaluation scripts
└── reports/                   # evaluation metrics (generated)
```

## Backend integration

Set `ML_SERVICE_URL=http://localhost:8000` in the backend environment and point
the frontend's `VITE_ML_API_URL` to the same origin. The legacy endpoints above
match the existing React contract (see `src/services/mlApi.ts`).