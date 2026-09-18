"""Structured logging utilities.

Produces single-line JSON logs (like the backend's pino output) and never logs
passwords, authentication tokens or sensitive personal data.
"""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

# Patterns matched against log payload keys/values and scrubbed.
_REDACT_KEYS = re.compile(r"(api[_-]?key|token|password|passwd|secret|authorization|auth)", re.IGNORECASE)
_REDACT_TOKEN_VALUE = re.compile(r"(?i)(token|bearer)[=:\s]+[A-Za-z0-9._\-]+")
_SENSITIVE_VALUE = re.compile(r"(?:password|token|secret|api[_-]?key)[=:\s]+([^\s\"']+)", re.IGNORECASE)

_REDACTED = "[REDACTED]"


def _redact_value(value: Any) -> Any:
    if isinstance(value, str):
        value = _SENSITIVE_VALUE.sub(_REDACTED, value)
        value = _REDACT_TOKEN_VALUE.sub(lambda m: m.group(0).split("=")[0] + "=" + _REDACTED, value)
        return value
    if isinstance(value, dict):
        return {_redact_value(k): _redact_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact_value(v) for v in value]
    return value


def _redact_payload(record: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key, value in record.items():
        if _REDACT_KEYS.search(key):
            payload[key] = _REDACTED
        else:
            payload[key] = _redact_value(value)
    return payload


class JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line with a consistent envelope."""

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat()
        payload: dict[str, Any] = {
            "level": record.levelname,
            "timestamp": ts,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if getattr(record, "data", None) is not None:
            payload["data"] = record.data
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(_redact_payload(payload), ensure_ascii=False, default=str)


_LOG_CONFIGURED = False


def setup_logging(level: str = "INFO") -> None:
    """Configure the root logger once with JSON output."""
    global _LOG_CONFIGURED
    if _LOG_CONFIGURED:
        return
    _LOG_CONFIGURED = True

    root = logging.getLogger()
    root.setLevel(level.upper())

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.handlers = [handler]

    # Keep noisy libraries reasonable.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger with structured fields support (`log(data=...)`)."""
    return logging.getLogger(name)