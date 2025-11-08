import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # MongoDB Configuration
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_database: str = os.getenv("MONGODB_DATABASE", "growup")
    
    # Service Configuration
    service_name: str = "hair-tryOn-service"
    service_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # File Upload Configuration
    max_video_size: int = int(os.getenv("MAX_VIDEO_SIZE", "50000000"))  # 50MB
    max_video_duration: int = int(os.getenv("MAX_VIDEO_DURATION", "10"))  # 10 seconds
    allowed_video_formats: list = ["mp4", "avi", "mov", "webm"]
    allowed_image_formats: list = ["jpg", "jpeg", "png", "webp"]
    
    # AI Model Configuration
    model_path: str = os.getenv("MODEL_PATH", "/app/models")
    hair_model_name: str = os.getenv("HAIR_MODEL_NAME", "hair_fastgan_model.pth")
    
    # WebSocket Configuration
    websocket_max_connections: int = int(os.getenv("WEBSOCKET_MAX_CONNECTIONS", "100"))
    websocket_timeout: int = int(os.getenv("WEBSOCKET_TIMEOUT", "300"))  # 5 minutes
    
    # Performance Configuration
    frame_sampling_rate: float = float(os.getenv("FRAME_SAMPLING_RATE", "0.5"))  # 50%
    target_latency_ms: int = int(os.getenv("TARGET_LATENCY_MS", "200"))
    
    # Storage Configuration
    upload_dir: str = os.getenv("UPLOAD_DIR", "/tmp/uploads")
    temp_dir: str = os.getenv("TEMP_DIR", "/tmp/temp")
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()