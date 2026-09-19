from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.id_generator import generate_id
from app.models.enums import Priority

class Department(Base):
    __tablename__ = "Department"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    contactEmail = Column(String, nullable=True)
    contactPhone = Column(String, nullable=True)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="department")
    complaints = relationship("Complaint", back_populates="department")
    complaintCategories = relationship("ComplaintCategory", back_populates="department")
    assignments = relationship("ComplaintAssignment", back_populates="department")

class ComplaintCategory(Base):
    __tablename__ = "ComplaintCategory"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    departmentId = Column(String, ForeignKey("Department.id", ondelete="SET NULL"), nullable=True, index=True)
    defaultPriority = Column(SQLEnum(Priority), default=Priority.MEDIUM, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="complaintCategories")
