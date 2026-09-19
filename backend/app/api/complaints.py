import os
import uuid
import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.models.complaint import Complaint
from app.models.enums import Role, ComplaintStatus, Priority, EscalationLevel
from app.schemas.complaint import (
    ComplaintUpdateRequest,
    ChangeStatusRequest,
    AssignRequest,
    CommentRequest,
    EscalateRequest,
    ChangePriorityRequest,
    ResolveComplaintRequest,
    ReopenComplaintRequest,
)
from app.services.complaint_service import (
    create_complaint,
    format_complaint,
    get_complaints_query,
    update_complaint_status,
    assign_complaint,
    add_comment_to_complaint,
    escalate_complaint,
    recommend_agents,
    TERMINAL_STATUSES,
)
from app.services.analytics_service import get_complaint_stats
from app.utils.response import success_response, is_complaint_overdue

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    size = 0
    with open(filepath, "wb") as f:
        content = file.file.read()
        f.write(content)
        size = len(content)
    file_url = f"/uploads/{filename}"
    return filename, file_url, size

@router.get("")
def list_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    departmentId: Optional[str] = None,
    assignedToId: Optional[str] = None,
    assignedAgentId: Optional[str] = None,
    customerId: Optional[str] = None,
    userId: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assigned_id = assignedToId or assignedAgentId
    cust_id = customerId or userId
    query = get_complaints_query(
        db=db,
        user=current_user,
        status=status,
        category=category,
        priority=priority,
        search=search,
        department_id=departmentId,
        assigned_to_id=assigned_id,
        customer_id=cust_id,
    )
    total = query.count()
    offset = (page - 1) * limit
    complaints = query.offset(offset).limit(limit).all()

    data = [format_complaint(c, include_details=False) for c in complaints]
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return success_response(
        "Complaints fetched",
        data,
        pagination={
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        },
    )

@router.get("/stats")
def complaint_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats = get_complaint_stats(db)
    return success_response("Complaint stats fetched", stats)

@router.get("/assigned")
def list_assigned(
    page: int = 1,
    limit: int = 10,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    query = get_complaints_query(
        db=db,
        user=current_user,
        assigned_to_id=current_user.id if current_user.role == Role.STAFF else None,
    )
    total = query.count()
    offset = (page - 1) * limit
    complaints = query.offset(offset).limit(limit).all()
    data = [format_complaint(c, include_details=False) for c in complaints]
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return success_response(
        "Assigned complaints fetched",
        data,
        pagination={
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        },
    )

@router.get("/overdue")
def list_overdue(
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaints = db.query(Complaint).filter(~Complaint.status.in_(TERMINAL_STATUSES)).all()
    overdue_complaints = [c for c in complaints if is_complaint_overdue(c.createdAt, c.status, c.priority)]
    data = [format_complaint(c, include_details=False) for c in overdue_complaints]
    return success_response("Overdue complaints fetched", data)

@router.get("/{id}")
def get_complaint_by_id(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Authorize access
    if current_user.role == Role.USER and complaint.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")

    return success_response("Complaint fetched", format_complaint(complaint, include_details=True))

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_new_complaint(
    title: str = Form(...),
    description: str = Form(...),
    category: Optional[str] = Form(None),
    subcategory: Optional[str] = Form(None),
    priority: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    attachments: Optional[List[UploadFile]] = File(None),
    image: Optional[List[UploadFile]] = File(None),
    document: Optional[List[UploadFile]] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attachments_data = []
    primary_image_url = None
    primary_doc_url = None

    all_files = (attachments or []) + (image or []) + (document or [])
    for file in all_files:
        if file and file.filename:
            fname, furl, fsize = save_upload_file(file)
            content_type = file.content_type
            attachments_data.append({
                "fileName": file.filename,
                "fileUrl": furl,
                "fileType": content_type,
                "fileSize": fsize,
            })
            if not primary_image_url and content_type and content_type.startswith("image/"):
                primary_image_url = furl
            elif not primary_doc_url and content_type and not content_type.startswith("image/"):
                primary_doc_url = furl

    complaint = await create_complaint(
        db=db,
        user_id=current_user.id,
        title=title.strip(),
        description=description.strip(),
        category=category,
        subcategory=subcategory,
        priority=priority,
        location=location,
        latitude=latitude,
        longitude=longitude,
        image_url=primary_image_url,
        document_url=primary_doc_url,
        attachments_data=attachments_data,
    )

    return success_response(
        "Complaint submitted successfully",
        format_complaint(complaint, include_details=True),
        201,
    )

@router.put("/{id}")
def update_complaint(
    id: str,
    payload: ComplaintUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user.role == Role.USER and complaint.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this complaint")

    if payload.title is not None:
        complaint.title = payload.title.strip()
    if payload.description is not None:
        complaint.description = payload.description.strip()
    if payload.location is not None:
        complaint.location = payload.location.strip()
    if payload.latitude is not None:
        complaint.latitude = payload.latitude
    if payload.longitude is not None:
        complaint.longitude = payload.longitude
    if payload.subcategory is not None:
        complaint.subcategory = payload.subcategory.strip()

    db.commit()
    db.refresh(complaint)
    return success_response("Complaint updated", format_complaint(complaint))

@router.put("/{id}/priority")
def change_priority(
    id: str,
    payload: ChangePriorityRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.priority = payload.priority
    db.commit()
    db.refresh(complaint)
    return success_response("Priority updated", format_complaint(complaint))

@router.post("/{id}/status")
async def change_status(
    id: str,
    payload: ChangeStatusRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = await update_complaint_status(
        db=db,
        complaint=complaint,
        new_status=payload.status,
        user_id=current_user.id,
        comment=payload.comment,
    )
    return success_response("Status updated", format_complaint(updated))

@router.post("/{id}/assign")
async def assign_staff(
    id: str,
    payload: AssignRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = await assign_complaint(
        db=db,
        complaint=complaint,
        assigned_to_id=payload.assignedTo,
        assigned_by_id=current_user.id,
        department_id=payload.departmentId,
        reason=payload.reason,
    )
    return success_response("Complaint assigned successfully", format_complaint(updated))

@router.post("/{id}/comments")
async def add_comment(
    id: str,
    payload: CommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Authorize
    if current_user.role == Role.USER and complaint.userId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to comment on this complaint")

    is_internal = bool(payload.isInternal and current_user.role in [Role.STAFF, Role.ADMIN])
    comment = await add_comment_to_complaint(
        db=db,
        complaint=complaint,
        user=current_user,
        content=payload.content.strip(),
        is_internal=is_internal,
    )
    return success_response("Comment added", comment)

@router.post("/{id}/escalate")
async def escalate(
    id: str,
    payload: EscalateRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    escalation = await escalate_complaint(
        db=db,
        complaint=complaint,
        user_id=current_user.id,
        to_level=payload.toLevel,
        reason=payload.reason,
    )
    return success_response("Complaint escalated", {
        "id": escalation.id,
        "complaintId": escalation.complaintId,
        "toLevel": escalation.toLevel.value,
        "reason": escalation.reason,
        "createdAt": escalation.createdAt.isoformat() if escalation.createdAt else None,
    })

@router.post("/{id}/resolve")
async def resolve(
    id: str,
    payload: ResolveComplaintRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = await update_complaint_status(
        db=db,
        complaint=complaint,
        new_status=ComplaintStatus.RESOLVED,
        user_id=current_user.id,
        comment=payload.comment or "Complaint marked resolved",
    )
    return success_response("Complaint resolved", format_complaint(updated))

@router.post("/{id}/reopen")
async def reopen(
    id: str,
    payload: ReopenComplaintRequest,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = await update_complaint_status(
        db=db,
        complaint=complaint,
        new_status=ComplaintStatus.IN_PROGRESS,
        user_id=current_user.id,
        comment=payload.comment or "Complaint reopened",
    )
    return success_response("Complaint reopened", format_complaint(updated))

@router.get("/{id}/recommend-agents")
def get_recommendations(
    id: str,
    current_user: User = Depends(require_role(Role.STAFF, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    recommendations = recommend_agents(db, complaint)
    return success_response("Recommended agents fetched", recommendations)

@router.delete("/{id}")
def delete_complaint(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Only admin or creator of a submitted complaint can delete
    if current_user.role != Role.ADMIN:
        if complaint.userId != current_user.id or complaint.status != ComplaintStatus.SUBMITTED:
            raise HTTPException(status_code=403, detail="Not authorized to delete this complaint")

    db.delete(complaint)
    db.commit()
    return success_response("Complaint deleted successfully")
