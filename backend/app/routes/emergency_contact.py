from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.emergency_contact import EmergencyContact
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactResponse
)


router = APIRouter(
    prefix="/emergency-contacts",
    tags=["Emergency Contacts"]
)


# Add emergency contact
@router.post(
    "/",
    response_model=EmergencyContactResponse
)
def create_emergency_contact(
    contact: EmergencyContactCreate,
    user_id: int,
    db: Session = Depends(get_db)
):

    new_contact = EmergencyContact(
        name=contact.name,
        phone=contact.phone,
        user_id=user_id
    )

    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)

    return new_contact



# Get user's emergency contacts
@router.get(
    "/{user_id}",
    response_model=list[EmergencyContactResponse]
)
def get_emergency_contacts(
    user_id: int,
    db: Session = Depends(get_db)
):

    contacts = (
        db.query(EmergencyContact)
        .filter(EmergencyContact.user_id == user_id)
        .all()
    )

    return contacts



# Delete emergency contact
@router.delete("/{contact_id}")
def delete_emergency_contact(
    contact_id: int,
    db: Session = Depends(get_db)
):

    contact = (
        db.query(EmergencyContact)
        .filter(EmergencyContact.id == contact_id)
        .first()
    )

    if not contact:
        raise HTTPException(
            status_code=404,
            detail="Emergency contact not found"
        )

    db.delete(contact)
    db.commit()

    return {
        "message": "Emergency contact deleted"
    }