from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/send")
def send_notification(user_id: int, title: str, body: str, db: Session = Depends(get_db)):
    """Stores a notification for a user, ready for the mobile/push pipeline."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    return {
        "status": "success",
        "notification_id": notification.id,
        "message": "Notification queued successfully."
    }


@router.get("/user/{user_id}")
def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    """Fetches all notifications for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    notifications = db.query(Notification).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "body": n.body,
            "is_read": n.is_read,
            "created_at": n.created_at,
        }
        for n in notifications
    ]


@router.patch("/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """Marks a single notification as read."""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notification.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read."}
