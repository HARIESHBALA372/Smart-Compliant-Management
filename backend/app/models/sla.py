from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SQLEnum
from app.database import Base
from app.utils.id_generator import generate_id
from app.models.enums import Priority

class SlaRule(Base):
    __tablename__ = "SlaRule"

    id = Column(String, primary_key=True, default=generate_id)
    priority = Column(SQLEnum(Priority), unique=True, nullable=False, index=True)
    responseHours = Column(Integer, default=4, nullable=False)
    resolutionHours = Column(Integer, default=72, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
