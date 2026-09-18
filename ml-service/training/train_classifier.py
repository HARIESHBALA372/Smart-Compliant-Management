"""Train the complaint category classifier.

Pipeline: load dataset -> validate -> preprocess -> 80/20 split -> TF-IDF ->
Logistic Regression -> metrics -> serialize model + vectorizer + label encoder.

Run:  python training/train_classifier.py [--test-size 0.2]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

import pandas as pd  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.preprocessing import LabelEncoder  # noqa: E402

from app.services.preprocessing_service import preprocessor  # noqa: E402
from training import common  # noqa: E402


def load_dataset(path: str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    common.require_columns(frame, ["text", "category"], "classifier training")
    return common.validate_dataset(frame, "category")


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame["features"] = frame["text"].map(lambda t: preprocessor.preprocess(t).features)
    return frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the TF-IDF + Logistic Regression complaint classifier.")
    parser.add_argument("--dataset", default="data/raw/complaints.csv")
    parser.add_argument("--output", default=str(common.MODELS_DIR / "complaint_classifier.joblib"))
    parser.add_argument("--vectorizer", default=str(common.MODELS_DIR / "vectorizer.joblib"))
    parser.add_argument("--encoder", default=str(common.MODELS_DIR / "category_encoder.joblib"))
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max-features", type=int, default=8000)
    args = parser.parse_args()

    frame = load_dataset(args.dataset)
    frame = build_features(frame)
    print(f"Loaded {len(frame)} complaints across {frame['category'].nunique()} categories.")

    train, test = common.train_test_split_frame(frame, args.test_size, args.seed)

    vectorizer = TfidfVectorizer(max_features=args.max_features, ngram_range=(1, 2), sublinear_tf=True)
    X_train = vectorizer.fit_transform(train["features"])
    X_test = vectorizer.transform(test["features"])

    encoder = LabelEncoder()
    y_train = encoder.fit_transform(train["category"])
    y_test = encoder.transform(test["category"])

    model = LogisticRegression(max_iter=1500, C=1.0, solver="lbfgs")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_test_labels = encoder.inverse_transform(y_test).tolist()
    y_pred_labels = encoder.inverse_transform(y_pred).tolist()
    labels = encoder.classes_.tolist()
    report = common.metrics_report(y_test_labels, y_pred_labels, labels, "TF-IDF + Logistic Regression")
    report["train_sample_size"] = int(len(train))
    report["test_sample_size"] = int(len(test))
    report["test_size_ratio"] = args.test_size
    common.write_report("model_evaluation.json", report)

    common.save_artifact(Path(args.output), model)
    common.save_artifact(Path(args.vectorizer), vectorizer)
    common.save_artifact(Path(args.encoder), encoder)
    print(f"Classifier accuracy: {report['accuracy']:.3f} | F1(macro): {report['f1_macro']:.3f}")


if __name__ == "__main__":
    main()