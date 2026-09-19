from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.api.deps import require_role
from app.models.user import User
from app.models.complaint import Complaint
from app.models.enums import Role, ComplaintStatus, Priority
from app.services.complaint_service import format_complaint, TERMINAL_STATUSES
from app.utils.response import success_response, is_complaint_overdue

router = APIRouter(prefix="/agent", tags=["Agent"])

@router.get("/dashboard")
def agent_dashboard(
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    assigned = db.query(Complaint).filter(Complaint.assignedToId == current_user.id).all()
    open_assigned = [c for c in assigned if c.status not in TERMINAL_STATUSES]
    in_progress = [c for c in assigned if c.status == ComplaintStatus.IN_PROGRESS]
    resolved = [c for c in assigned if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]]
    critical = [c for c in open_assigned if c.priority == Priority.CRITICAL]
    overdue = [c for c in open_assigned if is_complaint_overdue(c.createdAt, c.status, c.priority)]

    recent_complaints = db.query(Complaint).filter(
        Complaint.assignedToId == current_user.id
    ).order_by(desc(Complaint.updatedAt)).limit(5).all()

    return success_response("Agent dashboard fetched", {
        "stats": {
            "assignedCount": len(assigned),
            "openCount": len(open_assigned),
            "inProgressCount": len(in_progress),
            "resolvedCount": len(resolved),
            "criticalCount": len(critical),
            "overdueCount": len(overdue),
        },
        "recentComplaints": [format_complaint(c, include_details=False) for c in recent_complaints],
    })
