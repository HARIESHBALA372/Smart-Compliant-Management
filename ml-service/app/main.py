"""Application entrypoint.

Builds the FastAPI app, loads ML artifacts once at startup (lifespan), wires
CORS, structured request logging, an optional API key guard and centralized
exception handling.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import Settings, get_settings
from app.services.analysis_service import Engine, build_engine
from app.utils.exceptions import register_exception_handlers
from app.utils.logger import get_logger, setup_logging

logger = get_logger("ml-service.main")


def _unauthorized() -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"status": "error", "message": "Missing or invalid API key.", "error": "unauthorized"},
    )


def create_app(engine: Optional[Engine] = None, settings: Optional[Settings] = None) -> FastAPI:
    """Instantiate the FastAPI application (used by uvicorn and pytest)."""
    app_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        setup_logging(app_settings.LOG_LEVEL)
        if not getattr(app.state, "engine", None):
            app.state.engine = build_engine()
        logger.info("Application startup complete")
        yield
        logger.info("Application shutdown complete")

    app = FastAPI(
        title=app_settings.APP_NAME,
        version=app_settings.MODEL_VERSION,
        description="Intelligent complaint analysis: category classification, priority prediction, "
        "department recommendation, duplicate detection, keyword/summary extraction.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.state.engine = engine

    cors_origins = app_settings.cors_origin_list()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=not (cors_origins == ["*"]),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Structured request logging.
    @app.middleware("http")
    async def request_logging(request: Request, call_next: Any):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code}",
            extra={"data": {"method": request.method, "path": request.url.path, "status": response.status_code, "duration_ms": elapsed_ms}},
        )
        return response

    # Optional API-key guard for all endpoints except docs/health.
    if app_settings.API_KEY:
        @app.middleware("http")
        async def api_key_guard(request: Request, call_next: Any):
            public = {"/health", "/docs", "/redoc", "/openapi.json", "/"}
            if request.url.path in public:
                return await call_next(request)
            provided = request.headers.get(app_settings.API_KEY_HEADER)
            if not provided or provided != app_settings.API_KEY:
                return _unauthorized()
            return await call_next(request)

    register_exception_handlers(app)
    app.include_router(router)

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "service": app_settings.APP_SERVICE_NAME,
            "docs": "/docs",
            "health": "/health",
            "analyze": "/api/v1/analyze",
        }

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    _settings = get_settings()
    uvicorn.run("app.main:app", host=_settings.HOST, port=_settings.PORT, reload=False)