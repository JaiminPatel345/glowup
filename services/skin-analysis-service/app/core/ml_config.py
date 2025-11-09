"""
ML Model Configuration Module

This module provides configuration settings for the machine learning models
used in skin analysis, including model paths, device settings, inference
parameters, and optional fallback API configuration.
"""

from pydantic_settings import BaseSettings
from typing import Optional, Literal
import os
from pathlib import Path


class MLSettings(BaseSettings):
    """
    Machine Learning model configuration settings.
    
    This class manages all ML-related configuration including:
    - Model selection and paths
    - Device configuration (GPU/CPU)
    - Inference parameters
    - HuggingFace cache settings
    - Optional fallback API configuration
    """
    
    # Model Selection
    MODEL_NAME: str = os.getenv("MODEL_NAME", "efficientnet_b0")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models/efficientnet_b0.pth")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "1.0.0")
    
    # Device Configuration
    DEVICE: Literal["auto", "cuda", "cpu"] = os.getenv("DEVICE", "auto")
    ENABLE_GPU: bool = os.getenv("ENABLE_GPU", "true").lower() == "true"
    GPU_MEMORY_FRACTION: float = float(os.getenv("GPU_MEMORY_FRACTION", "0.8"))
    
    # Inference Parameters
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.7"))
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "1"))
    INPUT_SIZE: tuple = (224, 224)  # Model input dimensions
    MAX_INFERENCE_TIME: int = int(os.getenv("MAX_INFERENCE_TIME", "5"))  # seconds
    
    # Model Architecture Settings
    NUM_CLASSES_SKIN_TYPE: int = int(os.getenv("NUM_CLASSES_SKIN_TYPE", "5"))
    NUM_CLASSES_ISSUES: int = int(os.getenv("NUM_CLASSES_ISSUES", "8"))
    
    # HuggingFace Configuration
    HF_CACHE_DIR: str = os.getenv("HF_CACHE_DIR", "./models/cache")
    HF_TOKEN: Optional[str] = os.getenv("HF_TOKEN", None)
    HF_REPO_ID: str = os.getenv("HF_REPO_ID", "timm/efficientnet_b0.ra_in1k")
    
    # Model Loading Settings
    LAZY_LOADING: bool = os.getenv("LAZY_LOADING", "true").lower() == "true"
    PRELOAD_MODEL: bool = os.getenv("PRELOAD_MODEL", "false").lower() == "true"
    MODEL_CACHE_SIZE: int = int(os.getenv("MODEL_CACHE_SIZE", "1"))
    
    # Performance Optimization
    ENABLE_QUANTIZATION: bool = os.getenv("ENABLE_QUANTIZATION", "false").lower() == "true"
    ENABLE_ONNX: bool = os.getenv("ENABLE_ONNX", "false").lower() == "true"
    ONNX_MODEL_PATH: Optional[str] = os.getenv("ONNX_MODEL_PATH", None)
    
    # Caching Configuration
    ENABLE_PREDICTION_CACHE: bool = os.getenv("ENABLE_PREDICTION_CACHE", "true").lower() == "true"
    PREDICTION_CACHE_SIZE: int = int(os.getenv("PREDICTION_CACHE_SIZE", "128"))
    
    # Batch Processing Configuration
    ENABLE_BATCH_PROCESSING: bool = os.getenv("ENABLE_BATCH_PROCESSING", "true").lower() == "true"
    MAX_BATCH_SIZE: int = int(os.getenv("MAX_BATCH_SIZE", "8"))
    
    # Memory Management
    AUTO_CLEANUP_MEMORY: bool = os.getenv("AUTO_CLEANUP_MEMORY", "true").lower() == "true"
    CLEANUP_INTERVAL: int = int(os.getenv("CLEANUP_INTERVAL", "100"))  # Cleanup every N inferences
    
    # Preprocessing Settings
    NORMALIZE_MEAN: tuple = (0.485, 0.456, 0.406)  # ImageNet mean
    NORMALIZE_STD: tuple = (0.229, 0.224, 0.225)   # ImageNet std
    ENABLE_AUGMENTATION: bool = os.getenv("ENABLE_AUGMENTATION", "false").lower() == "true"
    
    # Post-processing Settings
    MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.5"))
    MAX_CONFIDENCE_THRESHOLD: float = float(os.getenv("MAX_CONFIDENCE_THRESHOLD", "0.95"))
    ENABLE_HIGHLIGHTED_IMAGES: bool = os.getenv("ENABLE_HIGHLIGHTED_IMAGES", "true").lower() == "true"
    HIGHLIGHT_COLOR: str = os.getenv("HIGHLIGHT_COLOR", "red")
    HIGHLIGHT_ALPHA: float = float(os.getenv("HIGHLIGHT_ALPHA", "0.3"))
    
    # Fallback API Configuration (Optional)
    ENABLE_FALLBACK_API: bool = os.getenv("ENABLE_FALLBACK_API", "false").lower() == "true"
    FALLBACK_API_URL: Optional[str] = os.getenv("FALLBACK_API_URL", None)
    FALLBACK_API_KEY: Optional[str] = os.getenv("FALLBACK_API_KEY", None)
    FALLBACK_API_TIMEOUT: int = int(os.getenv("FALLBACK_API_TIMEOUT", "10"))
    FALLBACK_ON_ERROR: bool = os.getenv("FALLBACK_ON_ERROR", "true").lower() == "true"
    FALLBACK_ON_LOW_CONFIDENCE: bool = os.getenv("FALLBACK_ON_LOW_CONFIDENCE", "false").lower() == "true"
    
    # Logging and Monitoring
    LOG_INFERENCE_TIME: bool = os.getenv("LOG_INFERENCE_TIME", "true").lower() == "true"
    LOG_MEMORY_USAGE: bool = os.getenv("LOG_MEMORY_USAGE", "false").lower() == "true"
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    
    # Error Handling
    RETRY_ON_ERROR: bool = os.getenv("RETRY_ON_ERROR", "true").lower() == "true"
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_DELAY: float = float(os.getenv("RETRY_DELAY", "1.0"))
    
    # Development/Debug Settings
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "false").lower() == "true"
    SAVE_PREPROCESSED_IMAGES: bool = os.getenv("SAVE_PREPROCESSED_IMAGES", "false").lower() == "true"
    SAVE_ATTENTION_MAPS: bool = os.getenv("SAVE_ATTENTION_MAPS", "false").lower() == "true"
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }
    
    def __init__(self, **kwargs):
        """Initialize ML settings and validate configuration."""
        super().__init__(**kwargs)
        self._validate_settings()
        self._ensure_directories()
    
    def _validate_settings(self) -> None:
        """Validate configuration settings."""
        # Validate confidence thresholds
        if not 0.0 <= self.CONFIDENCE_THRESHOLD <= 1.0:
            raise ValueError(f"CONFIDENCE_THRESHOLD must be between 0 and 1, got {self.CONFIDENCE_THRESHOLD}")
        
        if not 0.0 <= self.MIN_CONFIDENCE_THRESHOLD <= 1.0:
            raise ValueError(f"MIN_CONFIDENCE_THRESHOLD must be between 0 and 1, got {self.MIN_CONFIDENCE_THRESHOLD}")
        
        if not 0.0 <= self.MAX_CONFIDENCE_THRESHOLD <= 1.0:
            raise ValueError(f"MAX_CONFIDENCE_THRESHOLD must be between 0 and 1, got {self.MAX_CONFIDENCE_THRESHOLD}")
        
        if self.MIN_CONFIDENCE_THRESHOLD > self.MAX_CONFIDENCE_THRESHOLD:
            raise ValueError("MIN_CONFIDENCE_THRESHOLD cannot be greater than MAX_CONFIDENCE_THRESHOLD")
        
        # Validate batch size
        if self.BATCH_SIZE < 1:
            raise ValueError(f"BATCH_SIZE must be at least 1, got {self.BATCH_SIZE}")
        
        # Validate device
        if self.DEVICE not in ["auto", "cuda", "cpu"]:
            raise ValueError(f"DEVICE must be 'auto', 'cuda', or 'cpu', got {self.DEVICE}")
        
        # Validate fallback API configuration
        if self.ENABLE_FALLBACK_API:
            if not self.FALLBACK_API_URL:
                raise ValueError("FALLBACK_API_URL must be set when ENABLE_FALLBACK_API is true")
        
        # Validate GPU memory fraction
        if not 0.0 < self.GPU_MEMORY_FRACTION <= 1.0:
            raise ValueError(f"GPU_MEMORY_FRACTION must be between 0 and 1, got {self.GPU_MEMORY_FRACTION}")
        
        # Validate highlight alpha
        if not 0.0 <= self.HIGHLIGHT_ALPHA <= 1.0:
            raise ValueError(f"HIGHLIGHT_ALPHA must be between 0 and 1, got {self.HIGHLIGHT_ALPHA}")
    
    def _ensure_directories(self) -> None:
        """Ensure required directories exist."""
        # Create HuggingFace cache directory
        Path(self.HF_CACHE_DIR).mkdir(parents=True, exist_ok=True)
        
        # Create models directory if model path is relative
        model_dir = Path(self.MODEL_PATH).parent
        model_dir.mkdir(parents=True, exist_ok=True)
        
        # Create ONNX model directory if enabled
        if self.ENABLE_ONNX and self.ONNX_MODEL_PATH:
            onnx_dir = Path(self.ONNX_MODEL_PATH).parent
            onnx_dir.mkdir(parents=True, exist_ok=True)
    
    def get_model_path(self) -> Path:
        """Get the full path to the model file."""
        return Path(self.MODEL_PATH)
    
    def get_hf_cache_dir(self) -> Path:
        """Get the HuggingFace cache directory path."""
        return Path(self.HF_CACHE_DIR)
    
    def is_gpu_available(self) -> bool:
        """Check if GPU should be used based on configuration."""
        return self.ENABLE_GPU and self.DEVICE in ["auto", "cuda"]
    
    def get_device_string(self) -> str:
        """Get the device string for PyTorch."""
        if self.DEVICE == "auto":
            return "cuda" if self.is_gpu_available() else "cpu"
        return self.DEVICE
    
    def should_use_fallback(self, error: Optional[Exception] = None, confidence: Optional[float] = None) -> bool:
        """
        Determine if fallback API should be used.
        
        Args:
            error: Optional error that occurred during inference
            confidence: Optional confidence score from model prediction
            
        Returns:
            True if fallback should be used, False otherwise
        """
        if not self.ENABLE_FALLBACK_API:
            return False
        
        # Use fallback on error if configured
        if error and self.FALLBACK_ON_ERROR:
            return True
        
        # Use fallback on low confidence if configured
        if confidence is not None and self.FALLBACK_ON_LOW_CONFIDENCE:
            if confidence < self.CONFIDENCE_THRESHOLD:
                return True
        
        return False
    
    def get_config_summary(self) -> dict:
        """Get a summary of the current configuration."""
        return {
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "device": self.get_device_string(),
            "confidence_threshold": self.CONFIDENCE_THRESHOLD,
            "batch_size": self.BATCH_SIZE,
            "lazy_loading": self.LAZY_LOADING,
            "fallback_enabled": self.ENABLE_FALLBACK_API,
            "quantization_enabled": self.ENABLE_QUANTIZATION,
            "onnx_enabled": self.ENABLE_ONNX,
            "caching_enabled": self.ENABLE_PREDICTION_CACHE,
            "cache_size": self.PREDICTION_CACHE_SIZE,
            "batch_processing_enabled": self.ENABLE_BATCH_PROCESSING,
            "max_batch_size": self.MAX_BATCH_SIZE,
        }


# Global ML settings instance
ml_settings = MLSettings()
