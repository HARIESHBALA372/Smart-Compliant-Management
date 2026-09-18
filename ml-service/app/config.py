"""Smart Complaint ML Service - application configuration.

Environment-based configuration (mirrors the backend's fail-fast env pattern).
All values can be overridden via a `.env` file or real environment variables.
Secret-looking values are never placed in source files.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Root of the ml-service directory (parent of app/).
BASE_DIR = Path(__file__).resolve().parent.parent


def resolve_path(path: str | Path) -> Path:
    """Resolve a configured path relative to the ML service root."""
    p = Path(path)
    if p.is_absolute():
        return p
    return BASE_DIR / p


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App --------------------------------------------------------------
    APP_NAME: str = "Smart Complaint ML Service"
    APP_SERVICE_NAME: str = "complaint-ml-service"
    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # --- Model inventory ----------------------------------------------------
    MODEL_PATH: str = "models/complaint_classifier.joblib"
    VECTORIZER_PATH: str = "models/vectorizer.joblib"
    LABEL_ENCODER_PATH: str = "models/category_encoder.joblib"
    PRIORITY_MODEL_PATH: str = "models/priority_model.joblib"
    PRIORITY_VECTORIZER_PATH: str = "models/priority_vectorizer.joblib"
    DUPLICATES_INDEX_PATH: str = "models/duplicates_index.json"
    CLASSIFIER_NAME: str = "TF-IDF + Logistic Regression"
    MODEL_VERSION: str = "1.0.0"

    # --- Duplicate detection --------------------------------------------------
    EMBEDDING_BACKEND: str = "auto"  # auto | sentence-transformers | tfidf
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    DUPLICATE_THRESHOLD: float = 0.85
    MAX_SIMILAR_RESULTS: int = 5

    # --- Data / mapping -------------------------------------------------------
    DEPARTMENT_MAPPING_PATH: str = "config/department_mapping.json"
    MAX_TEXT_LENGTH: int = 2000
    MAX_BATCH_SIZE: int = 100

    # --- Web / security -------------------------------------------------------
    CORS_ORIGINS: str = "*"
    API_KEY_HEADER: str = "X-API-Key"
    # Empty string disables authentication. Set a real key in production.
    API_KEY: str = ""

    # --- Operations -----------------------------------------------------------
    TRAINING_ENABLED: bool = False

    @field_validator("DUPLICATE_THRESHOLD")
    @classmethod
    def _validate_threshold(cls, value: float) -> float:
        if not 0.5 <= value <= 1.0:
            raise ValueError("DUPLICATE_THRESHOLD must be between 0.5 and 1.0")
        return value

    @field_validator("EMBEDDING_BACKEND")
    @classmethod
    def _validate_embedding_backend(cls, value: str) -> str:
        value = value.lower()
        allowed = {"auto", "sentence-transformers", "tfidf"}
        if value not in allowed:
            raise ValueError(f"EMBEDDING_BACKEND must be one of {sorted(allowed)}")
        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def _validate_cors(cls, value: str) -> str:
        if value.strip() == "*":
            return "*"
        origins = [o.strip() for o in value.split(",") if o.strip()]
        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin or '*'")
        return ",".join(origins)

    @model_validator(mode="after")
    def _validate_api_key(self) -> "Settings":
        if self.API_KEY and len(self.API_KEY) < 16:
            raise ValueError("API_KEY must be at least 16 characters when set")
        return self

    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Build the settings instance (cached; call `.cache_clear()` in tests)."""
    return Settings()


settings = get_settings()