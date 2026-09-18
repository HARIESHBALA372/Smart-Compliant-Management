"""Build the duplicate-detection index.

Embeds the "existing" subset of the dataset and saves serialized embeddings to
``models/duplicates_index.json`` (shape: complaint_id, title, text,
resolution_summary, embedding).

Run:  python training/build_duplicate_index.py [--dataset data/raw/complaints.csv]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
if str(BASE) not in sys.path:
    sys.path.insert(0, str(BASE))

import pandas as pd  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.models.duplicate_detector import DuplicateDetector, build_embedder  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the duplicate-detection embedding index.")
    parser.add_argument("--dataset", default="data/raw/complaints.csv")
    parser.add_argument("--output", default="models/duplicates_index.json")
    parser.add_argument("--limit", type=int, default=300, help="Max existing complaints to index (0 = all).")
    args = parser.parse_args()

    settings = get_settings()
    frame = pd.read_csv(args.dataset)
    if "existing" in frame.columns:
        frame = frame[frame["existing"] == 1]
    if args.limit and len(frame) > args.limit:
        frame = frame.sample(args.limit, random_state=42)

    embedder = build_embedder(settings.EMBEDDING_BACKEND, settings.EMBEDDING_MODEL)
    print(f"Embedding backend: {embedder.name} ({embedder.model_name})")
    detector = DuplicateDetector(threshold=settings.DUPLICATE_THRESHOLD, embedder=embedder)
    detector.build_index(frame.to_dict(orient="records"))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    detector.save(output)
    print(f"Duplicate index: {len(detector.documents)} complaints -> {output}")


if __name__ == "__main__":
    main()