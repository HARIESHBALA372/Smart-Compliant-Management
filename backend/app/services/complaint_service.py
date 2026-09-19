from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func
from app.models.complaint import Complaint, ComplaintAttachment, ComplaintUpdate, ComplaintAssignment, ComplaintEscalation
from app.models.department import Department
from app.models.user import User
from app.models.feedback import Feedback
from app.models.enums import ComplaintStatus, Priority, Category, EscalationLevel, Role, NotificationType
from app.utils.id_generator import generate_complaint_number
from app.utils.response import get_sla_deadline, is_complaint_overdue, is_terminal_status, SLA_HOURS_BY_PRIORITY
from app.services.ml_client import department_for_category, fallback_classify_complaint, classify_with_ml
from app.services.notification_service import create_notification, notify_many, get_admin_and_staff_ids
from app.services.websocket_manager import ws_manager

TERMINAL_STATUSES = [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.REJECTED]

def find_or_create_department(db: Session, name: str) -> Department:
    dept = db.query(Department).filter(Department.name == name).first()
    if not dept:
        dept = Department(name=name)
        db.add(dept)
        db.commit()
        db.refresh(dept)
    return dept

def format_complaint(c: Complaint, include_details: bool = True) -> Dict[str, Any]:
    cat_str = c.category.value if hasattr(c.category, "value") else str(c.category)
    prio_str = c.priority.value if hasattr(c.priority, "value") else str(c.priority)
    stat_str = c.status.value if hasattr(c.status, "value") else str(c.status)
    ai_cat_str = c.aiCategory.value if c.aiCategory and hasattr(c.aiCategory, "value") else (str(c.aiCategory) if c.aiCategory else None)
    ai_prio_str = c.aiPriority.value if c.aiPriority and hasattr(c.aiPriority, "value") else (str(c.aiPriority) if c.aiPriority else None)

    user_dict = None
    if c.user:
        user_dict = {
            "id": c.user.id,
            "name": c.user.name,
            "email": c.user.email,
            "phone": c.user.phone,
            "role": c.user.role.value if hasattr(c.user.role, "value") else str(c.user.role),
        }

    assigned_dict = None
    if c.assignedTo:
        assigned_dict = {
            "id": c.assignedTo.id,
            "name": c.assignedTo.name,
            "email": c.assignedTo.email,
            "phone": c.assignedTo.phone,
            "role": c.assignedTo.role.value if hasattr(c.assignedTo.role, "value") else str(c.assignedTo.role),
        }

    dept_dict = None
    if c.department:
        dept_dict = {
            "id": c.department.id,
            "name": c.department.name,
            "description": c.department.description,
        }

    data: Dict[str, Any] = {
        "id": c.id,
        "complaintNumber": c.complaintNumber,
        "complaintId": c.complaintNumber,
        "title": c.title,
        "description": c.description,
        "category": cat_str,
        "subcategory": c.subcategory,
        "priority": prio_str,
        "severityScore": c.severityScore,
        "status": stat_str,
        "location": c.location,
        "latitude": c.latitude,
        "longitude": c.longitude,
        "aiCategory": ai_cat_str,
        "aiPriority": ai_prio_str,
        "aiConfidence": c.aiConfidence,
        "imageUrl": c.imageUrl,
        "documentUrl": c.documentUrl,
        "userId": c.userId,
        "customerId": c.userId,
        "assignedToId": c.assignedToId,
        "assignedAgentId": c.assignedToId,
        "departmentId": c.departmentId,
        "createdAt": c.createdAt.isoformat() if c.createdAt else None,
        "updatedAt": c.updatedAt.isoformat() if c.updatedAt else None,
        "assignedAt": c.assignedAt.isoformat() if c.assignedAt else None,
        "resolvedAt": c.resolvedAt.isoformat() if c.resolvedAt else None,
        "closedAt": c.closedAt.isoformat() if c.closedAt else None,
        "reopenedAt": c.reopenedAt.isoformat() if c.reopenedAt else None,
        "slaDeadline": get_sla_deadline(c.createdAt, c.priority).isoformat() if c.createdAt else None,
        "isOverdue": is_complaint_overdue(c.createdAt, c.status, c.priority),
        "user": user_dict,
        "customer": user_dict,
        "assignedTo": assigned_dict,
        "assignedAgent": assigned_dict,
        "department": dept_dict,
    }

    if include_details:
        data["attachments"] = [
            {
                "id": a.id,
                "complaintId": a.complaintId,
                "fileName": a.fileName,
                "fileUrl": a.fileUrl,
                "fileType": a.fileType,
                "fileSize": a.fileSize,
                "uploadedBy": a.uploadedBy,
                "createdAt": a.createdAt.isoformat() if a.createdAt else None,
            }
            for a in (c.attachments or [])
        ]
        
        # Format comments from updates that have non-empty comments
        comments = []
        updates = []
        for u in (c.updates or []):
            u_user = {
                "id": u.user.id,
                "name": u.user.name,
                "role": u.user.role.value if hasattr(u.user.role, "value") else str(u.user.role),
            } if u.user else None
            
            updates.append({
                "id": u.id,
                "oldStatus": u.oldStatus.value if u.oldStatus and hasattr(u.oldStatus, "value") else (str(u.oldStatus) if u.oldStatus else None),
                "newStatus": u.newStatus.value if hasattr(u.newStatus, "value") else str(u.newStatus),
                "comment": u.comment,
                "isInternal": u.isInternal,
                "createdAt": u.createdAt.isoformat() if u.createdAt else None,
                "user": u_user,
            })
            if u.comment:
                comments.append({
                    "id": u.id,
                    "complaintId": u.complaintId,
                    "userId": u.userId,
                    "author": u_user,
                    "authorName": u.user.name if u.user else "System",
                    "content": u.comment,
                    "isInternal": u.isInternal,
                    "createdAt": u.createdAt.isoformat() if u.createdAt else None,
                })
        data["updates"] = updates
        data["comments"] = comments

        if c.feedback:
            data["feedback"] = {
                "id": c.feedback.id,
                "rating": c.feedback.rating,
                "comment": c.feedback.comment,
                "createdAt": c.feedback.createdAt.isoformat() if c.feedback.createdAt else None,
            }

    return data

async def create_complaint(
    db: Session,
    user_id: str,
    title: str,
    description: str,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    priority: Optional[str] = None,
    location: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    image_url: Optional[str] = None,
    document_url: Optional[str] = None,
    attachments_data: Optional[List[Dict[str, Any]]] = None,
) -> Complaint:
    # 1. Classification (call ML service with graceful fallback)
    ml_result = await classify_with_ml(f"{title} {description}")
    if not ml_result:
        ml_result = fallback_classify_complaint(title, description)

    final_cat = Category(category.upper()) if category else ml_result["category"]
    final_prio = Priority(priority.upper()) if priority else ml_result["priority"]
    dept_name = ml_result.get("suggestedDepartment") or department_for_category(final_cat)
    department = find_or_create_department(db, dept_name)

    complaint_no = generate_complaint_number()

    complaint = Complaint(
        complaintNumber=complaint_no,
        title=title,
        description=description,
        category=final_cat,
        subcategory=subcategory,
        priority=final_prio,
        status=ComplaintStatus.SUBMITTED,
        location=location,
        latitude=latitude,
        longitude=longitude,
        aiCategory=ml_result.get("category"),
        aiPriority=ml_result.get("priority"),
        aiConfidence=ml_result.get("confidence"),
        imageUrl=image_url,
        documentUrl=document_url,
        userId=user_id,
        departmentId=department.id,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Initial update record
    update = ComplaintUpdate(
        complaintId=complaint.id,
        userId=user_id,
        oldStatus=None,
        newStatus=ComplaintStatus.SUBMITTED,
        comment="Complaint submitted",
        isInternal=False,
    )
    db.add(update)

    # Add attachments if any
    if attachments_data:
        for att in attachments_data:
            c_att = ComplaintAttachment(
                complaintId=complaint.id,
                fileName=att.get("fileName", "attachment"),
                fileUrl=att.get("fileUrl", ""),
                fileType=att.get("fileType"),
                fileSize=att.get("fileSize", 0),
                uploadedBy=user_id,
            )
            db.add(c_att)

    db.commit()
    db.refresh(complaint)

    # Notify staff & admins
    recipients = get_admin_and_staff_ids(db, department.id)
    await notify_many(
        db=db,
        user_ids=recipients,
        title="New Complaint Submitted",
        message=f"New complaint #{complaint.complaintNumber}: {complaint.title}",
        notif_type=NotificationType.COMPLAINT_CREATED,
        complaint_id=complaint.id,
    )

    # User confirmation notification
    await create_notification(
        db=db,
        user_id=user_id,
        title="Complaint Submitted Successfully",
        message=f"Your complaint #{complaint.complaintNumber} has been received and routed to {dept_name}.",
        notif_type=NotificationType.COMPLAINT_CREATED,
        complaint_id=complaint.id,
    )

    await ws_manager.notify_analytics_update()
    return complaint

def get_complaints_query(
    db: Session,
    user: User,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    assigned_to_id: Optional[str] = None,
    customer_id: Optional[str] = None,
):
    query = db.query(Complaint).options(
        joinedload(Complaint.user),
        joinedload(Complaint.assignedTo),
        joinedload(Complaint.department),
        joinedload(Complaint.attachments),
        joinedload(Complaint.updates).joinedload(ComplaintUpdate.user),
        joinedload(Complaint.feedback),
    )

    # Scoping by role
    if user.role == Role.USER:
        query = query.filter(Complaint.userId == user.id)
    elif user.role == Role.STAFF:
        # Staff can see complaints assigned to them or in their department
        if user.departmentId:
            query = query.filter((Complaint.assignedToId == user.id) | (Complaint.departmentId == user.departmentId))
        elif assigned_to_id:
            query = query.filter(Complaint.assignedToId == assigned_to_id)

    if status:
        statuses = [s.strip().upper() for s in status.split(",") if s.strip()]
        valid_statuses = [ComplaintStatus(s) for s in statuses if s in ComplaintStatus.__members__]
        if valid_statuses:
            query = query.filter(Complaint.status.in_(valid_statuses))

    if category:
        categories = [c.strip().upper() for c in category.split(",") if c.strip()]
        valid_cats = [Category(c) for c in categories if c in Category.__members__]
        if valid_cats:
            query = query.filter(Complaint.category.in_(valid_cats))

    if priority:
        priorities = [p.strip().upper() for p in priority.split(",") if p.strip()]
        valid_prios = [Priority(p) for p in priorities if p in Priority.__members__]
        if valid_prios:
            query = query.filter(Complaint.priority.in_(valid_prios))

    if department_id:
        query = query.filter(Complaint.departmentId == department_id)

    if assigned_to_id:
        query = query.filter(Complaint.assignedToId == assigned_to_id)

    if customer_id:
        query = query.filter(Complaint.userId == customer_id)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Complaint.title.ilike(s),
                Complaint.description.ilike(s),
                Complaint.complaintNumber.ilike(s),
                Complaint.location.ilike(s),
            )
        )

    return query.order_by(desc(Complaint.createdAt))

async def update_complaint_status(
    db: Session,
    complaint: Complaint,
    new_status: ComplaintStatus,
    user_id: str,
    comment: Optional[str] = None,
) -> Complaint:
    old_status = complaint.status
    complaint.status = new_status
    now = datetime.utcnow()
    complaint.updatedAt = now

    if new_status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
        complaint.resolvedAt = now
    if new_status == ComplaintStatus.CLOSED:
        complaint.closedAt = now
    if new_status == ComplaintStatus.IN_PROGRESS and old_status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
        complaint.reopenedAt = now

    update = ComplaintUpdate(
        complaintId=complaint.id,
        userId=user_id,
        oldStatus=old_status,
        newStatus=new_status,
        comment=comment or f"Status changed to {new_status.value}",
        isInternal=False,
    )
    db.add(update)
    db.commit()
    db.refresh(complaint)

    # Notify complaint owner
    await create_notification(
        db=db,
        user_id=complaint.userId,
        title="Complaint Status Updated",
        message=f"Complaint #{complaint.complaintNumber} updated to {new_status.value}. {comment or ''}".strip(),
        notif_type=NotificationType.STATUS_UPDATED,
        complaint_id=complaint.id,
    )

    await ws_manager.notify_analytics_update()
    return complaint

async def assign_complaint(
    db: Session,
    complaint: Complaint,
    assigned_to_id: str,
    assigned_by_id: str,
    department_id: Optional[str] = None,
    reason: Optional[str] = None,
) -> Complaint:
    complaint.assignedToId = assigned_to_id
    complaint.assignedAt = datetime.utcnow()
    if department_id:
        complaint.departmentId = department_id
    if complaint.status == ComplaintStatus.SUBMITTED:
        complaint.status = ComplaintStatus.UNDER_REVIEW

    assignment = ComplaintAssignment(
        complaintId=complaint.id,
        assignedTo=assigned_to_id,
        assignedBy=assigned_by_id,
        departmentId=department_id or complaint.departmentId,
        reason=reason,
    )
    db.add(assignment)

    update = ComplaintUpdate(
        complaintId=complaint.id,
        userId=assigned_by_id,
        oldStatus=complaint.status,
        newStatus=complaint.status,
        comment=f"Assigned to staff. Reason: {reason or 'Direct assignment'}",
        isInternal=False,
    )
    db.add(update)
    db.commit()
    db.refresh(complaint)

    # Notify assignee
    await create_notification(
        db=db,
        user_id=assigned_to_id,
        title="New Complaint Assigned",
        message=f"You have been assigned ticket #{complaint.complaintNumber}: {complaint.title}",
        notif_type=NotificationType.COMPLAINT_ASSIGNED,
        complaint_id=complaint.id,
    )

    # Notify citizen
    await create_notification(
        db=db,
        user_id=complaint.userId,
        title="Agent Assigned to Your Complaint",
        message=f"A support agent has been assigned to investigate #{complaint.complaintNumber}.",
        notif_type=NotificationType.COMPLAINT_ASSIGNED,
        complaint_id=complaint.id,
    )

    await ws_manager.notify_analytics_update()
    return complaint

async def add_comment_to_complaint(
    db: Session,
    complaint: Complaint,
    user: User,
    content: str,
    is_internal: bool = False,
) -> Dict[str, Any]:
    update = ComplaintUpdate(
        complaintId=complaint.id,
        userId=user.id,
        oldStatus=complaint.status,
        newStatus=complaint.status,
        comment=content,
        isInternal=is_internal,
    )
    db.add(update)
    db.commit()
    db.refresh(update)

    # If public comment by staff, notify user; if public comment by user, notify assigned staff
    if not is_internal:
        if user.id == complaint.userId:
            if complaint.assignedToId:
                await create_notification(
                    db=db,
                    user_id=complaint.assignedToId,
                    title="New Customer Comment",
                    message=f"Citizen commented on #{complaint.complaintNumber}: {content[:80]}",
                    notif_type=NotificationType.COMMENT_ADDED,
                    complaint_id=complaint.id,
                )
        else:
            await create_notification(
                db=db,
                user_id=complaint.userId,
                title="New Comment on Your Complaint",
                message=f"Update on #{complaint.complaintNumber}: {content[:80]}",
                notif_type=NotificationType.COMMENT_ADDED,
                complaint_id=complaint.id,
            )

    return {
        "id": update.id,
        "complaintId": update.complaintId,
        "userId": update.userId,
        "author": {
            "id": user.id,
            "name": user.name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        },
        "authorName": user.name,
        "content": content,
        "isInternal": is_internal,
        "createdAt": update.createdAt.isoformat() if update.createdAt else None,
    }

async def escalate_complaint(
    db: Session,
    complaint: Complaint,
    user_id: str,
    to_level: EscalationLevel,
    reason: Optional[str] = None,
) -> ComplaintEscalation:
    escalation = ComplaintEscalation(
        complaintId=complaint.id,
        escalatedBy=user_id,
        toLevel=to_level,
        reason=reason,
    )
    db.add(escalation)

    update = ComplaintUpdate(
        complaintId=complaint.id,
        userId=user_id,
        oldStatus=complaint.status,
        newStatus=complaint.status,
        comment=f"Ticket escalated to {to_level.value}. Reason: {reason or 'SLA / Urgent escalation'}",
        isInternal=False,
    )
    db.add(update)
    db.commit()
    db.refresh(escalation)

    # Notify admins
    admins = [row[0] for row in db.query(User.id).filter(User.role == Role.ADMIN, User.isActive == True).all()]
    await notify_many(
        db=db,
        user_ids=admins,
        title="Complaint Escalated",
        message=f"Complaint #{complaint.complaintNumber} escalated to {to_level.value}: {reason or ''}".strip(),
        notif_type=NotificationType.COMPLAINT_ESCALATED,
        complaint_id=complaint.id,
        priority=NotificationPriority.CRITICAL,
    )

    await ws_manager.notify_analytics_update()
    return escalation

def recommend_agents(db: Session, complaint: Complaint, limit: int = 5) -> List[Dict[str, Any]]:
    candidates = db.query(User).options(joinedload(User.department)).filter(
        User.role == Role.STAFF,
        User.isActive == True,
    ).all()

    recommendations = []
    for cand in candidates:
        open_count = db.query(Complaint).filter(
            Complaint.assignedToId == cand.id,
            ~Complaint.status.in_(TERMINAL_STATUSES),
        ).count()
        resolved_count = db.query(Complaint).filter(
            Complaint.assignedToId == cand.id,
            Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]),
        ).count()

        score = 0
        reasons = []

        if cand.id == complaint.assignedToId:
            score += 20
            reasons.append("currently assigned")
        if complaint.departmentId and cand.departmentId == complaint.departmentId:
            score += 10
            reasons.append("same department")
        else:
            score -= 4
            reasons.append("different department")

        if open_count <= 3:
            score += 5
            reasons.append("available")
        elif open_count >= 8:
            score -= 5
            reasons.append("heavy workload")

        if resolved_count > 10:
            score += 3
            reasons.append("high resolution rate")

        recommendations.append({
            "agentId": cand.id,
            "name": cand.name,
            "email": cand.email,
            "departmentId": cand.departmentId,
            "departmentName": cand.department.name if cand.department else None,
            "openComplaints": open_count,
            "resolvedCount": resolved_count,
            "score": score,
            "reason": ", ".join(reasons),
        })

    recommendations.sort(key=lambda r: r["score"], reverse=True)
    return recommendations[:limit]
