from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.id_generator import generate_id
from app.models.enums import ComplaintStatus, Priority, Category, EscalationLevel

class Complaint(Base):
    __tablename__ = "Complaint"

    id = Column(String, primary_key=True, default=generate_id)
    complaintNumber = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(Category), nullable=False, index=True)
    subcategory = Column(String, nullable=True)
    priority = Column(SQLEnum(Priority), default=Priority.MEDIUM, nullable=False, index=True)
    severityScore = Column(Float, nullable=True)
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.SUBMITTED, nullable=False, index=True)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    aiCategory = Column(SQLEnum(Category), nullable=True)
    aiPriority = Column(SQLEnum(Priority), nullable=True)
    aiConfidence = Column(Float, nullable=True)
    expectedResolutionTime = Column(DateTime, nullable=True)
    imageUrl = Column(String, nullable=True)
    documentUrl = Column(String, nullable=True)

    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    assignedToId = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    departmentId = Column(String, ForeignKey("Department.id", ondelete="SET NULL"), nullable=True, index=True)

    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    assignedAt = Column(DateTime, nullable=True)
    resolvedAt = Column(DateTime, nullable=True)
    closedAt = Column(DateTime, nullable=True)
    reopenedAt = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[userId], back_populates="complaints")
    assignedTo = relationship("User", foreign_keys=[assignedToId], back_populates="assignedComplaints")
    department = relationship("Department", back_populates="complaints")

    updates = relationship("ComplaintUpdate", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintUpdate.createdAt.desc()")
    attachments = relationship("ComplaintAttachment", back_populates="complaint", cascade="all, delete-orphan")
    assignments = relationship("ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan")
    escalations = relationship("ComplaintEscalation", back_populates="complaint", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="complaint")
    feedback = relationship("Feedback", back_populates="complaint", uselist=False, cascade="all, delete-orphan")

class ComplaintAttachment(Base):
    __tablename__ = "ComplaintAttachment"

    id = Column(String, primary_key=True, default=generate_id)
    complaintId = Column(String, ForeignKey("Complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    fileName = Column(String, nullable=False)
    fileUrl = Column(String, nullable=False)
    fileType = Column(String, nullable=True)
    fileSize = Column(Integer, default=0, nullable=False)
    uploadedBy = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="attachments")
    uploader = relationship("User", back_populates="attachments")

class ComplaintUpdate(Base):
    __tablename__ = "ComplaintUpdate"

    id = Column(String, primary_key=True, default=generate_id)
    complaintId = Column(String, ForeignKey("Complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    userId = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    oldStatus = Column(SQLEnum(ComplaintStatus), nullable=True)
    newStatus = Column(SQLEnum(ComplaintStatus), nullable=False)
    comment = Column(Text, nullable=True)
    isInternal = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    complaint = relationship("Complaint", back_populates="updates")
    user = relationship("User", back_populates="updates")

class ComplaintAssignment(Base):
    __tablename__ = "ComplaintAssignment"

    id = Column(String, primary_key=True, default=generate_id)
    complaintId = Column(String, ForeignKey("Complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    assignedTo = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    assignedBy = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    departmentId = Column(String, ForeignKey("Department.id", ondelete="SET NULL"), nullable=True, index=True)
    reason = Column(Text, nullable=True)
    assignedAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    unassignedAt = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="assignments")
    department = relationship("Department", back_populates="assignments")

class ComplaintEscalation(Base):
    __tablename__ = "ComplaintEscalation"

    id = Column(String, primary_key=True, default=generate_id)
    complaintId = Column(String, ForeignKey("Complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    escalatedBy = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    escalatedTo = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    fromLevel = Column(SQLEnum(EscalationLevel), nullable=True)
    toLevel = Column(SQLEnum(EscalationLevel), nullable=False)
    reason = Column(Text, nullable=True)
    isResolved = Column(Boolean, default=False, nullable=False, index=True)
    resolvedAt = Column(DateTime, nullable=True)
    resolvedBy = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="escalations")
