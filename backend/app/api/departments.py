from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.models.department import Department
from app.models.complaint import Complaint
from app.models.enums import Role, ComplaintStatus
from app.utils.response import success_response

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("")
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).filter(Department.isActive == True).all()
    data = [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "contactEmail": d.contactEmail,
            "contactPhone": d.contactPhone,
            "isActive": d.isActive,
            "createdAt": d.createdAt.isoformat() if d.createdAt else None,
        }
        for d in departments
    ]
    return success_response("Departments fetched", data)

@router.get("/{id}/stats")
def department_stats(
    id: str,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    department = db.query(Department).filter(Department.id == id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    total = db.query(Complaint).filter(Complaint.departmentId == id).count()
    resolved = db.query(Complaint).filter(
        Complaint.departmentId == id,
        Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]),
    ).count()
    in_progress = db.query(Complaint).filter(
        Complaint.departmentId == id,
        Complaint.status == ComplaintStatus.IN_PROGRESS,
    ).count()
    open_count = db.query(Complaint).filter(
        Complaint.departmentId == id,
        Complaint.status.in_([ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW]),
    ).count()

    staff_count = db.query(User).filter(User.departmentId == id, User.role == Role.STAFF).count()

    return success_response("Department stats fetched", {
        "departmentId": department.id,
        "name": department.name,
        "totalComplaints": total,
        "resolvedComplaints": resolved,
        "inProgressComplaints": in_progress,
        "openComplaints": open_count,
        "staffCount": staff_count,
        "resolutionRate": round((resolved / total) * 100, 1) if total > 0 else 0.0,
    })
