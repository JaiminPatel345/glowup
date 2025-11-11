from pydantic_settings import BaseSettings
from typing import List
import os

# Determine which .env file to load
# In Docker: use .env.docker, locally: use .env.local
def get_env_file():
    if os.getenv("NODE_ENV") == "production":
        return ".env"
    elif os.getenv("DOCKER_ENV") == "true":
        return ".env.docker"
    else:
        return ".env.local"

class Settings(BaseSettings):
    # MongoDB settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "growup")
    
    # File upload settings
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/jpg"]
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    
    # AI Model settings
    MODELS_DIR: str = os.getenv("MODELS_DIR", "/app/models")
    SKIN_MODEL_PATH: str = os.getenv("SKIN_MODEL_PATH", "/app/models/skin_analysis_model.pkl")
    
    # API settings
    ALLOWED_ORIGINS: List[str] = ["*"]  # Configure properly for production
    
    # Performance settings
    MAX_ANALYSIS_TIME: int = int(os.getenv("MAX_ANALYSIS_TIME", "5"))  # 5 seconds
    
    model_config = {
        "env_file": get_env_file(),
        "extra": "ignore"
    }


settings = Settings()