from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Smart Complaint Management API"
    PORT: int = 4000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    
    # SQLite Database configuration
    DATABASE_URL: str = "sqlite:///./complaints.db"
    
    # JWT & Auth
    JWT_SECRET: str = "dev_secret_replace_me_9f8d7c6b5a43210987654321"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_DAYS: int = 7
    JWT_ISSUER: str = "smart-complaint-backend"
    JWT_AUDIENCE: str = "smart-complaint-client"
    
    # CORS
    CLIENT_URL: str = "http://localhost:3000,http://localhost:5173"
    
    # Uploads
    UPLOAD_DIR: str = "./uploads"
    
    # ML microservice
    ML_SERVICE_URL: str = "http://localhost:8000"
    ML_SERVICE_TIMEOUT_SECONDS: float = 5.0

    @property
    def cors_origins(self) -> List[str]:
        origins = [url.strip() for url in self.CLIENT_URL.split(",") if url.strip()]
        if "*" not in origins:
            origins.extend(["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"])
        return list(set(origins))

settings = Settings()
