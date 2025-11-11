import os
from pydantic_settings import BaseSettings
from typing import Optional

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
    # MongoDB Configuration
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_database: str = os.getenv("MONGODB_DATABASE", "growup")
    
    # Service Configuration
    service_name: str = "hair-tryOn-service"
    service_version: str = "2.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # File Upload Configuration
    max_image_size: int = int(os.getenv("MAX_IMAGE_SIZE", "10000000"))  # 10MB
    allowed_image_formats: list = ["jpg", "jpeg", "png", "webp"]
    
    # AI Model Configuration
    model_path: str = os.getenv("MODEL_PATH", "/app/models")
    hair_model_name: str = os.getenv("HAIR_MODEL_NAME", "hair_fastgan_model.pth")
    use_gpu: bool = os.getenv("USE_GPU", "true").lower() == "true"
    gpu_type: str = os.getenv("GPU_TYPE", "cuda")
    
    # PerfectCorp API Configuration
    perfectcorp_api_key: str = os.getenv("PERFECTCORP_API_KEY", "")
    perfectcorp_api_url: str = os.getenv("PERFECTCORP_API_URL", "https://yce-api-01.perfectcorp.com/s2s/v2.0")
    hairstyle_cache_ttl: int = int(os.getenv("HAIRSTYLE_CACHE_TTL", "86400"))  # 24 hours
    
    # Performance Configuration
    image_max_size: int = int(os.getenv("IMAGE_MAX_SIZE", "1024"))
    
    # Storage Configuration
    upload_dir: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    temp_dir: str = os.getenv("TEMP_DIR", "/tmp/temp")
    
    model_config = {
        "env_file": get_env_file(),
        "extra": "ignore"
    }

settings = Settings()