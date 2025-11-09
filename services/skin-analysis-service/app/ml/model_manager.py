"""
Model Manager for ML model lifecycle and inference.

Handles model loading, device management, and inference orchestration.
"""

import logging
import time
import gc
from pathlib import Path
from typing import Dict, Any, Optional
import torch
import torch.nn.functional as F
import numpy as np

from app.ml.performance import PerformanceOptimizer, MemoryManager
from app.ml.exceptions import (
    ModelError,
    ModelNotFoundError,
    ModelLoadError,
    InferenceError,
    DeviceError,
    OutOfMemoryError,
)
from app.ml.logging_utils import MLLogger, log_operation

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Manages ML model lifecycle and inference.
    
    Handles model loading, device detection (GPU/CPU), and inference
    with automatic fallback mechanisms. Implements lazy loading to optimize
    startup time and includes comprehensive error handling with CPU fallback.
    
    Features:
    - Automatic GPU/CPU detection
    - Lazy loading (load on first inference)
    - OutOfMemoryError handling with automatic CPU fallback
    - Memory cleanup utilities
    - Device-aware loading
    """
    
    def __init__(
        self,
        model_path: str,
        device: str = "auto",
        confidence_threshold: float = 0.7,
        enable_quantization: bool = False,
        enable_caching: bool = True,
        cache_size: int = 128,
        batch_size: int = 8
    ):
        """
        Initialize model manager.
        
        Args:
            model_path: Path to model file (.pth or .pt)
            device: Device preference - "auto", "cuda", or "cpu"
            confidence_threshold: Minimum confidence threshold for predictions
            enable_quantization: Enable model quantization for CPU inference
            enable_caching: Enable prediction caching
            cache_size: Maximum cache size for predictions
            batch_size: Batch size for batch processing
        """
        self.model_path = Path(model_path)
        self.device_preference = device
        self.device = None
        self.model = None
        self._is_loaded = False
        self.confidence_threshold = confidence_threshold
        self.model_version = "v1.0"
        self._load_attempts = 0
        self._max_load_attempts = 2
        
        # Initialize structured logger
        self._logger = MLLogger("ModelManager")
        
        # Initialize performance optimizer
        self.performance_optimizer = PerformanceOptimizer(
            enable_quantization=enable_quantization,
            enable_caching=enable_caching,
            cache_size=cache_size,
            batch_size=batch_size,
            device=device if device != "auto" else "cpu"
        )
        
        self._logger.log_operation_complete(
            "initialization",
            0.0,
            model_path=str(model_path),
            device=device,
            quantization=enable_quantization,
            caching=enable_caching
        )
        
    def detect_device(self) -> str:
        """
        Detect available device (GPU/CPU) for model inference.
        
        Checks for CUDA availability and respects user preference.
        
        Returns:
            Device string: "cuda" or "cpu"
            
        Raises:
            DeviceError: If device detection fails
        """
        try:
            # If user explicitly requested CPU, use it
            if self.device_preference == "cpu":
                self._logger.log_operation_complete(
                    "device_detection",
                    0.0,
                    device="cpu",
                    reason="user_requested"
                )
                return "cpu"
            
            # Check for CUDA availability
            if torch.cuda.is_available():
                device_name = torch.cuda.get_device_name(0)
                self._logger.log_operation_complete(
                    "device_detection",
                    0.0,
                    device="cuda",
                    gpu_name=device_name
                )
                return "cuda"
            
            self._logger.log_operation_complete(
                "device_detection",
                0.0,
                device="cpu",
                reason="no_gpu_available"
            )
            return "cpu"
            
        except Exception as e:
            raise DeviceError(
                "Failed to detect device",
                requested_device=self.device_preference,
                original_exception=e
            )
    
    def load_model(self) -> None:
        """
        Load model into memory with device-aware loading.
        
        Implements lazy loading and automatic CPU fallback on GPU OOM.
        The model is loaded only when first needed, optimizing startup time.
        
        Raises:
            ModelNotFoundError: If model file doesn't exist
            ModelLoadError: If model loading fails after retries
            OutOfMemoryError: If system runs out of memory
        """
        if self._is_loaded:
            self._logger.log_warning("Model already loaded, skipping load")
            return
        
        # Check if model file exists
        if not self.model_path.exists():
            raise ModelNotFoundError(
                "Model file not found",
                model_path=str(self.model_path)
            )
        
        # Check file size
        file_size_mb = self.model_path.stat().st_size / (1024 * 1024)
        self._logger.log_metric("model_file_size_mb", file_size_mb)
        
        self._load_attempts += 1
        start_time = time.time()
        
        try:
            # Detect device
            self.device = self.detect_device()
            self._logger.log_operation_start(
                "model_loading",
                device=self.device,
                attempt=self._load_attempts,
                max_attempts=self._max_load_attempts
            )
            
            # Load model with device mapping
            self.model = torch.load(
                self.model_path,
                map_location=self.device,
                weights_only=False  # Allow loading full model objects
            )
            
            # Set model to evaluation mode
            self.model.eval()
            
            # Move model to device if it's a nn.Module
            if isinstance(self.model, torch.nn.Module):
                self.model = self.model.to(self.device)
            
            # Apply performance optimizations
            if isinstance(self.model, torch.nn.Module):
                self.model = self.performance_optimizer.optimize_model(self.model)
            
            load_time = time.time() - start_time
            self._is_loaded = True
            
            # Log memory usage if on GPU
            if self.device == "cuda":
                memory_allocated = torch.cuda.memory_allocated(0) / (1024 ** 2)
                memory_reserved = torch.cuda.memory_reserved(0) / (1024 ** 2)
                self._logger.log_memory_usage(self.device, memory_allocated, memory_reserved)
            
            self._logger.log_operation_complete(
                "model_loading",
                load_time,
                device=self.device,
                model_size_mb=file_size_mb
            )
            
        except torch.cuda.OutOfMemoryError as e:
            load_time = time.time() - start_time
            
            # Log OOM error
            if self.device == "cuda":
                memory_allocated = torch.cuda.memory_allocated(0) / (1024 ** 2) if torch.cuda.is_available() else 0
                self._logger.log_warning(
                    "GPU out of memory during model loading",
                    memory_allocated_mb=memory_allocated,
                    duration=load_time
                )
            
            # Automatic fallback to CPU
            if self.device == "cuda" and self._load_attempts < self._max_load_attempts:
                self._logger.log_operation_start("cpu_fallback")
                self.device = "cpu"
                self.device_preference = "cpu"  # Update preference to avoid retry
                
                # Clear GPU memory
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
                # Retry loading on CPU
                try:
                    cpu_start = time.time()
                    self.model = torch.load(
                        self.model_path,
                        map_location="cpu",
                        weights_only=False
                    )
                    self.model.eval()
                    self._is_loaded = True
                    cpu_time = time.time() - cpu_start
                    
                    self._logger.log_operation_complete(
                        "cpu_fallback",
                        cpu_time,
                        success=True
                    )
                except Exception as cpu_error:
                    raise ModelLoadError(
                        "Failed to load model on CPU after GPU OOM",
                        model_path=str(self.model_path),
                        device="cpu",
                        original_exception=cpu_error
                    )
            else:
                raise OutOfMemoryError(
                    "Out of memory during model loading",
                    device=self.device,
                    memory_allocated=memory_allocated if self.device == "cuda" else None,
                    original_exception=e
                )
                
        except Exception as e:
            load_time = time.time() - start_time
            self._logger.log_error("model_loading", e, duration=load_time)
            raise ModelLoadError(
                "Failed to load model",
                model_path=str(self.model_path),
                device=self.device,
                original_exception=e
            )
    
    def predict(self, image_tensor: torch.Tensor, use_cache: bool = True) -> Dict[str, Any]:
        """
        Run inference on preprocessed image tensor with error handling.
        
        Implements lazy loading - loads model on first inference if not already loaded.
        Includes comprehensive error handling and automatic CPU fallback on GPU OOM.
        Supports prediction caching to avoid redundant inference.
        
        Args:
            image_tensor: Preprocessed image tensor with shape (1, 3, H, W)
            use_cache: Whether to use cached predictions if available
            
        Returns:
            Dictionary containing:
                - skin_type: str - Predicted skin type
                - skin_type_confidence: float - Confidence score for skin type
                - issues: Dict[str, float] - Detected issues with confidence scores
                - device_used: str - Device used for inference
                - cached: bool - Whether result was from cache
                
        Raises:
            InferenceError: If inference fails
            OutOfMemoryError: If system runs out of memory
        """
        # Lazy loading - load model on first inference
        if not self._is_loaded:
            self._logger.log_operation_start("lazy_loading")
            self.load_model()
        
        # Check cache first
        if use_cache:
            cached_prediction = self.performance_optimizer.get_cached_prediction(image_tensor)
            if cached_prediction is not None:
                cached_prediction["cached"] = True
                self._logger.log_metric("cache_hit", 1)
                return cached_prediction
            else:
                self._logger.log_metric("cache_miss", 1)
        
        start_time = time.time()
        
        try:
            self._logger.log_operation_start(
                "inference",
                device=self.device,
                input_shape=tuple(image_tensor.shape),
                use_cache=use_cache
            )
            
            # Move tensor to device
            image_tensor = image_tensor.to(self.device)
            
            # Run inference with no gradient computation
            with torch.no_grad():
                outputs = self.model(image_tensor)
            
            # Process outputs based on model architecture
            predictions = self._process_model_outputs(outputs)
            
            inference_time = time.time() - start_time
            predictions["inference_time"] = inference_time
            predictions["device_used"] = self.device
            predictions["cached"] = False
            
            # Cache the prediction
            if use_cache:
                self.performance_optimizer.cache_prediction(image_tensor, predictions)
            
            self._logger.log_operation_complete(
                "inference",
                inference_time,
                device=self.device,
                skin_type=predictions.get("skin_type"),
                num_issues=len(predictions.get("issues", {}))
            )
            
            return predictions
            
        except torch.cuda.OutOfMemoryError as e:
            inference_time = time.time() - start_time
            
            # Log OOM error with memory stats
            if self.device == "cuda" and torch.cuda.is_available():
                memory_allocated = torch.cuda.memory_allocated(0) / (1024 ** 2)
                self._logger.log_warning(
                    "GPU out of memory during inference",
                    memory_allocated_mb=memory_allocated,
                    duration=inference_time
                )
            
            # Automatic fallback to CPU
            if self.device == "cuda":
                self._logger.log_operation_start("inference_cpu_fallback")
                
                # Unload model and clear GPU memory
                self.unload_model()
                
                # Reload on CPU
                self.device_preference = "cpu"
                self.load_model()
                
                # Retry inference on CPU
                try:
                    cpu_start = time.time()
                    image_tensor = image_tensor.to("cpu")
                    with torch.no_grad():
                        outputs = self.model(image_tensor)
                    predictions = self._process_model_outputs(outputs)
                    predictions["device_used"] = "cpu"
                    cpu_time = time.time() - cpu_start
                    
                    self._logger.log_operation_complete(
                        "inference_cpu_fallback",
                        cpu_time,
                        success=True
                    )
                    return predictions
                except Exception as cpu_error:
                    raise InferenceError(
                        "Inference failed on CPU after GPU OOM",
                        device="cpu",
                        input_shape=tuple(image_tensor.shape),
                        original_exception=cpu_error
                    )
            else:
                raise OutOfMemoryError(
                    "Out of memory during inference",
                    device=self.device,
                    original_exception=e
                )
                
        except Exception as e:
            inference_time = time.time() - start_time
            self._logger.log_error("inference", e, duration=inference_time)
            raise InferenceError(
                "Inference failed",
                device=self.device,
                input_shape=tuple(image_tensor.shape),
                original_exception=e
            )
    
    def _process_model_outputs(self, outputs: Any) -> Dict[str, Any]:
        """
        Process raw model outputs into structured predictions.
        
        This is a placeholder implementation that should be customized
        based on the actual model architecture and output format.
        
        Args:
            outputs: Raw model outputs (tensor or tuple of tensors)
            
        Returns:
            Dictionary with structured predictions
        """
        # Handle different output formats
        if isinstance(outputs, tuple):
            # Multi-head model (skin_type, issues)
            skin_type_logits, issue_logits = outputs
        elif isinstance(outputs, dict):
            # Dictionary output
            skin_type_logits = outputs.get("skin_type")
            issue_logits = outputs.get("issues")
        else:
            # Single output - assume it's skin type classification
            skin_type_logits = outputs
            issue_logits = None
        
        # Process skin type predictions
        skin_type_probs = F.softmax(skin_type_logits, dim=1)
        skin_type_confidence, skin_type_idx = torch.max(skin_type_probs, dim=1)
        
        # Map index to skin type name
        skin_types = ["oily", "dry", "combination", "sensitive", "normal"]
        skin_type = skin_types[skin_type_idx.item()] if skin_type_idx.item() < len(skin_types) else "unknown"
        
        # Process issue predictions if available
        issues = {}
        if issue_logits is not None:
            issue_probs = torch.sigmoid(issue_logits)
            issue_names = ["acne", "dark_spots", "wrinkles", "redness", "dryness", "oiliness", "enlarged_pores", "uneven_tone"]
            
            for idx, issue_name in enumerate(issue_names):
                if idx < issue_probs.shape[1]:
                    confidence = issue_probs[0, idx].item()
                    # Only include issues above confidence threshold
                    if confidence >= self.confidence_threshold:
                        issues[issue_name] = confidence
        
        return {
            "skin_type": skin_type,
            "skin_type_confidence": skin_type_confidence.item(),
            "issues": issues,
            "confidence_scores": {
                "skin_type": skin_type_confidence.item(),
                **issues
            }
        }
    
    def predict_batch(self, image_tensors: list) -> list:
        """
        Run inference on a batch of images for improved throughput.
        
        Args:
            image_tensors: List of preprocessed image tensors
            
        Returns:
            List of prediction dictionaries
        """
        if not self._is_loaded:
            logger.info("Model not loaded, performing lazy loading")
            self.load_model()
        
        try:
            start_time = time.time()
            
            # Create batches
            batches = self.performance_optimizer.batch_processor.create_batch(image_tensors)
            
            all_predictions = []
            for batch_tensor in batches:
                # Process batch
                batch_predictions = self.performance_optimizer.batch_processor.process_batch(
                    self.model,
                    batch_tensor
                )
                
                # Process each prediction in batch
                for pred in batch_predictions:
                    processed = self._process_model_outputs(pred["raw_output"])
                    processed["device_used"] = self.device
                    all_predictions.append(processed)
            
            batch_time = time.time() - start_time
            logger.info(f"Batch inference completed: {len(image_tensors)} images in {batch_time:.3f}s")
            logger.info(f"Average time per image: {batch_time/len(image_tensors):.3f}s")
            
            return all_predictions
            
        except Exception as e:
            logger.error(f"Batch inference failed: {e}")
            raise InferenceError(f"Batch inference failed: {e}")
    
    def cleanup_memory(self) -> None:
        """
        Perform memory cleanup without unloading the model.
        
        Clears caches and performs garbage collection while keeping
        the model loaded for continued use.
        """
        logger.info("Performing memory cleanup")
        self.performance_optimizer.cleanup()
        logger.info("Memory cleanup completed")
    
    def unload_model(self) -> None:
        """
        Unload model from memory and perform cleanup.
        
        Frees up GPU/CPU memory by removing the model and clearing caches.
        Useful for memory management in production environments.
        """
        if self.model is not None:
            logger.info("Unloading model from memory")
            
            # Delete model
            del self.model
            self.model = None
            self._is_loaded = False
            
            # Perform cleanup
            self.performance_optimizer.cleanup()
            
            logger.info("Model unloaded successfully")
        else:
            logger.debug("No model to unload")
    
    def is_loaded(self) -> bool:
        """
        Check if model is currently loaded in memory.
        
        Returns:
            True if model is loaded, False otherwise
        """
        return self._is_loaded
    
    def get_device(self) -> Optional[str]:
        """
        Get the current device being used.
        
        Returns:
            Device string ("cuda" or "cpu") or None if model not loaded
        """
        return self.device
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the model and its current state.
        
        Returns:
            Dictionary with model information including performance stats
        """
        info = {
            "model_path": str(self.model_path),
            "is_loaded": self._is_loaded,
            "device": self.device,
            "device_preference": self.device_preference,
            "confidence_threshold": self.confidence_threshold,
            "model_version": self.model_version,
            "model_exists": self.model_path.exists(),
            "performance_stats": self.performance_optimizer.get_stats()
        }
        
        if self.model_path.exists():
            info["model_size_mb"] = self.model_path.stat().st_size / (1024 * 1024)
        
        if self._is_loaded and self.device == "cuda" and torch.cuda.is_available():
            info["gpu_memory_allocated_mb"] = torch.cuda.memory_allocated(0) / (1024 ** 2)
            info["gpu_memory_reserved_mb"] = torch.cuda.memory_reserved(0) / (1024 ** 2)
        
        return info
