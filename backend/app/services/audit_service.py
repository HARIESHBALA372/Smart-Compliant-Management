from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def record_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    log = AuditLog(
        userId=user_id,
        action=action,
        entityType=entity_type,
        entityId=entity_id,
        oldValue=old_value,
        newValue=new_value,
        ipAddress=ip_address,
        userAgent=user_agent,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
