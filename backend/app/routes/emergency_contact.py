from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.emergency_contact import EmergencyContact
from app.models.user import User
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactResponse
)
from app.routes.auth import get_current_user


router = APIRouter(
    prefix="/emergency-contacts",
    tags=["Emergency Contacts"]
)


# Add emergency contact
@router.post(
    "/",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED
)
def create_emergency_contact(
    contact: EmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_contact = EmergencyContact(
        name=contact.name.strip(),
        phone=contact.phone.strip(),
        user_id=current_user.id
    )

    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)

    return new_contact


# Get user's emergency contacts
@router.get(
    "/",
    response_model=list[EmergencyContactResponse]
)
@router.get(
    "/{user_id}",
    response_model=list[EmergencyContactResponse]
)
def get_emergency_contacts(
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce that non-admins can only fetch their own contacts
    target_user_id = current_user.id if (user_id is None or current_user.role != "admin") else user_id

    contacts = (
        db.query(EmergencyContact)
        .filter(EmergencyContact.user_id == target_user_id)
        .all()
    )

    return contacts


# Delete emergency contact
@router.delete("/{contact_id}")
def delete_emergency_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = (
        db.query(EmergencyContact)
        .filter(EmergencyContact.id == contact_id)
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found"
        )

    # Ownership check
    if contact.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this emergency contact."
        )

    db.delete(contact)
    db.commit()

    return {
        "message": "Emergency contact deleted successfully"
    }