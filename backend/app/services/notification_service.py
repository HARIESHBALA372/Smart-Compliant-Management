from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from app.models.enums import NotificationType, NotificationChannel, NotificationPriority, Role
from app.services.websocket_manager import ws_manager

async def create_notification(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    notif_type: NotificationType = NotificationType.COMPLAINT_CREATED,
    complaint_id: Optional[str] = None,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    metadata_json: Optional[Dict[str, Any]] = None,
) -> Notification:
    notif = Notification(
        userId=user_id,
        complaintId=complaint_id,
        type=notif_type,
        title=title,
        message=message,
        channel=channel,
        priority=priority,
        metadata_json=metadata_json,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push to WebSocket
    payload = {
        "id": notif.id,
        "userId": notif.userId,
        "complaintId": notif.complaintId,
        "type": notif.type.value if hasattr(notif.type, "value") else str(notif.type),
        "title": notif.title,
        "message": notif.message,
        "channel": notif.channel.value if hasattr(notif.channel, "value") else str(notif.channel),
        "priority": notif.priority.value if hasattr(notif.priority, "value") else str(notif.priority),
        "metadata": notif.metadata_json,
        "isRead": notif.isRead,
        "completed": notif.completed,
        "createdAt": notif.createdAt.isoformat() if notif.createdAt else None,
    }
    await ws_manager.notify_user(user_id, payload)
    return notif

async def notify_many(
    db: Session,
    user_ids: List[str],
    title: str,
    message: str,
    notif_type: NotificationType = NotificationType.COMPLAINT_CREATED,
    complaint_id: Optional[str] = None,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    metadata_json: Optional[Dict[str, Any]] = None,
):
    for uid in set(user_ids):
        await create_notification(
            db=db,
            user_id=uid,
            title=title,
            message=message,
            notif_type=notif_type,
            complaint_id=complaint_id,
            channel=channel,
            priority=priority,
            metadata_json=metadata_json,
        )

def get_admin_and_staff_ids(db: Session, department_id: Optional[str] = None) -> List[str]:
    query = db.query(User.id).filter(User.isActive == True)
    if department_id:
        query = query.filter((User.role == Role.ADMIN) | ((User.role == Role.STAFF) & (User.departmentId == department_id)))
    else:
        query = query.filter(User.role.in_([Role.ADMIN, Role.STAFF]))
    return [row[0] for row in query.all()]
