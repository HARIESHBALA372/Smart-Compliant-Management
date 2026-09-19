from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, NotificationPreferences
from app.models.enums import Role
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    ProfileUpdateRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.utils.response import success_response
from app.services.audit_service import record_audit

router = APIRouter(prefix="/auth", tags=["Auth"])

def user_to_dict(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "departmentId": user.departmentId,
        "isActive": user.isActive,
        "createdAt": user.createdAt.isoformat() if user.createdAt else None,
        "updatedAt": user.updatedAt.isoformat() if user.updatedAt else None,
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    hashed = hash_password(payload.password)
    user = User(
        name=payload.name.strip(),
        email=email,
        phone=payload.phone.strip() if payload.phone else None,
        password=hashed,
        role=Role.USER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize default notification preferences
    prefs = NotificationPreferences(userId=user.id)
    db.add(prefs)
    db.commit()

    token = create_access_token(user.id)

    record_audit(
        db=db,
        action="REGISTER",
        entity_type="User",
        entity_id=user.id,
        user_id=user.id,
        new_value={"email": user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return success_response("Registration successful", {
        "user": user_to_dict(user),
        "token": token,
    })

@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.isActive:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")

    token = create_access_token(user.id)

    record_audit(
        db=db,
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
        user_id=user.id,
        new_value={"email": user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return success_response("Login successful", {
        "user": user_to_dict(user),
        "token": token,
    })

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return success_response("Profile fetched", user_to_dict(current_user))

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return success_response("Profile fetched", user_to_dict(current_user))

@router.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.phone is not None:
        current_user.phone = payload.phone.strip()
    db.commit()
    db.refresh(current_user)
    return success_response("Profile updated", user_to_dict(current_user))

@router.put("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.currentPassword, current_user.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.password = hash_password(payload.newPassword)
    db.commit()
    return success_response("Password changed successfully")

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email")

    token = create_access_token(user.id)
    return success_response("Password reset token generated (dev mode).", {"resetToken": token})

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_data = decode_access_token(payload.token)
    if not token_data or not token_data.get("userId"):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == token_data["userId"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(payload.password)
    db.commit()
    return success_response("Password has been reset. You can now log in.")

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record_audit(
        db=db,
        action="LOGOUT",
        entity_type="User",
        entity_id=current_user.id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return success_response("Logged out successfully")
