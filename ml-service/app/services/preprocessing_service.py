"""Text preprocessing and lightweight feature extraction.

A reusable, deterministic pipeline: lowercase, punctuation cleanup, tokenization,
judicious stop-word removal and stemming. Domain words and numbers are preserved
so classification signals (locations, durations, infrastructure) survive.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Sequence

try:  # nltk is pure-Python and usable offline for stemming only
    from nltk.stem import PorterStemmer
except Exception:  # pragma: no cover - fallback when nltk is not installed
    PorterStemmer = None  # type: ignore[assignment]

# --- Stop words ---------------------------------------------------------------
# Negations and numbers are deliberately kept: "no water", "5 days" carry meaning.
_STOP_WORDS: frozenset[str] = frozenset(
    """
    the a an and or but is are was were be been being to of in on at for with by
    from as it its this that these those my our their his her we you i they he she
    them us me there here do does did have has had will would can could should may
    might must so than then just very about into over under again further once also
    etc get got got your mine yours ours please kindly sir madam
    """.split()
)

# --- Domain lexicons ----------------------------------------------------------
_INFRA_TERMS: dict[str, str] = {
    # water
    "water supply": "water", "pipeline": "water", "water pipe": "water", "pipe": "water",
    "leakage": "water", "water leak": "water", "tank": "water", "borewell": "water",
    "tap": "water", "no water": "water", "drinking": "water", "sewage": "water",
    "drain": "water", "drainage": "water", "overflow": "water", "flood": "water",
    # electricity / street lights
    "electricity": "electricity", "power": "electricity", "outage": "electricity",
    "voltage": "electricity", "transformer": "electricity", "wire": "electricity",
    "cable": "electricity", "street light": "street_lights", "streetlight": "street_lights",
    "lamp post": "street_lights", "lamp": "street_lights", "light": "street_lights",
    "dark": "street_lights", "streetlamp": "street_lights",
    # roads
    "road": "roads", "pothole": "roads", "potholes": "roads", "surface": "roads",
    "crack": "roads", "asphalt": "roads", "speed bump": "roads", "speed breaker": "roads",
    "footpath": "roads", "sidewalk": "roads", "sign": "roads", "signboard": "roads",
    "ditch": "roads", "barricade": "roads", "manhole": "roads",
    # garbage / waste / sanitation
    "garbage": "sanitation", "waste": "sanitation", "trash": "sanitation",
    "rubbish": "sanitation", "litter": "sanitation", "bin": "sanitation",
    "dump": "sanitation", "smell": "sanitation", "stink": "sanitation",
    "sanitation": "sanitation", "clean": "sanitation", "mosquito": "sanitation",
    "rat": "sanitation", "pest": "sanitation",
    # transport
    "bus": "transport", "metro": "transport", "train": "transport", "commute": "transport",
    "taxi": "transport", "auto": "transport", "transport": "transport", "bus stop": "transport",
    "signal": "traffic", "traffic": "traffic", "jams": "traffic", "jam": "traffic",
    "vehicle": "traffic", "parking": "traffic", "accident": "traffic", "rash driving": "traffic",
    # safety
    "safety": "safety", "danger": "safety", "hazard": "safety", "unsafe": "safety",
    "collapse": "safety", "collapsing": "safety", "structure": "safety", "broken": "safety",
    "open manhole": "safety", "electric shock": "safety", "shock": "safety",
    "snake": "safety", "stray": "safety", "dogs": "safety", "abandoned": "safety",
    "building": "safety", "fire": "safety", "gas leak": "safety", "theft": "safety",
    # govt services
    "license": "government", "permit": "government", "certificate": "government",
    "tax": "government", "birth certificate": "government", "ration": "government",
    "pension": "government", "application": "government", "office": "government",
    "staff": "government", "service": "government",
}

_LOCATION_SUFFIXES = (
    "street", "road", "road." , "nagar", "colony", "market", "stop", "school", "park",
    "cross", "junction", "point", "area", "block", "lane", "gate", "square", "street.",
)

# --- Patterns ----------------------------------------------------------------
_TOKEN_RE = re.compile(r"[a-z0-9]+")
_PUNCT_RE = re.compile(r"[^a-z0-9\s]")
_DURATION_RE = re.compile(r"\b\d+\s*(day|days|week|weeks|month|months|hour|hours|year|years)\b")
_SPACES_RE = re.compile(r"\s+")


def _stem(word: str) -> str:
    if PorterStemmer is not None:
        try:
            return PorterStemmer().stem(word)
        except Exception:  # pragma: no cover
            return word
    return word


@dataclass(frozen=True)
class Preprocessed:
    """Result of preprocessing text for model consumption."""

    original: str
    cleaned: str  # normalized, punctuation stripped, single spaces
    tokens: List[str]  # raw tokens (stop words retained)
    features: str  # list of stemmed non-stopword tokens, for vectorizer input


class TextPreprocessor:
    """Stateless text normalization + feature extraction pipeline."""

    def clean(self, text: str | None) -> str:
        """Lowercase, strip punctuation/special characters, collapse whitespace."""
        if not text:
            return ""
        lowered = text.lower()
        cleaned = _PUNCT_RE.sub(" ", lowered)
        return _SPACES_RE.sub(" ", cleaned).strip()

    def tokenize(self, text: str) -> List[str]:
        return _TOKEN_RE.findall(self.clean(text))

    def remove_stopwords(self, tokens: Sequence[str]) -> List[str]:
        return [t for t in tokens if t not in _STOP_WORDS and len(t) > 1]

    def preprocess(self, text: str | None) -> Preprocessed:
        cleaned = self.clean(text)
        tokens = _TOKEN_RE.findall(cleaned)
        significant = [t for t in tokens if t not in _STOP_WORDS]
        features = " ".join(_stem(t) for t in significant)
        return Preprocessed(original=(text or ""), cleaned=cleaned, tokens=tokens, features=features)

    # --- Module-friendly wrappers ----------------------------------------

    def keywords(self, text: str | None, limit: int = 10) -> List[str]:
        return extract_keywords(text, limit=limit)

    def summary(self, text: str | None) -> str:
        return generate_summary(text)

    def sentiment(self, text: str | None) -> tuple[str, float]:
        return analyze_sentiment(text)


preprocessor = TextPreprocessor()


# ----------------------------------------------------------------------------
# Keyword / entity extraction
# ----------------------------------------------------------------------------
def extract_keywords(text: str | None, limit: int = 10) -> List[str]:
    """Extract informative keywords and entity-like phrases.

    Combines: known infrastructure terms, duration phrases, geographic token
    pairs (e.g. "anna nagar") and the most frequent significant single tokens.
    """
    if not text:
        return []
    from collections import Counter

    low = preprocessor.clean(text)
    keywords: List[str] = []

    # Infrastructure vocabulary hits.
    for phrase in _INFRA_TERMS:
        if phrase in low:
            keywords.append(phrase)

    # Duration phrases: "5 days", "three weeks".
    for m in _DURATION_RE.finditer(low):
        keywords.append(m.group(0))

    tokens = _TOKEN_RE.findall(low)
    # Geographic pairs: non-stopword token followed by a location suffix.
    loc_target = set(_LOCATION_SUFFIXES)
    for i in range(1, len(tokens)):
        if tokens[i] in loc_target and tokens[i - 1] not in _STOP_WORDS:
            phrase = f"{tokens[i - 1]} {tokens[i]}"
            if phrase not in keywords:
                keywords.append(phrase)

    # Rank remaining significant single tokens not already captured.
    significant = preprocessor.remove_stopwords(tokens)
    captured = {_stem(w.split()[0]) for w in keywords}
    for token, _count in Counter(significant).most_common():
        if len(keywords) >= limit:
            break
        if _stem(token) in captured:
            continue
        keywords.append(token)

    # De-duplicate while keeping order, drop stop words.
    seen: set[str] = set()
    result: List[str] = []
    for word in keywords:
        w = word.strip(".")
        if w and w not in seen and w not in _STOP_WORDS:
            seen.add(w)
            result.append(w)
        if len(result) >= limit:
            break
    return result


# ----------------------------------------------------------------------------
# Extractive summarization
# ----------------------------------------------------------------------------
def _split_clauses(text: str) -> List[str]:
    parts = re.split(r"[.;!?]|(?: however| meanwhile| also| and| but )", text)
    return [p.strip() for p in parts if len(p.strip()) >= 10]


def generate_summary(text: str | None, max_len: int = 140) -> str:
    """Return a short extractive summary (kept meaningful without an LLM).

    Picks the clause with the strongest domain/urgency signal, otherwise the
    first informative clause. Falls back to a trimmed cleaned text.
    """
    if not text:
        return ""
    cleaned = preprocessor.clean(text)
    clauses = _split_clauses(cleaned)
    if not clauses:
        summary = cleaned
    else:
        urgency = _URGENCY_WORDS
        best: str | None = None
        best_score = -1
        for clause in clauses:
            score = sum(1 for t in _TOKEN_RE.findall(clause) if t in _INFRA_TERMS)
            score += sum(1 for t in _TOKEN_RE.findall(clause) if t in urgency)
            score += 1 if _DURATION_RE.search(clause) else 0
            if score > best_score:
                best_score = score
                best = clause
        summary = best or clauses[0]
    summary = summary.strip(" ,-")
    if len(summary) > max_len:
        summary = summary[: max_len - 3].rstrip() + "..."
    return summary[:max_len].strip()


# ----------------------------------------------------------------------------
# Sentiment (lexicon-based, lightweight, transparent)
# ----------------------------------------------------------------------------
_POSITIVE = frozenset(
    "good great fine quick quickly resolved resolved fixed solved repaired working okay ok helpful clean prompt excellent impressed satisfied thanks thank".split()
)
_NEGATIVE = frozenset(
    "bad terrible worst broken not failed failure delay delayed ignored careless rude dangerous unsafe dark stink smell overflowing blocked jam stuck unhygienic unsanitary leak flood flooded damaged complained never no dont cannot wont".split()
)
_URGENCY_WORDS = frozenset(
    "urgent immediately critical dangerous emergency serious severe risk hazard afraid scared worried".split()
)


def analyze_sentiment(text: str | None) -> tuple[str, float]:
    """Classify complaint sentiment from positive/negative/urgency vocabulary."""
    if not text:
        return "neutral", 0.0
    tokens = preprocessor.tokenize(text)
    pos = sum(1 for t in tokens if t in _POSITIVE)
    neg = sum(1 for t in tokens if t in _NEGATIVE)
    urgent = sum(1 for t in tokens if t in _URGENCY_WORDS)
    if neg > 0 and pos <= len(tokens) * 0.02:
        neg += urgent
    score = (pos - neg) / (pos + neg + 2)
    if score > 0.15:
        return "positive", round(min(abs(score) + 0.5, 1.0), 3)
    if score < -0.15:
        return "negative", round(min(abs(score) + 0.5, 1.0), 3)
    return "neutral", round(0.5 - abs(score) * 0.4, 3)


__all__ = [
    "TextPreprocessor",
    "Preprocessed",
    "preprocessor",
    "extract_keywords",
    "generate_summary",
    "analyze_sentiment",
]