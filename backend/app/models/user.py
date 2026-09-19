from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.id_generator import generate_id
from app.models.enums import Role

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    password = Column(String, nullable=False)
    role = Column(SQLEnum(Role), default=Role.USER, nullable=False, index=True)
    departmentId = Column(String, ForeignKey("Department.id", ondelete="SET NULL"), nullable=True, index=True)
    isActive = Column(Boolean, default=True, nullable=False, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="users")
    complaints = relationship("Complaint", foreign_keys="[Complaint.userId]", back_populates="user")
    assignedComplaints = relationship("Complaint", foreign_keys="[Complaint.assignedToId]", back_populates="assignedTo")
    updates = relationship("ComplaintUpdate", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    feedback = relationship("Feedback", back_populates="user")
    attachments = relationship("ComplaintAttachment", back_populates="uploader")
    notificationPreferences = relationship("NotificationPreferences", back_populates="user", uselist=False)

class NotificationPreferences(Base):
    __tablename__ = "NotificationPreferences"

    id = Column(String, primary_key=True, default=generate_id)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    complaintStatusUpdates = Column(Boolean, default=True, nullable=False)
    complaintAssignment = Column(Boolean, default=True, nullable=False)
    complaintResolution = Column(Boolean, default=True, nullable=False)
    commentNotifications = Column(Boolean, default=True, nullable=False)
    slaAlerts = Column(Boolean, default=True, nullable=False)
    emailNotifications = Column(Boolean, default=True, nullable=False)
    inAppNotifications = Column(Boolean, default=True, nullable=False)
    announcements = Column(Boolean, default=True, nullable=False)
    feedbackRequests = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notificationPreferences")
