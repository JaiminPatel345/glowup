from pydantic_settings import BaseSettings
from typing import List
import os
import tempfile

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
    
    # Use relative path for local development, /app for Docker
    # Check if running in Docker by looking for /.dockerenv file
    _is_docker = os.path.exists('/.dockerenv')
    _base_dir = '/app' if _is_docker else os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(_base_dir, "uploads"))
    
    # AI Model settings
    MODELS_DIR: str = os.getenv("MODELS_DIR", os.path.join(_base_dir, "models"))
    SKIN_MODEL_PATH: str = os.getenv("SKIN_MODEL_PATH", os.path.join(_base_dir, "models", "skin_analysis_model.pkl"))
    
    # API settings
    ALLOWED_ORIGINS: List[str] = ["*"]  # Configure properly for production
    
    # Performance settings
    MAX_ANALYSIS_TIME: int = int(os.getenv("MAX_ANALYSIS_TIME", "5"))  # 5 seconds
    
    model_config = {
        "env_file": get_env_file(),
        "extra": "ignore"
    }


settings = Settings()

# Ensure upload directory exists and is writable
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Test write permission
    test_file = os.path.join(settings.UPLOAD_DIR, ".write_test")
    with open(test_file, "w") as f:
        f.write("test")
    os.remove(test_file)
except Exception as e:
    # Fallback to system temp directory
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Upload directory {settings.UPLOAD_DIR} not writable: {e}")
    settings.UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "skin_uploads")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Using fallback upload directory: {settings.UPLOAD_DIR}")