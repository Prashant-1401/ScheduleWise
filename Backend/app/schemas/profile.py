from pydantic import BaseModel
from typing import List

class UserProfileBase(BaseModel):
    energy_curve: List[int]  # 24 integers
    remaining_energy: int = 800
    start_hour: int = 8
    end_hour: int = 22

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    id: int
    user_id: int
    
    model_config = {"from_attributes": True}
