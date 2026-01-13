from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from ..database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    energy_curve = Column(JSON)  # Array of 24 integers (0-100)
    remaining_energy = Column(Integer, default=800)
    start_hour = Column(Integer, default=8)
    end_hour = Column(Integer, default=22)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
