"""
Custom exceptions for ML components.

Provides a hierarchy of exceptions for different ML-related errors
with structured error information and logging integration.
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class ModelError(Exception):
    """
    Base exception for model-related errors.
    
    All ML-specific exceptions inherit from this base class.
    Includes structured error information and automatic logging.
    """
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        """
        Initialize model error with structured information.
        
        Args:
            message: Human-readable error message
            error_code: Machine-readable error code (e.g., "MODEL_001")
            details: Additional error details as dictionary
            original_exception: Original exception that caused this error
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "MODEL_ERROR"
        self.details = details or {}
        self.original_exception = original_exception
        
        # Log the error
        self._log_error()
    
    def _log_error(self):
        """Log the error with structured information."""
        log_message = f"[{self.error_code}] {self.message}"
        
        if self.details:
            log_message += f" | Details: {self.details}"
        
        if self.original_exception:
            log_message += f" | Caused by: {type(self.original_exception).__name__}: {self.original_exception}"
        
        logger.error(log_message, exc_info=self.original_exception is not None)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert error to dictionary for API responses.
        
        Returns:
            Dictionary with error information
        """
        error_dict = {
            "error": self.error_code,
            "message": self.message,
            "details": self.details
        }
        
        if self.original_exception:
            error_dict["caused_by"] = str(self.original_exception)
        
        return error_dict


class ModelNotFoundError(ModelError):
    """
    Exception raised when model file is not found.
    
    Indicates that the specified model file does not exist at the expected path.
    """
    
    def __init__(
        self,
        message: str,
        model_path: Optional[str] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if model_path:
            details["model_path"] = model_path
        
        super().__init__(
            message=message,
            error_code="MODEL_NOT_FOUND",
            details=details,
            original_exception=original_exception
        )


class ModelLoadError(ModelError):
    """
    Exception raised when model loading fails.
    
    Indicates that the model file exists but could not be loaded into memory.
    This could be due to corruption, incompatibility, or insufficient resources.
    """
    
    def __init__(
        self,
        message: str,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if model_path:
            details["model_path"] = model_path
        if device:
            details["device"] = device
        
        super().__init__(
            message=message,
            error_code="MODEL_LOAD_ERROR",
            details=details,
            original_exception=original_exception
        )


class InferenceError(ModelError):
    """
    Exception raised when model inference fails.
    
    Indicates that inference could not be completed successfully.
    This could be due to invalid input, out of memory, or model errors.
    """
    
    def __init__(
        self,
        message: str,
        device: Optional[str] = None,
        input_shape: Optional[tuple] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if device:
            details["device"] = device
        if input_shape:
            details["input_shape"] = input_shape
        
        super().__init__(
            message=message,
            error_code="INFERENCE_ERROR",
            details=details,
            original_exception=original_exception
        )


class PreprocessingError(ModelError):
    """
    Exception raised when image preprocessing fails.
    
    Indicates that the input image could not be preprocessed for model input.
    This could be due to invalid format, corrupted data, or unsupported dimensions.
    """
    
    def __init__(
        self,
        message: str,
        image_path: Optional[str] = None,
        image_size: Optional[tuple] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if image_path:
            details["image_path"] = image_path
        if image_size:
            details["image_size"] = image_size
        
        super().__init__(
            message=message,
            error_code="PREPROCESSING_ERROR",
            details=details,
            original_exception=original_exception
        )


class PostprocessingError(ModelError):
    """
    Exception raised when result post-processing fails.
    
    Indicates that model outputs could not be processed into the expected format.
    This could be due to unexpected output format or processing errors.
    """
    
    def __init__(
        self,
        message: str,
        output_shape: Optional[tuple] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if output_shape:
            details["output_shape"] = output_shape
        
        super().__init__(
            message=message,
            error_code="POSTPROCESSING_ERROR",
            details=details,
            original_exception=original_exception
        )


class DeviceError(ModelError):
    """
    Exception raised when device-related operations fail.
    
    Indicates issues with GPU/CPU device detection, allocation, or switching.
    """
    
    def __init__(
        self,
        message: str,
        requested_device: Optional[str] = None,
        available_devices: Optional[list] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if requested_device:
            details["requested_device"] = requested_device
        if available_devices:
            details["available_devices"] = available_devices
        
        super().__init__(
            message=message,
            error_code="DEVICE_ERROR",
            details=details,
            original_exception=original_exception
        )


class OutOfMemoryError(ModelError):
    """
    Exception raised when system runs out of memory during ML operations.
    
    Indicates that GPU or CPU memory was exhausted during model loading or inference.
    """
    
    def __init__(
        self,
        message: str,
        device: Optional[str] = None,
        memory_allocated: Optional[float] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if device:
            details["device"] = device
        if memory_allocated:
            details["memory_allocated_mb"] = memory_allocated
        
        super().__init__(
            message=message,
            error_code="OUT_OF_MEMORY",
            details=details,
            original_exception=original_exception
        )


class ValidationError(ModelError):
    """
    Exception raised when input validation fails.
    
    Indicates that input data does not meet the required specifications.
    """
    
    def __init__(
        self,
        message: str,
        validation_errors: Optional[Dict[str, Any]] = None,
        original_exception: Optional[Exception] = None
    ):
        details = {}
        if validation_errors:
            details["validation_errors"] = validation_errors
        
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details,
            original_exception=original_exception
        )
