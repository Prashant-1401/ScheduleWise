import os
from dataclasses import dataclass

@dataclass
class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-only")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./schedulewise.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://127.0.0.1:5501")

settings = Settings()
