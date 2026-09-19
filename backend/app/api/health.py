import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.utils.response import success_response, error_response

router = APIRouter(prefix="", tags=["Health"])
start_time = time.time()

@router.get("/health")
def health():
    return success_response("Service is healthy", {
        "status": "ok",
        "uptime": round(time.time() - start_time, 2),
        "timestamp": datetime.utcnow().isoformat(),
    })

@router.get("/health/database")
def health_database(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return success_response("Database is healthy", {"status": "ok"})
    except Exception as e:
        return error_response("Database is unreachable", str(e))

@router.get("/health/redis")
def health_redis():
    return success_response("Redis is healthy (standalone mode)", {"status": "ok"})
