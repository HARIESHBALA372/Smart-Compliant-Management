import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_
from app.database import get_db
from app.api.deps import require_role
from app.models.user import User
from app.models.department import Department, ComplaintCategory
from app.models.sla import SlaRule
from app.models.audit import AuditLog
from app.models.complaint import Complaint, ComplaintEscalation
from app.models.enums import Role, Priority, EscalationLevel, ComplaintStatus
from app.schemas.admin import (
    UserCreateRequest,
    UserUpdateRequest,
    CategoryCreateRequest,
    CategoryUpdateRequest,
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    SLAUpdateItem,
)
from app.services.complaint_service import TERMINAL_STATUSES
from app.services.analytics_service import get_overview
from app.utils.security import hash_password
from app.utils.response import success_response, SLA_HOURS_BY_PRIORITY, is_complaint_overdue

router = APIRouter(prefix="/admin", tags=["Admin"])

def user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "role": u.role.value if hasattr(u.role, "value") else str(u.role),
        "departmentId": u.departmentId,
        "department": {"id": u.department.id, "name": u.department.name} if u.department else None,
        "isActive": u.isActive,
        "createdAt": u.createdAt.isoformat() if u.createdAt else None,
    }

def category_to_dict(c: ComplaintCategory) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "departmentId": c.departmentId,
        "departmentName": c.department.name if c.department else None,
        "defaultPriority": c.defaultPriority.value if hasattr(c.defaultPriority, "value") else str(c.defaultPriority),
        "isActive": c.isActive,
        "createdAt": c.createdAt.isoformat() if c.createdAt else None,
    }

def department_to_dict(d: Department) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "contactEmail": d.contactEmail,
        "contactPhone": d.contactPhone,
        "isActive": d.isActive,
        "createdAt": d.createdAt.isoformat() if d.createdAt else None,
    }

# ── Categories & Departments (Shared STAFF & ADMIN read) ──────────────

@router.get("/categories")
def list_categories(
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    categories = db.query(ComplaintCategory).options(joinedload(ComplaintCategory.department)).all()
    data = [category_to_dict(c) for c in categories]
    return success_response("Categories fetched", data)

@router.get("/departments")
def list_departments(
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    departments = db.query(Department).all()
    data = [department_to_dict(d) for d in departments]
    return success_response("Departments fetched", data)

# ── Admin Dashboard ───────────────────────────────────────────────────

@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    overview = get_overview(db)
    return success_response("Admin dashboard fetched", overview)

# ── Users Management ──────────────────────────────────────────────────

@router.get("/users")
def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(User).options(joinedload(User.department))
    if role:
        r_upper = role.upper()
        if r_upper in ("AGENT", "MANAGER", "STAFF"):
            target_role = Role.STAFF
        elif r_upper in ("CITIZEN", "CUSTOMER", "USER"):
            target_role = Role.USER
        elif r_upper in ("ADMIN", "SUPERADMIN"):
            target_role = Role.ADMIN
        elif r_upper in Role.__members__:
            target_role = Role[r_upper]
        else:
            target_role = None

        if target_role:
            query = query.filter(User.role == target_role)

    if search:
        s = f"%{search}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s), User.phone.ilike(s)))

    total = query.count()
    offset = (page - 1) * limit
    users = query.order_by(User.name.asc()).offset(offset).limit(limit).all()

    data = [user_to_dict(u) for u in users]
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return success_response(
        "Users fetched",
        data,
        pagination={"total": total, "page": page, "limit": limit, "totalPages": total_pages},
    )

@router.get("/users/{id}")
def get_user(
    id: str,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.query(User).options(joinedload(User.department)).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return success_response("User fetched", user_to_dict(user))

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="User with this email already exists")

    hashed = hash_password(payload.password)
    user = User(
        name=payload.name.strip(),
        email=email,
        password=hashed,
        phone=payload.phone.strip() if payload.phone else None,
        role=payload.role or Role.USER,
        departmentId=payload.departmentId,
        isActive=payload.isActive if payload.isActive is not None else True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if user.departmentId:
        user = db.query(User).options(joinedload(User.department)).filter(User.id == user.id).first()

    return success_response("User created", user_to_dict(user), 201)

@router.put("/users/{id}")
def update_user(
    id: str,
    payload: UserUpdateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.email is not None:
        user.email = payload.email.lower().strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    if payload.password is not None and payload.password.strip():
        user.password = hash_password(payload.password.strip())
    if payload.role is not None:
        user.role = payload.role
    if payload.departmentId is not None:
        user.departmentId = payload.departmentId
    if payload.isActive is not None:
        user.isActive = payload.isActive

    db.commit()
    db.refresh(user)
    if user.departmentId:
        user = db.query(User).options(joinedload(User.department)).filter(User.id == user.id).first()
    return success_response("User updated", user_to_dict(user))

@router.delete("/users/{id}")
def delete_user(
    id: str,
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")

    db.delete(user)
    db.commit()
    return success_response("User deleted successfully")

# ── SLA Rules ─────────────────────────────────────────────────────────

@router.get("/sla")
def get_sla(
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    rules = db.query(SlaRule).all()
    if not rules:
        # Fallback to standard SLA defaults
        return success_response("SLA configuration fetched", [
            {"id": "sla-1", "priority": "LOW", "responseHours": 24, "resolutionHours": 168},
            {"id": "sla-2", "priority": "MEDIUM", "responseHours": 12, "resolutionHours": 120},
            {"id": "sla-3", "priority": "HIGH", "responseHours": 4, "resolutionHours": 48},
            {"id": "sla-4", "priority": "CRITICAL", "responseHours": 1, "resolutionHours": 24},
        ])

    data = [
        {
            "id": r.id,
            "priority": r.priority.value if hasattr(r.priority, "value") else str(r.priority),
            "responseHours": r.responseHours,
            "resolutionHours": r.resolutionHours,
            "isActive": r.isActive,
        }
        for r in rules
    ]
    return success_response("SLA configuration fetched", data)

@router.put("/sla")
def update_sla(
    payload: List[SLAUpdateItem],
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    for item in payload:
        rule = db.query(SlaRule).filter(SlaRule.priority == item.priority).first()
        if rule:
            rule.responseHours = item.responseHours
            rule.resolutionHours = item.resolutionHours
        else:
            rule = SlaRule(
                priority=item.priority,
                responseHours=item.responseHours,
                resolutionHours=item.resolutionHours,
            )
            db.add(rule)
    db.commit()
    return success_response("SLA configuration updated successfully", get_sla(current_user, db)["data"])

# ── Audit Logs ────────────────────────────────────────────────────────

@router.get("/audit-logs")
def get_audit_logs(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    if search:
        s = f"%{search}%"
        query = query.filter(or_(AuditLog.action.ilike(s), AuditLog.entityType.ilike(s), AuditLog.ipAddress.ilike(s)))

    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(desc(AuditLog.createdAt)).offset(offset).limit(limit).all()

    data = [
        {
            "id": l.id,
            "userId": l.userId,
            "userName": l.user.name if l.user else "System",
            "action": l.action,
            "entityType": l.entityType,
            "entityId": l.entityId,
            "oldValue": l.oldValue,
            "newValue": l.newValue,
            "ipAddress": l.ipAddress,
            "userAgent": l.userAgent,
            "createdAt": l.createdAt.isoformat() if l.createdAt else None,
        }
        for l in logs
    ]
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return success_response(
        "Audit logs fetched",
        data,
        pagination={"total": total, "page": page, "limit": limit, "totalPages": total_pages},
    )

# ── Agents & Workloads ────────────────────────────────────────────────

@router.get("/agents")
def list_agents(
    search: Optional[str] = None,
    departmentId: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(User).options(joinedload(User.department)).filter(User.role == Role.STAFF, User.isActive == True)
    if departmentId:
        query = query.filter(User.departmentId == departmentId)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s)))

    total = query.count()
    offset = (page - 1) * limit
    agents = query.order_by(User.name.asc()).offset(offset).limit(limit).all()

    data = []
    for a in agents:
        complaints = db.query(Complaint).filter(Complaint.assignedToId == a.id).all()
        assigned = len(complaints)
        open_c = [c for c in complaints if c.status not in TERMINAL_STATUSES]
        in_progress = sum(1 for c in complaints if c.status == ComplaintStatus.IN_PROGRESS)
        waiting = sum(1 for c in complaints if c.status == ComplaintStatus.WAITING_FOR_USER)
        resolved_c = [c for c in complaints if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]]
        resolved = len(resolved_c)
        critical = sum(1 for c in open_c if c.priority == Priority.CRITICAL)
        overdue = sum(1 for c in open_c if is_complaint_overdue(c.createdAt, c.status, c.priority))

        # Resolution time
        resolved_times = [
            (c.resolvedAt - c.createdAt).total_seconds() / 3600.0
            for c in resolved_c
            if c.resolvedAt and c.createdAt
        ]
        avg_res_hours = round(sum(resolved_times) / len(resolved_times), 1) if resolved_times else 0.0

        # SLA compliance
        within_sla = sum(
            1 for c in resolved_c
            if c.resolvedAt and c.createdAt and (c.resolvedAt - c.createdAt).total_seconds() <= SLA_HOURS_BY_PRIORITY.get(c.priority.value if hasattr(c.priority, "value") else str(c.priority), 72) * 3600
        )
        sla_comp = round((within_sla / len(resolved_times)) * 100, 1) if resolved_times else 100.0

        data.append({
            "id": a.id,
            "name": a.name,
            "email": a.email,
            "phone": a.phone,
            "departmentId": a.departmentId,
            "department": {"id": a.department.id, "name": a.department.name} if a.department else None,
            "assigned": assigned,
            "open": len(open_c),
            "inProgress": in_progress,
            "waiting": waiting,
            "resolved": resolved,
            "critical": critical,
            "overdue": overdue,
            "avgResolutionHours": avg_res_hours,
            "slaCompliance": sla_comp,
        })

    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return success_response(
        "Agents fetched",
        data,
        pagination={"total": total, "page": page, "limit": limit, "totalPages": total_pages},
    )

# ── Escalations ───────────────────────────────────────────────────────

@router.get("/escalations")
def list_escalations(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(ComplaintEscalation).options(
        joinedload(ComplaintEscalation.complaint),
    )
    if status:
        if status.lower() == "resolved":
            query = query.filter(ComplaintEscalation.isResolved == True)
        elif status.lower() in ("pending", "open"):
            query = query.filter(ComplaintEscalation.isResolved == False)

    total = query.count()
    offset = (page - 1) * limit
    escalations = query.order_by(desc(ComplaintEscalation.createdAt)).offset(offset).limit(limit).all()

    data = [
        {
            "id": e.id,
            "complaintId": e.complaintId,
            "complaintNumber": e.complaint.complaintNumber if e.complaint else None,
            "complaintTitle": e.complaint.title if e.complaint else None,
            "fromLevel": e.fromLevel.value if e.fromLevel and hasattr(e.fromLevel, "value") else (str(e.fromLevel) if e.fromLevel else None),
            "toLevel": e.toLevel.value if hasattr(e.toLevel, "value") else str(e.toLevel),
            "reason": e.reason,
            "isResolved": e.isResolved,
            "resolvedAt": e.resolvedAt.isoformat() if e.resolvedAt else None,
            "createdAt": e.createdAt.isoformat() if e.createdAt else None,
        }
        for e in escalations
    ]
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return success_response(
        "Escalations fetched",
        data,
        pagination={"total": total, "page": page, "limit": limit, "totalPages": total_pages},
    )

# ── Categories CRUD ───────────────────────────────────────────────────

@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    cat = ComplaintCategory(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        departmentId=payload.departmentId,
        defaultPriority=payload.defaultPriority or Priority.MEDIUM,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    if cat.departmentId:
        cat = db.query(ComplaintCategory).options(joinedload(ComplaintCategory.department)).filter(ComplaintCategory.id == cat.id).first()
    return success_response("Category created", category_to_dict(cat), 201)

@router.put("/categories/{id}")
def update_category(
    id: str,
    payload: CategoryUpdateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    cat = db.query(ComplaintCategory).filter(ComplaintCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.name is not None:
        cat.name = payload.name.strip()
    if payload.description is not None:
        cat.description = payload.description.strip()
    if payload.departmentId is not None:
        cat.departmentId = payload.departmentId
    if payload.defaultPriority is not None:
        cat.defaultPriority = payload.defaultPriority
    if payload.isActive is not None:
        cat.isActive = payload.isActive

    db.commit()
    db.refresh(cat)
    if cat.departmentId:
        cat = db.query(ComplaintCategory).options(joinedload(ComplaintCategory.department)).filter(ComplaintCategory.id == cat.id).first()
    return success_response("Category updated", category_to_dict(cat))

@router.delete("/categories/{id}")
def delete_category(
    id: str,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    cat = db.query(ComplaintCategory).filter(ComplaintCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
    return success_response("Category deleted successfully")

# ── Departments CRUD ──────────────────────────────────────────────────

@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    dept = Department(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        contactEmail=payload.contactEmail,
        contactPhone=payload.contactPhone,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return success_response("Department created", department_to_dict(dept), 201)

@router.put("/departments/{id}")
def update_department(
    id: str,
    payload: DepartmentUpdateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.description is not None:
        dept.description = payload.description.strip()
    if payload.contactEmail is not None:
        dept.contactEmail = payload.contactEmail
    if payload.contactPhone is not None:
        dept.contactPhone = payload.contactPhone
    if payload.isActive is not None:
        dept.isActive = payload.isActive

    db.commit()
    db.refresh(dept)
    return success_response("Department updated", department_to_dict(dept))

@router.delete("/departments/{id}")
def delete_department(
    id: str,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return success_response("Department deleted successfully")
