"""Centralized exception hierarchy and FastAPI error handlers.

All service errors derive from :class:`MLServiceError`. Handlers map them to
HTTP responses with a stable envelope: ``{"status": "error", "message": ...}``.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.utils.logger import get_logger

logger = get_logger("ml-service.errors")


class MLServiceError(Exception):
    """Base error with an HTTP status code and a user-safe message."""

    status_code = 500
    message = "An unexpected error occurred."
    code = "internal_error"

    def __init__(self, message: str | None = None, *, code: str | None = None) -> None:
        super().__init__(message or self.message)
        self.message = message or self.message
        self.code = code or self.code


class EmptyComplaintError(MLServiceError):
    status_code = 400
    message = "Complaint text cannot be empty."
    code = "empty_complaint"


class InvalidRequestError(MLServiceError):
    status_code = 422
    message = "Invalid request payload."
    code = "invalid_request"


class ModelUnavailableError(MLServiceError):
    status_code = 503
    message = "Required model is not available."
    code = "model_unavailable"


class ModelLoadingError(ModelUnavailableError):
    message = "Failed to load the machine learning model."
    code = "model_load_failed"


class DuplicateDetectionError(MLServiceError):
    status_code = 503
    message = "Duplicate detection is unavailable."
    code = "duplicate_detection_unavailable"


class MLProcessingError(MLServiceError):
    status_code = 500
    message = "The ML service failed to process the request."
    code = "ml_processing_error"


def _error_response(status_code: int, message: str, code: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": "error", "message": message, "error": code},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach centralized handlers for known and unknown failures."""

    @app.exception_handler(MLServiceError)
    async def _ml_error(_: Request, exc: MLServiceError) -> JSONResponse:
        logger.warning(f"{exc.__class__.__name__}: {exc.message}")
        return _error_response(exc.status_code, exc.message, exc.code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details: Any = exc.errors()
        logger.warning(f"Request validation failed: {details}")
        return _error_response(
            422,
            "Invalid request payload.",
            "validation_error",
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error: %s", exc)
        return _error_response(500, "An unexpected error occurred.", "internal_error")


__all__ = [
    "MLServiceError",
    "EmptyComplaintError",
    "InvalidRequestError",
    "ModelUnavailableError",
    "ModelLoadingError",
    "DuplicateDetectionError",
    "MLProcessingError",
    "register_exception_handlers",
    "logger",
]