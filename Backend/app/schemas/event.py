from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    due_date: Optional[str] = None
    last_triage_date: Optional[str] = None
    participants: list[str] = []
    type: str = "work"
    location: Optional[str] = None
    is_scheduled: bool = False
    completed: bool = False
    priority_score: float = 50.0
    estimated_energy_cost: float = 50.0
    time_required: int = 60

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    due_date: Optional[str] = None
    last_triage_date: Optional[str] = None
    participants: Optional[list[str]] = None
    type: Optional[str] = None
    location: Optional[str] = None
    is_scheduled: Optional[bool] = None
    completed: Optional[bool] = None
    priority_score: Optional[float] = None
    estimated_energy_cost: Optional[float] = None
    time_required: Optional[int] = None

class Event(EventBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = {"from_attributes": True}
