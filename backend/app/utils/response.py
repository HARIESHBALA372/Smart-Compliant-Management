from datetime import datetime, timedelta
from typing import Any, Optional, Dict
from app.models.enums import ComplaintStatus, Priority

SLA_HOURS_BY_PRIORITY: Dict[str, int] = {
    "LOW": 7 * 24,       # 168 hours
    "MEDIUM": 5 * 24,    # 120 hours
    "HIGH": 2 * 24,      # 48 hours
    "CRITICAL": 24,      # 24 hours
}

def is_terminal_status(status: ComplaintStatus) -> bool:
    return status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED]

def is_complaint_overdue(created_at: datetime, status: ComplaintStatus, priority: Priority) -> bool:
    if is_terminal_status(status):
        return False
    priority_str = priority.value if hasattr(priority, "value") else str(priority)
    hours = SLA_HOURS_BY_PRIORITY.get(priority_str, 72)
    deadline = created_at + timedelta(hours=hours)
    return datetime.utcnow() > deadline

def get_sla_deadline(created_at: datetime, priority: Priority) -> datetime:
    priority_str = priority.value if hasattr(priority, "value") else str(priority)
    hours = SLA_HOURS_BY_PRIORITY.get(priority_str, 72)
    return created_at + timedelta(hours=hours)

def success_response(
    message: str,
    data: Any = None,
    pagination: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    res = {
        "success": True,
        "message": message,
        "data": data,
    }
    if pagination is not None:
        res["pagination"] = pagination
    return res

def error_response(message: str, error: Any = None) -> Dict[str, Any]:
    return {
        "success": False,
        "message": message,
        "error": error,
    }
