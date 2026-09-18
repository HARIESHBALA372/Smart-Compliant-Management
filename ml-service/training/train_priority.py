"""Train the priority predictor's ML component.

The runtime service always blends rule-based scores with this model's output.
Priority label order is fixed to [Low, Medium, High, Critical] so the runtime
can map probability indices directly.

Run:  python training/train_priority.py [--test-size 0.2]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402

from app.services.preprocessing_service import preprocessor  # noqa: E402
from training import common  # noqa: E402

PRIORITY_ORDER = ["Low", "Medium", "High", "Critical"]


def load_dataset(path: str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    common.require_columns(frame, ["text", "priority"], "priority training")
    frame = common.validate_dataset(frame, "priority")
    # Keep only known priority labels.
    frame = frame[frame["priority"].isin(PRIORITY_ORDER)]
    if frame.empty:
        raise ValueError("Dataset has no rows with recognized priority labels.")
    return frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the priority model (ML component of the hybrid scorer).")
    parser.add_argument("--dataset", default="data/raw/complaints.csv")
    parser.add_argument("--output", default=str(common.MODELS_DIR / "priority_model.joblib"))
    parser.add_argument("--vectorizer", default=str(common.MODELS_DIR / "priority_vectorizer.joblib"))
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-features", type=int, default=6000)
    args = parser.parse_args()

    frame = load_dataset(args.dataset)
    frame["features"] = frame["text"].map(lambda t: preprocessor.preprocess(t).features)
    train, test = common.train_test_split_frame(frame, args.test_size, args.seed)

    vectorizer = TfidfVectorizer(max_features=args.max_features, ngram_range=(1, 2), sublinear_tf=True)
    X_train = vectorizer.fit_transform(train["features"])
    X_test = vectorizer.transform(test["features"])

    label_to_idx = {label: i for i, label in enumerate(PRIORITY_ORDER)}
    y_train = train["priority"].map(label_to_idx).to_numpy()
    y_test = test["priority"].map(label_to_idx).to_numpy()

    model = LogisticRegression(max_iter=1500, C=1.0, solver="lbfgs")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_pred_labels = [PRIORITY_ORDER[int(i)] for i in y_pred]
    y_test_labels = [PRIORITY_ORDER[int(i)] for i in y_test]

    report = common.metrics_report(y_test_labels, y_pred_labels, PRIORITY_ORDER, "TF-IDF + Logistic Regression (priority)")
    report["train_sample_size"] = int(len(train))
    report["test_sample_size"] = int(len(test))
    common.write_report("priority_evaluation.json", report)

    common.save_artifact(Path(args.output), model)
    common.save_artifact(Path(args.vectorizer), vectorizer)
    print(f"Priority model accuracy: {report['accuracy']:.3f} | F1(macro): {report['f1_macro']:.3f}")


if __name__ == "__main__":
    main()