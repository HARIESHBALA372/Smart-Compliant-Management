from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.id_generator import generate_id
from app.models.enums import NotificationType, NotificationChannel, NotificationPriority

class Notification(Base):
    __tablename__ = "Notification"

    id = Column(String, primary_key=True, default=generate_id)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    complaintId = Column(String, ForeignKey("Complaint.id", ondelete="SET NULL"), nullable=True, index=True)
    type = Column(SQLEnum(NotificationType), default=NotificationType.COMPLAINT_CREATED, nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(SQLEnum(NotificationChannel), default=NotificationChannel.IN_APP, nullable=False)
    priority = Column(SQLEnum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False)
    metadata_json = Column("metadata", JSON, nullable=True)
    isRead = Column(Boolean, default=False, nullable=False, index=True)
    completed = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    readAt = Column(DateTime, nullable=True)
    completedAt = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")
    complaint = relationship("Complaint", back_populates="notifications")
