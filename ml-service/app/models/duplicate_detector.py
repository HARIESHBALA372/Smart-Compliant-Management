"""Semantic duplicate detection.

Compares a complaint's embedding against a pre-computed index of existing
complaints. Embeddings are cosine-normalized. Two backends are supported:

- ``sentence-transformers`` (all-MiniLM-L6-v2) - higher quality semantic matching.
- ``hashing`` (sklearn HashingVectorizer) - dependency-free fallback that needs
  no vocabulary and therefore works identically at build- and run-time.

The active backend is chosen from settings (`EMBEDDING_BACKEND=auto|...`).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Tuple

import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer

from app.services.preprocessing_service import preprocessor
from app.utils.exceptions import DuplicateDetectionError
from app.utils.logger import get_logger

logger = get_logger("ml-service.duplicates")

_HASH_DIMENSIONS = 2 ** 15


class Embedder(Protocol):
    """Produces L2-normalized embeddings for a list of texts."""

    name: str
    model_name: str

    def encode(self, texts: List[str]) -> np.ndarray: ...


class HashingEmbedder:
    """Dependency-free fallback: hashed n-gram features, L2 normalized."""

    name = "hashing"
    model_name = "HashingVectorizer"

    def __init__(self) -> None:
        self._vectorizer = HashingVectorizer(
            n_features=_HASH_DIMENSIONS,
            alternate_sign=True,
            norm="l2",
            analyzer="word",
            ngram_range=(1, 2),
        )

    def encode(self, texts: List[str]) -> np.ndarray:
        cleaned = [preprocessor.clean(t) or " " for t in texts]
        matrix = self._vectorizer.transform(cleaned)
        norms = np.linalg.norm(matrix.toarray(), axis=1, keepdims=True)  # type: ignore[assignment]
        # HashingVectorizer(norm='l2') rows are already unit vectors; guard against zeros.
        matrix = matrix.toarray()  # type: ignore[assignment]
        norms[norms == 0] = 1.0
        return matrix / norms


class SentenceTransformerEmbedder:
    """Sentence-transformers wrapper (lazy import, optional heavy dependency)."""

    name = "sentence-transformers"
    model_name: str

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model: Any = None

    def _ensure_model(self) -> Any:
        if self._model is None:
            from sentence_transformers import SentenceTransformer  # type: ignore[import-not-found]

            self._model = SentenceTransformer(self.model_name)
        return self._model

    def encode(self, texts: List[str]) -> np.ndarray:
        vectors = self._ensure_model().encode(texts, normalize_embeddings=True)
        arr = np.asarray(vectors, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        return arr


def sentence_transformers_available() -> bool:
    try:
        import sentence_transformers  # noqa: F401

        return True
    except Exception:  # noqa: BLE001
        return False


def build_embedder(backend: str, model_name: str) -> Embedder:
    """Create the configured embedder, degrading to hashing when needed."""
    backend = (backend or "auto").lower()
    if backend == "sentence-transformers":
        if not sentence_transformers_available():
            logger.warning("sentence-transformers requested but not installed; using hashing fallback")
            return HashingEmbedder()
        embedder = SentenceTransformerEmbedder(model_name)
    elif backend == "tfidf":
        # "tfidf" kept for config compatibility -> hashing fallback.
        logger.warning("EMBEDDING_BACKEND='tfidf' not supported directly; using hashing fallback")
        return HashingEmbedder()
    else:  # auto
        if sentence_transformers_available():
            embedder = SentenceTransformerEmbedder(model_name)
            logger.info("Using sentence-transformers embedding backend")
        else:
            embedder = HashingEmbedder()
            logger.info("Using hashing embedding backend (no sentence-transformers installed)")
    return embedder


@dataclass
class DuplicateDocument:
    complaint_id: str
    title: str
    text: str
    resolution_summary: str
    embedding: np.ndarray


@dataclass
class DuplicateMatch:
    complaint_id: str
    title: str
    similarity: float
    resolution_summary: str


class DuplicateDetector:
    """Stores an index of known complaints and scores new text against it."""

    def __init__(self, threshold: float = 0.85, max_results: int = 5, embedder: Optional[Embedder] = None) -> None:
        self.threshold = threshold
        self.max_results = max_results
        self.embedder: Optional[Embedder] = embedder
        self.documents: List[DuplicateDocument] = []
        self.loaded = False

    @property
    def effective_threshold(self) -> float:
        return self.threshold

    def set_embedder(self, embedder: Embedder) -> None:
        self.embedder = embedder

    def build_index(
        self,
        complaints: List[Dict[str, Any]],
        embedder: Optional[Embedder] = None,
        text_key: str = "text",
    ) -> None:
        """Build an in-memory index from complaint dicts (used by training/tests)."""
        active = embedder or self.embedder
        if active is None:
            raise DuplicateDetectionError("No embedding backend available to build the duplicate index.")
        texts = [(str(c.get(text_key, "")) or "") for c in complaints]
        matrix = active.encode(texts)
        self.documents = [
            DuplicateDocument(
                complaint_id=str(c.get("complaint_id", f"INDEX-{i}")),
                title=str(c.get("title", c.get("text", "")))[:200],
                text=str(c.get(text_key, "")),
                resolution_summary=str(c.get("resolution_summary", "")),
                embedding=matrix[i],
            )
            for i, c in enumerate(complaints)
        ]
        self.loaded = True

    def load(self, path: Path) -> bool:
        """Load a serialized index (JSON with stored embeddings)."""
        try:
            with open(path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            docs = payload.get("documents", [])
            self.documents = [
                DuplicateDocument(
                    complaint_id=str(d.get("complaint_id", f"IX-{i}")),
                    title=str(d.get("title", ""))[:200],
                    text=str(d.get("text", "")),
                    resolution_summary=str(d.get("resolution_summary", "")),
                    embedding=np.asarray(d["embedding"], dtype=np.float32),
                )
                for i, d in enumerate(docs)
            ]
            self.loaded = len(self.documents) > 0
            logger.info(f"Duplicate index loaded: {len(self.documents)} complaints")
            return self.loaded
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Duplicate index not loaded: {exc}")
            self.documents = []
            self.loaded = False
            return False

    def save(self, path: Path) -> None:
        payload = {
            "documents": [
                {
                    "complaint_id": d.complaint_id,
                    "title": d.title,
                    "text": d.text,
                    "resolution_summary": d.resolution_summary,
                    "embedding": [float(x) for x in d.embedding.tolist()],
                }
                for d in self.documents
            ]
        }
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False)
        logger.info(f"Duplicate index saved: {len(self.documents)} complaints -> {path}")

    def find_similar(self, text: str, limit: Optional[int] = None) -> List[DuplicateMatch]:
        """Return similar documents sorted by descending similarity."""
        if not self.loaded or not self.documents:
            return []
        if self.embedder is None:
            raise DuplicateDetectionError("Duplicate embedding backend is not configured.")
        try:
            query = self.embedder.encode([text])[0]
            limit = limit or self.max_results
            scored: List[DuplicateMatch] = []
            for doc in self.documents:
                vec = doc.embedding.reshape(-1)
                if query.size != vec.size:
                    # Incompatible embeddings (different backend at build time).
                    continue
                sim = float(float(np.dot(query, vec)))
                scored.append(
                    DuplicateMatch(
                        complaint_id=doc.complaint_id,
                        title=doc.title,
                        similarity=round(sim, 4),
                        resolution_summary=doc.resolution_summary,
                    )
                )
            scored.sort(key=lambda m: m.similarity, reverse=True)
            return scored[:limit]
        except Exception as exc:  # noqa: BLE001
            raise DuplicateDetectionError(f"Duplicate detection failed: {exc}") from exc

    def detect(self, text: str) -> Tuple[bool, float, List[str], List[DuplicateMatch]]:
        """Return (is_duplicate, max_similarity, matched_ids, top_matches)."""
        matches = self.find_similar(text)
        max_similarity = matches[0].similarity if matches else 0.0
        threshold = self.effective_threshold
        matched_ids = [m.complaint_id for m in matches if m.similarity >= threshold]
        return bool(matched_ids), max_similarity, matched_ids, matches


__all__ = [
    "DuplicateDetector",
    "DuplicateMatch",
    "DuplicateDocument",
    "build_embedder",
    "sentence_transformers_available",
    "HashingEmbedder",
    "SentenceTransformerEmbedder",
]