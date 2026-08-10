from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.ride import Ride
from app.models.sos import SOSAlert
from app.routes.auth import get_current_user
from app.models.document import Document

router = APIRouter(
    prefix="/admin",
    tags=["Admin Portal"]
)


# ==============================
# ADMIN CHECK
# ==============================

def verify_admin_role(
    current_user: User = Depends(get_current_user)
):

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required."
        )

    return current_user



# ==============================
# ANALYTICS
# ==============================

@router.get("/analytics")
def get_platform_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):

    total_passengers = (
        db.query(User)
        .filter(User.role == "passenger")
        .count()
    )

    total_drivers = (
        db.query(User)
        .filter(User.role == "driver")
        .count()
    )

    total_rides = db.query(Ride).count()


    completed_rides = (
        db.query(Ride)
        .filter(Ride.status == "completed")
        .count()
    )


    active_sos = (
        db.query(SOSAlert)
        .filter(SOSAlert.status == "active")
        .count()
    )


    fees = (
        db.query(Ride.platform_fee)
        .filter(Ride.status == "completed")
        .all()
    )


    total_revenue = sum(
        fee[0] for fee in fees if fee[0]
    )


    return {

        "total_passengers": total_passengers,

        "total_drivers": total_drivers,

        "total_rides_booked": total_rides,

        "completed_rides": completed_rides,

        "active_emergencies": active_sos,

        "platform_total_revenue": round(
            total_revenue,
            2
        )
    }




# ==============================
# USERS LIST
# ==============================

@router.get("/users")
def list_all_platform_users(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):

    users = db.query(User).all()


    return [
        {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "role": user.role,
            "is_online": getattr(
                user,
                "is_online",
                False
            )
        }
        for user in users
    ]




# ==============================
# CHANGE USER ROLE
# ==============================

@router.patch("/users/{target_user_id}/role")
def update_user_role(
    target_user_id: int,
    new_role: str,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):


    allowed_roles = [
        "passenger",
        "driver",
        "admin"
    ]


    if new_role not in allowed_roles:

        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )


    target_user = (
        db.query(User)
        .filter(User.id == target_user_id)
        .first()
    )


    if not target_user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    target_user.role = new_role

    db.commit()
# ==============================
# DOCUMENT VERIFICATION
# ==============================

@router.get("/documents")
def list_all_documents(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):
    documents = db.query(Document).all()

    return [
        {
            "id": doc.id,
            "user_id": doc.user_id,
            "document_type": doc.document_type,
            "file_path": doc.file_path,
            "status": doc.status,
            "uploaded_at": doc.uploaded_at
        }
        for doc in documents
    ]


@router.patch("/documents/{document_id}")
def update_document_status(
    document_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )

    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    document.status = status

    db.commit()
    db.refresh(document)

    return {
        "message": "Document status updated",
        "document": {
            "id": document.id,
            "status": document.status
        }
    }

@router.get("/drivers")
def list_drivers(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin_role)
):
    drivers = db.query(User).filter(User.role == "driver").all()

    return [
        {
            "id": driver.id,
            "name": driver.full_name,
            "email": driver.email,
            "phone": driver.phone,
            "rating": getattr(driver, "rating", 0),
            "is_verified": driver.is_verified,
            "is_online": getattr(driver, "is_online", False),
        }
        for driver in drivers
    ]