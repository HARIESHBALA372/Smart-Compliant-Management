from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.enums import ComplaintStatus, Priority, Category, EscalationLevel

class ComplaintUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    subcategory: Optional[str] = None

class ChangeStatusRequest(BaseModel):
    status: ComplaintStatus
    comment: Optional[str] = None

class AssignRequest(BaseModel):
    assignedTo: str
    departmentId: Optional[str] = None
    reason: Optional[str] = None

class CommentRequest(BaseModel):
    content: str
    isInternal: Optional[bool] = False

class EscalateRequest(BaseModel):
    toLevel: EscalationLevel
    reason: Optional[str] = None

class ChangePriorityRequest(BaseModel):
    priority: Priority
    reason: Optional[str] = None

class ResolveComplaintRequest(BaseModel):
    comment: Optional[str] = None

class ReopenComplaintRequest(BaseModel):
    comment: Optional[str] = None

class FeedbackCreateRequest(BaseModel):
    complaintId: str
    rating: int
    comment: Optional[str] = None
