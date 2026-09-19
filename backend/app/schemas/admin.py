from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, field_validator
from app.models.enums import Role, Priority

def normalize_role(v: Any) -> Optional[Role]:
    if v is None:
        return None
    if isinstance(v, Role):
        return v
    s = str(v).strip().upper()
    if s in ("CUSTOMER", "CITIZEN", "USER"):
        return Role.USER
    if s in ("AGENT", "MANAGER", "STAFF"):
        return Role.STAFF
    if s in ("ADMIN", "SUPERADMIN"):
        return Role.ADMIN
    if s in Role.__members__:
        return Role[s]
    return Role.USER

class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: Optional[Role] = Role.USER
    departmentId: Optional[str] = None
    isActive: Optional[bool] = True

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v: Any) -> Optional[Role]:
        return normalize_role(v)

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[Role] = None
    departmentId: Optional[str] = None
    isActive: Optional[bool] = None

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, v: Any) -> Optional[Role]:
        return normalize_role(v)

class CategoryCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    departmentId: Optional[str] = None
    defaultPriority: Optional[Priority] = Priority.MEDIUM

class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    departmentId: Optional[str] = None
    defaultPriority: Optional[Priority] = None
    isActive: Optional[bool] = None

class DepartmentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    contactEmail: Optional[EmailStr] = None
    contactPhone: Optional[str] = None

class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contactEmail: Optional[EmailStr] = None
    contactPhone: Optional[str] = None
    isActive: Optional[bool] = None

class SLAUpdateItem(BaseModel):
    id: Optional[str] = None
    priority: Priority
    responseHours: int
    resolutionHours: int
