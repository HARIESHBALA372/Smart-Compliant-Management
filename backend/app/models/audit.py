from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.id_generator import generate_id

class AuditLog(Base):
    __tablename__ = "AuditLog"

    id = Column(String, primary_key=True, default=generate_id)
    userId = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String, nullable=False)
    entityType = Column(String, nullable=False)
    entityId = Column(String, nullable=True)
    oldValue = Column(JSON, nullable=True)
    newValue = Column(JSON, nullable=True)
    ipAddress = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")
