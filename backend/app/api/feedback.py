from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.complaint import Complaint
from app.models.feedback import Feedback
from app.schemas.complaint import FeedbackCreateRequest
from app.utils.response import success_response

router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(Complaint).filter(Complaint.id == payload.complaintId).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if complaint.userId != current_user.id:
        raise HTTPException(status_code=403, detail="You can only submit feedback for your own complaints")

    existing = db.query(Feedback).filter(Feedback.complaintId == payload.complaintId).first()
    if existing:
        raise HTTPException(status_code=409, detail="Feedback already submitted for this complaint")

    feedback = Feedback(
        complaintId=payload.complaintId,
        userId=current_user.id,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else None,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return success_response("Feedback submitted successfully", {
        "id": feedback.id,
        "complaintId": feedback.complaintId,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "createdAt": feedback.createdAt.isoformat() if feedback.createdAt else None,
    }, 201)
