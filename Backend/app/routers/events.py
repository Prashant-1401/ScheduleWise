from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.event import Event
from ..models.user import User
from ..schemas.event import Event as EventSchema, EventCreate, EventUpdate
from .auth import get_current_user

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("/", response_model=List[EventSchema])
def get_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.user_id == current_user.id).all()
    return events

@router.post("/", response_model=EventSchema)
def create_event(event: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = Event(**event.dict(), user_id=current_user.id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/{event_id}", response_model=EventSchema)
def get_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.put("/{event_id}", response_model=EventSchema)
def update_event(event_id: int, event_update: EventUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_event, field, value)
    
    db.commit()
    db.refresh(db_event)
    return db_event

@router.delete("/{event_id}")
def delete_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted successfully"}
