import re
import math
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings
from app.models.enums import Category, Priority

CATEGORY_KEYWORDS: Dict[Category, List[str]] = {
    Category.WATER: ['water', 'tap', 'pipeline', 'pipe', 'leakage', 'leak', 'drinking', 'sewage', 'drain choked moisture', 'supply', 'borewell'],
    Category.ELECTRICITY: ['electric', 'electricity', 'power', 'street light', 'streetlight', 'transformer', 'voltage', 'wire', 'wires', 'blackout', 'outage', 'bulb', 'current', 'meter'],
    Category.ROADS: ['road', 'pothole', 'potholes', 'street', 'pavement', 'sidewalk', 'footpath', 'speed', 'breaker', 'bumps', 'manhole cover', 'bridge'],
    Category.SANITATION: ['garbage', 'waste', 'trash', 'sewage', 'drain', 'drainage', 'toilet', 'cleanliness', 'sanitation', 'odour', 'smell', 'stagnant', 'mosquito', 'bin', 'bins', 'dumping'],
    Category.TRANSPORT: ['bus', 'transport', 'traffic', 'signal', 'metro', 'cab', 'auto', 'vehicle', 'commute', 'parking'],
    Category.SAFETY: ['safety', 'security', 'unsafe', 'abandoned', 'crime', 'theft', 'trespass', 'dark', 'dangerous', 'gambling', 'encroach', 'encroachment'],
    Category.OTHER: ['suggestion', 'request', 'improvement', 'general', 'feature', 'service', 'staff', 'helpdesk'],
}

PRIORITY_KEYWORDS: Dict[Priority, List[str]] = {
    Priority.CRITICAL: ['emergency', 'immediate', 'urgent', 'danger', 'risky', 'risk', 'fire', 'burst', 'severe', 'threat', 'life', 'hazard', 'collapse', 'crash', 'injury', 'accident', 'flood', 'flooded'],
    Priority.HIGH: ['major', 'serious', 'entire', 'whole block', 'all residents', 'widespread', 'no water', 'stagnant', 'no electricity', 'hours', 'days', 'delay', 'damaged', 'damage'],
    Priority.MEDIUM: ['several', 'some', 'occasional', 'week', 'sometimes', 'moderate', 'partial'],
    Priority.LOW: ['suggestion', 'request', 'minor', 'cosmetic', 'improvement', 'nice to have', 'small', 'slight'],
}

CATEGORY_TO_DEPARTMENT: Dict[Category, str] = {
    Category.WATER: 'Water Supply',
    Category.ELECTRICITY: 'Electricity',
    Category.ROADS: 'Roads',
    Category.SANITATION: 'Sanitation',
    Category.TRANSPORT: 'Transportation',
    Category.SAFETY: 'Public Safety',
    Category.OTHER: 'General',
}

ML_CATEGORY_TO_BACKEND: Dict[str, Dict[str, Any]] = {
    'Water Supply': {'category': Category.WATER, 'department': 'Water Supply'},
    'Electricity': {'category': Category.ELECTRICITY, 'department': 'Electricity'},
    'Roads': {'category': Category.ROADS, 'department': 'Roads'},
    'Garbage/Waste': {'category': Category.SANITATION, 'department': 'Sanitation'},
    'Drainage': {'category': Category.SANITATION, 'department': 'Sanitation'},
    'Street Lights': {'category': Category.ELECTRICITY, 'department': 'Electricity'},
    'Public Transport': {'category': Category.TRANSPORT, 'department': 'Transportation'},
    'Traffic': {'category': Category.TRANSPORT, 'department': 'Transportation'},
    'Public Safety': {'category': Category.SAFETY, 'department': 'Public Safety'},
    'Sanitation': {'category': Category.SANITATION, 'department': 'Sanitation'},
    'Government Services': {'category': Category.OTHER, 'department': 'General'},
    'Other': {'category': Category.OTHER, 'department': 'General'},
}

ML_PRIORITY_TO_BACKEND: Dict[str, Priority] = {
    'Low': Priority.LOW,
    'Medium': Priority.MEDIUM,
    'High': Priority.HIGH,
    'Critical': Priority.CRITICAL,
}

def department_for_category(category: Category) -> str:
    return CATEGORY_TO_DEPARTMENT.get(category, "General")

def _normalize(text: str) -> str:
    return re.sub(r'[^a-z0-9 ]', ' ', text.lower())

def _score_keywords(text: str, keywords: List[str]) -> tuple[int, List[str]]:
    normalized = _normalize(text)
    score = 0
    found: List[str] = []
    for kw in keywords:
        safe = _normalize(kw)
        if safe in normalized:
            score += 1
            found.append(kw)
    return score, found

def fallback_classify_complaint(title: str, description: str) -> Dict[str, Any]:
    text = f"{title} {description}"
    best_cat = Category.OTHER
    best_cat_score = 0
    best_cat_keywords = []

    for cat, kws in CATEGORY_KEYWORDS.items():
        score, found = _score_keywords(text, kws)
        if score > best_cat_score:
            best_cat = cat
            best_cat_score = score
            best_cat_keywords = found

    best_prio = Priority.MEDIUM
    best_prio_score = 0
    best_prio_keywords = []

    for prio, kws in PRIORITY_KEYWORDS.items():
        score, found = _score_keywords(text, kws)
        if score > best_prio_score:
            best_prio = prio
            best_prio_score = score
            best_prio_keywords = found

    keyword_count = best_cat_score + best_prio_score
    pool_size = len([w for w in _normalize(text).split(' ') if w])
    confidence = min(keyword_count / max(math.sqrt(pool_size), 1.0), 1.0) if pool_size > 0 else 0.5
    confidence = round(confidence, 2)

    return {
        "category": best_cat,
        "priority": best_prio,
        "confidence": confidence,
        "keywords": best_cat_keywords + best_prio_keywords,
        "suggestedDepartment": CATEGORY_TO_DEPARTMENT[best_cat],
    }

async def classify_with_ml(
    text: str,
    complaint_id: Optional[str] = None,
    location: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    base_url = settings.ML_SERVICE_URL.rstrip('/')
    if not base_url:
        return None

    try:
        async with httpx.AsyncClient(timeout=settings.ML_SERVICE_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{base_url}/api/v1/analyze",
                json={
                    "text": text[:2000],
                    "complaint_id": complaint_id,
                    "location": location,
                    "user_id": user_id,
                },
            )
            if resp.status_code != 200:
                return None
            body = resp.json()
            if body.get("status") == "error" or not isinstance(body.get("category"), str):
                return None

            raw_cat = body.get("category", "")
            mapped_cat = ML_CATEGORY_TO_BACKEND.get(raw_cat)
            if not mapped_cat:
                return None

            raw_prio = body.get("priority", "Medium")
            mapped_prio = ML_PRIORITY_TO_BACKEND.get(raw_prio, Priority.MEDIUM)
            confidence = float(body.get("priority_confidence") or body.get("category_confidence") or 0.8)

            return {
                "category": mapped_cat["category"],
                "priority": mapped_prio,
                "confidence": confidence,
                "keywords": body.get("keywords", []),
                "suggestedDepartment": mapped_cat["department"],
                "summary": body.get("summary"),
                "predictionReason": body.get("prediction_reason"),
                "isDuplicate": body.get("is_duplicate", False),
                "duplicateSimilarity": body.get("duplicate_similarity", 0.0),
                "modelVersion": body.get("model_version"),
            }
    except Exception:
        return None
