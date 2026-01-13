from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float, JSON
from sqlalchemy.sql import func
from ..database import Base

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    date = Column(String)  # Format: YYYY-MM-DD
    start_time = Column(String)  # Format: HH:MM
    end_time = Column(String)  # Format: HH:MM
    due_date = Column(String)  # Format: YYYY-MM-DD
    last_triage_date = Column(String)  # ISO string
    participants = Column(JSON, default=[]) # List of avatar URLs
    type = Column(String)  # work, personal, other
    location = Column(String)
    is_scheduled = Column(Boolean, default=False)
    completed = Column(Boolean, default=False)
    priority_score = Column(Float, default=50.0)
    estimated_energy_cost = Column(Float, default=50.0)
    time_required = Column(Integer, default=60)  # minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
