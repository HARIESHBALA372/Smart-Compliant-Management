from typing import Optional
from pydantic import BaseModel

class NotificationPreferencesUpdateRequest(BaseModel):
    complaintStatusUpdates: Optional[bool] = None
    complaintAssignment: Optional[bool] = None
    complaintResolution: Optional[bool] = None
    commentNotifications: Optional[bool] = None
    slaAlerts: Optional[bool] = None
    emailNotifications: Optional[bool] = None
    inAppNotifications: Optional[bool] = None
    announcements: Optional[bool] = None
    feedbackRequests: Optional[bool] = None

class AnnouncementRequest(BaseModel):
    title: str
    message: str
    priority: Optional[str] = "NORMAL"
