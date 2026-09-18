"""Evaluate trained artifacts on a held-out split and summarize metrics.

Run:  python training/evaluate.py [--dataset data/raw/complaints.csv]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

import joblib  # noqa: E402
import pandas as pd  # noqa: E402

from app.services.preprocessing_service import preprocessor  # noqa: E402
from training import common  # noqa: E402

CATEGORY_MODEL = common.MODELS_DIR / "complaint_classifier.joblib"
CATEGORY_VECTORIZER = common.MODELS_DIR / "vectorizer.joblib"
CATEGORY_ENCODER = common.MODELS_DIR / "category_encoder.joblib"
PRIORITY_MODEL = common.MODELS_DIR / "priority_model.joblib"
PRIORITY_VECTORIZER = common.MODELS_DIR / "priority_vectorizer.joblib"

PRIORITY_ORDER = ["Low", "Medium", "High", "Critical"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the trained classifier and priority models.")
    parser.add_argument("--dataset", default="data/raw/complaints.csv")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    frame = pd.read_csv(args.dataset)
    frame = common.validate_dataset(frame, "category")
    frame["features"] = frame["text"].map(lambda t: preprocessor.preprocess(t).features)
    train, test = common.train_test_split_frame(frame, args.test_size, args.seed)

    if CATEGORY_MODEL.exists():
        model = joblib.load(CATEGORY_MODEL)
        vectorizer = joblib.load(CATEGORY_VECTORIZER)
        encoder = joblib.load(CATEGORY_ENCODER)
        X = vectorizer.transform(test["features"])
        y_true = encoder.transform(test["category"].tolist())
        y_pred = model.predict(X)
        report = common.metrics_report(
            encoder.inverse_transform(y_true).tolist(),
            encoder.inverse_transform(y_pred).tolist(),
            encoder.classes_.tolist(),
            "TF-IDF + Logistic Regression",
        )
        common.write_report("model_evaluation.json", report)
        print(f"Classifier accuracy on held-out split: {report['accuracy']:.3f}")

    if PRIORITY_MODEL.exists():
        model = joblib.load(PRIORITY_MODEL)
        vectorizer = joblib.load(PRIORITY_VECTORIZER)
        test_p = test[test["priority"].isin(PRIORITY_ORDER)]
        X = vectorizer.transform(test_p["features"])
        y_true = [PRIORITY_ORDER.index(p) for p in test_p["priority"]]
        y_pred = model.predict(X)
        report = common.metrics_report(
            [PRIORITY_ORDER[i] for i in y_true],
            [PRIORITY_ORDER[int(i)] for i in y_pred],
            PRIORITY_ORDER,
            "priority model",
        )
        common.write_report("priority_evaluation.json", report)
        print(f"Priority model accuracy on held-out split: {report['accuracy']:.3f}")


if __name__ == "__main__":
    main()