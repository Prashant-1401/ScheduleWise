from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.profile import UserProfile
from ..models.user import User
from ..schemas.profile import UserProfile as ProfileSchema, UserProfileCreate, UserProfileUpdate
from .auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

@router.get("/", response_model=ProfileSchema)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        # Create default profile
        default_curve = [50, 50, 50, 50, 60, 70, 90, 100, 100, 90, 80, 70,
                        60, 50, 40, 50, 60, 70, 70, 60, 50, 40, 30, 30]
        profile = UserProfile(
            user_id=current_user.id,
            energy_curve=default_curve,
            remaining_energy=800,
            start_hour=8,
            end_hour=22
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/", response_model=ProfileSchema)
def update_profile(profile_update: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not db_profile:
        # Create if doesn't exist
        db_profile = UserProfile(**profile_update.dict(), user_id=current_user.id)
        db.add(db_profile)
    else:
        # Update existing
        for field, value in profile_update.dict().items():
            setattr(db_profile, field, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile
