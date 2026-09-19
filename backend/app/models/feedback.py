from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.id_generator import generate_id

class Feedback(Base):
    __tablename__ = "Feedback"

    id = Column(String, primary_key=True, default=generate_id)
    complaintId = Column(String, ForeignKey("Complaint.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="feedback")
    user = relationship("User", back_populates="feedback")
