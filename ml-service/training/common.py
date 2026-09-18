"""Shared helpers for the offline training pipeline: dataset validation, split,
metrics and serialization of reports."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def require_columns(frame: pd.DataFrame, columns: List[str], task: str) -> pd.DataFrame:
    missing = [c for c in columns if c not in frame.columns]
    if missing:
        raise ValueError(f"{task}: dataset is missing required columns: {missing}")
    return frame


def validate_dataset(frame: pd.DataFrame, label_col: str) -> pd.DataFrame:
    """Drop empty/invalid rows and report the damage."""
    frame = frame.dropna(subset=["text", label_col]).copy()
    frame = frame[frame["text"].astype(str).str.strip() != ""]
    if frame.empty:
        raise ValueError("Dataset is empty after dropping missing values.")
    return frame


def train_test_split_frame(frame: pd.DataFrame, test_size: float, seed: int = 42) -> Tuple[pd.DataFrame, pd.DataFrame]:
    from sklearn.model_selection import train_test_split

    return train_test_split(frame, test_size=test_size, random_state=seed, stratify=frame.get("category"))


def metrics_report(y_true: List[str], y_pred: List[str], labels: List[str], model_name: str) -> Dict[str, Any]:
    """Return accuracy/precision/recall/f1 (+ macro/weighted) and confusion matrix."""
    return {
        "model": model_name,
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision_macro": round(float(precision_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "classification_report": classification_report(y_true, y_pred, labels=labels, zero_division=0, output_dict=True),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "labels": labels,
    }


def write_report(filename: str, report: Dict[str, Any]) -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORTS_DIR / filename
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
    print(f"Report written -> {path}")


def save_artifact(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(obj, path)
    print(f"Artifact saved -> {path}")


def ensure_models_dir() -> Path:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    return MODELS_DIR