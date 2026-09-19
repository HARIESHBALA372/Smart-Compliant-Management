import math
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User, NotificationPreferences
from app.models.notification import Notification
from app.models.enums import Role, NotificationType, NotificationPriority
from app.schemas.notification import NotificationPreferencesUpdateRequest, AnnouncementRequest
from app.services.notification_service import notify_many
from app.utils.response import success_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def format_notification(n: Notification):
    return {
        "id": n.id,
        "userId": n.userId,
        "complaintId": n.complaintId,
        "type": n.type.value if hasattr(n.type, "value") else str(n.type),
        "title": n.title,
        "message": n.message,
        "channel": n.channel.value if hasattr(n.channel, "value") else str(n.channel),
        "priority": n.priority.value if hasattr(n.priority, "value") else str(n.priority),
        "metadata": n.metadata_json,
        "isRead": n.isRead,
        "completed": n.completed,
        "createdAt": n.createdAt.isoformat() if n.createdAt else None,
        "readAt": n.readAt.isoformat() if n.readAt else None,
        "completedAt": n.completedAt.isoformat() if n.completedAt else None,
    }

@router.get("")
def list_notifications(
    unread: Optional[bool] = None,
    type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.userId == current_user.id)
    if unread:
        query = query.filter(Notification.isRead == False)
    if type:
        query = query.filter(Notification.type == type)

    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.userId == current_user.id,
        Notification.isRead == False,
    ).count()

    offset = (page - 1) * limit
    notifications = query.order_by(desc(Notification.createdAt)).offset(offset).limit(limit).all()
    data = [format_notification(n) for n in notifications]
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return success_response(
        "Notifications fetched",
        data,
        pagination={
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
            "unreadCount": unread_count,
        },
    )

@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Notification).filter(
        Notification.userId == current_user.id,
        Notification.isRead == False,
    ).count()
    return success_response("Unread count fetched", {"unreadCount": count})

@router.get("/preferences")
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = db.query(NotificationPreferences).filter(NotificationPreferences.userId == current_user.id).first()
    if not prefs:
        prefs = NotificationPreferences(userId=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return success_response("Notification preferences fetched", {
        "id": prefs.id,
        "userId": prefs.userId,
        "complaintStatusUpdates": prefs.complaintStatusUpdates,
        "complaintAssignment": prefs.complaintAssignment,
        "complaintResolution": prefs.complaintResolution,
        "commentNotifications": prefs.commentNotifications,
        "slaAlerts": prefs.slaAlerts,
        "emailNotifications": prefs.emailNotifications,
        "inAppNotifications": prefs.inAppNotifications,
        "announcements": prefs.announcements,
        "feedbackRequests": prefs.feedbackRequests,
    })

@router.put("/preferences")
def update_preferences(
    payload: NotificationPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prefs = db.query(NotificationPreferences).filter(NotificationPreferences.userId == current_user.id).first()
    if not prefs:
        prefs = NotificationPreferences(userId=current_user.id)
        db.add(prefs)

    for field, val in payload.dict(exclude_unset=True).items():
        setattr(prefs, field, val)

    db.commit()
    db.refresh(prefs)

    return success_response("Preferences updated", {
        "id": prefs.id,
        "userId": prefs.userId,
        "complaintStatusUpdates": prefs.complaintStatusUpdates,
        "complaintAssignment": prefs.complaintAssignment,
        "complaintResolution": prefs.complaintResolution,
        "commentNotifications": prefs.commentNotifications,
        "slaAlerts": prefs.slaAlerts,
        "emailNotifications": prefs.emailNotifications,
        "inAppNotifications": prefs.inAppNotifications,
        "announcements": prefs.announcements,
        "feedbackRequests": prefs.feedbackRequests,
    })

@router.post("/announce")
async def announce(
    payload: AnnouncementRequest,
    current_user: User = Depends(require_role(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    user_ids = [row[0] for row in db.query(User.id).filter(User.isActive == True).all()]
    prio = NotificationPriority.IMPORTANT if payload.priority == "IMPORTANT" else NotificationPriority.NORMAL

    await notify_many(
        db=db,
        user_ids=user_ids,
        title=payload.title,
        message=payload.message,
        notif_type=NotificationType.ADMIN_ANNOUNCEMENT,
        priority=prio,
    )
    return success_response("Announcement broadcasted successfully")

@router.put("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.userId == current_user.id,
        Notification.isRead == False,
    ).update({"isRead": True, "readAt": datetime.utcnow()})
    db.commit()
    return success_response("All notifications marked as read")

@router.put("/{id}/read")
def mark_one_read(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.userId == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.isRead = True
    notif.readAt = datetime.utcnow()
    db.commit()
    return success_response("Notification marked as read", format_notification(notif))

@router.put("/{id}/complete")
def complete_one(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.userId == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.completed = True
    notif.completedAt = datetime.utcnow()
    db.commit()
    return success_response("Notification completed", format_notification(notif))

@router.delete("/{id}")
def delete_notification(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == id, Notification.userId == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notif)
    db.commit()
    return success_response("Notification deleted successfully")
