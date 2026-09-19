from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.models.complaint import Complaint
from app.models.enums import Role
from app.services.analytics_service import get_overview, get_trends, get_category_analytics
from app.services.complaint_service import format_complaint, TERMINAL_STATUSES
from app.utils.response import success_response, is_complaint_overdue

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def dashboard_summary(
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    overview = get_overview(db)
    trends = get_trends(db, days=7)
    categories = get_category_analytics(db)

    return success_response("Dashboard summary fetched", {
        "overview": overview,
        "trends": trends,
        "categories": categories,
    })

@router.get("/overdue")
def dashboard_overdue(
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaints = db.query(Complaint).filter(~Complaint.status.in_(TERMINAL_STATUSES)).all()
    overdue_complaints = [c for c in complaints if is_complaint_overdue(c.createdAt, c.status, c.priority)]
    data = [format_complaint(c, include_details=False) for c in overdue_complaints]
    return success_response("Overdue complaints fetched", data)
