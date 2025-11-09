"""
Performance Optimization Module

This module provides performance optimization utilities for ML inference including:
- Model quantization for CPU inference
- Prediction caching with LRU cache
- Batch processing support
- Memory cleanup utilities
"""

import logging
import hashlib
import gc
from functools import lru_cache
from typing import Dict, Any, List, Optional, Tuple
import torch
import torch.quantization as quantization
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class ModelQuantizer:
    """
    Handles model quantization for improved CPU inference performance.
    
    Quantization reduces model size and improves inference speed on CPU
    by converting floating-point weights to lower precision (int8).
    """
    
    @staticmethod
    def quantize_dynamic(model: torch.nn.Module) -> torch.nn.Module:
        """
        Apply dynamic quantization to model for CPU inference.
        
        Dynamic quantization converts weights to int8 and activations are
        quantized dynamically during inference. This provides significant
        speedup on CPU with minimal accuracy loss.
        
        Args:
            model: PyTorch model to quantize
            
        Returns:
            Quantized model
        """
        try:
            logger.info("Applying dynamic quantization to model...")
            
            # Apply dynamic quantization to Linear and Conv2d layers
            quantized_model = quantization.quantize_dynamic(
                model,
                {torch.nn.Linear, torch.nn.Conv2d},
                dtype=torch.qint8
            )
            
            # Calculate size reduction
            original_size = sum(p.numel() * p.element_size() for p in model.parameters())
            quantized_size = sum(p.numel() * p.element_size() for p in quantized_model.parameters())
            reduction = (1 - quantized_size / original_size) * 100
            
            logger.info(f"Model quantized successfully. Size reduction: {reduction:.1f}%")
            logger.info(f"Original size: {original_size / (1024**2):.2f} MB")
            logger.info(f"Quantized size: {quantized_size / (1024**2):.2f} MB")
            
            return quantized_model
            
        except Exception as e:
            logger.error(f"Quantization failed: {e}")
            logger.warning("Returning original model without quantization")
            return model
    
    @staticmethod
    def quantize_static(
        model: torch.nn.Module,
        calibration_data: List[torch.Tensor]
    ) -> torch.nn.Module:
        """
        Apply static quantization to model using calibration data.
        
        Static quantization provides better performance than dynamic but
        requires calibration data to determine optimal quantization parameters.
        
        Args:
            model: PyTorch model to quantize
            calibration_data: List of sample tensors for calibration
            
        Returns:
            Quantized model
        """
        try:
            logger.info("Applying static quantization to model...")
            
            # Set model to evaluation mode
            model.eval()
            
            # Fuse modules for better quantization
            model = torch.quantization.fuse_modules(model, [['conv', 'bn', 'relu']])
            
            # Specify quantization configuration
            model.qconfig = torch.quantization.get_default_qconfig('fbgemm')
            
            # Prepare model for quantization
            torch.quantization.prepare(model, inplace=True)
            
            # Calibrate with sample data
            logger.info(f"Calibrating with {len(calibration_data)} samples...")
            with torch.no_grad():
                for data in calibration_data:
                    model(data)
            
            # Convert to quantized model
            torch.quantization.convert(model, inplace=True)
            
            logger.info("Static quantization completed successfully")
            return model
            
        except Exception as e:
            logger.error(f"Static quantization failed: {e}")
            logger.warning("Falling back to dynamic quantization")
            return ModelQuantizer.quantize_dynamic(model)


class PredictionCache:
    """
    Implements LRU cache for model predictions to avoid redundant inference.
    
    Caches predictions based on image hash to quickly return results for
    identical or previously seen images.
    """
    
    def __init__(self, maxsize: int = 128):
        """
        Initialize prediction cache.
        
        Args:
            maxsize: Maximum number of cached predictions
        """
        self.maxsize = maxsize
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._access_order: List[str] = []
        logger.info(f"Prediction cache initialized with maxsize={maxsize}")
    
    def _compute_image_hash(self, image_tensor: torch.Tensor) -> str:
        """
        Compute hash of image tensor for cache key.
        
        Args:
            image_tensor: Input image tensor
            
        Returns:
            Hash string
        """
        # Convert tensor to bytes and compute hash
        image_bytes = image_tensor.cpu().numpy().tobytes()
        return hashlib.sha256(image_bytes).hexdigest()
    
    def get(self, image_tensor: torch.Tensor) -> Optional[Dict[str, Any]]:
        """
        Get cached prediction for image.
        
        Args:
            image_tensor: Input image tensor
            
        Returns:
            Cached prediction or None if not found
        """
        image_hash = self._compute_image_hash(image_tensor)
        
        if image_hash in self._cache:
            # Update access order (move to end for LRU)
            self._access_order.remove(image_hash)
            self._access_order.append(image_hash)
            
            logger.debug(f"Cache hit for image hash: {image_hash[:8]}...")
            return self._cache[image_hash].copy()
        
        logger.debug(f"Cache miss for image hash: {image_hash[:8]}...")
        return None
    
    def put(self, image_tensor: torch.Tensor, prediction: Dict[str, Any]) -> None:
        """
        Store prediction in cache.
        
        Args:
            image_tensor: Input image tensor
            prediction: Prediction result to cache
        """
        image_hash = self._compute_image_hash(image_tensor)
        
        # Evict oldest entry if cache is full
        if len(self._cache) >= self.maxsize and image_hash not in self._cache:
            oldest_hash = self._access_order.pop(0)
            del self._cache[oldest_hash]
            logger.debug(f"Evicted oldest cache entry: {oldest_hash[:8]}...")
        
        # Add or update cache entry
        if image_hash not in self._cache:
            self._access_order.append(image_hash)
        else:
            self._access_order.remove(image_hash)
            self._access_order.append(image_hash)
        
        self._cache[image_hash] = prediction.copy()
        logger.debug(f"Cached prediction for image hash: {image_hash[:8]}...")
    
    def clear(self) -> None:
        """Clear all cached predictions."""
        self._cache.clear()
        self._access_order.clear()
        logger.info("Prediction cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache stats
        """
        return {
            "size": len(self._cache),
            "maxsize": self.maxsize,
            "utilization": len(self._cache) / self.maxsize if self.maxsize > 0 else 0
        }


class BatchProcessor:
    """
    Handles batch processing of multiple images for improved throughput.
    
    Batching multiple images together can significantly improve GPU utilization
    and overall throughput compared to processing images one at a time.
    """
    
    def __init__(self, batch_size: int = 8, device: str = "cpu"):
        """
        Initialize batch processor.
        
        Args:
            batch_size: Maximum batch size
            device: Device to use for processing
        """
        self.batch_size = batch_size
        self.device = device
        logger.info(f"Batch processor initialized with batch_size={batch_size}, device={device}")
    
    def create_batch(
        self,
        image_tensors: List[torch.Tensor]
    ) -> List[torch.Tensor]:
        """
        Create batches from list of image tensors.
        
        Args:
            image_tensors: List of individual image tensors
            
        Returns:
            List of batched tensors
        """
        batches = []
        
        for i in range(0, len(image_tensors), self.batch_size):
            batch = image_tensors[i:i + self.batch_size]
            
            # Stack tensors into batch
            if len(batch) > 0:
                # Remove batch dimension if present (shape: [1, C, H, W] -> [C, H, W])
                batch = [t.squeeze(0) if t.dim() == 4 else t for t in batch]
                
                # Stack into batch tensor
                batch_tensor = torch.stack(batch)
                batches.append(batch_tensor)
        
        logger.debug(f"Created {len(batches)} batches from {len(image_tensors)} images")
        return batches
    
    def process_batch(
        self,
        model: torch.nn.Module,
        batch_tensor: torch.Tensor
    ) -> List[Dict[str, Any]]:
        """
        Process a batch of images through the model.
        
        Args:
            model: PyTorch model
            batch_tensor: Batched image tensor
            
        Returns:
            List of predictions for each image in batch
        """
        try:
            # Move batch to device
            batch_tensor = batch_tensor.to(self.device)
            
            # Run inference
            with torch.no_grad():
                outputs = model(batch_tensor)
            
            # Process outputs for each image in batch
            predictions = []
            batch_size = batch_tensor.shape[0]
            
            for i in range(batch_size):
                # Extract output for this image
                if isinstance(outputs, tuple):
                    image_output = tuple(out[i:i+1] for out in outputs)
                elif isinstance(outputs, dict):
                    image_output = {k: v[i:i+1] for k, v in outputs.items()}
                else:
                    image_output = outputs[i:i+1]
                
                predictions.append({"raw_output": image_output})
            
            return predictions
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            raise
    
    def get_optimal_batch_size(
        self,
        model: torch.nn.Module,
        input_size: Tuple[int, int],
        device: str = "cuda"
    ) -> int:
        """
        Determine optimal batch size based on available memory.
        
        Args:
            model: PyTorch model
            input_size: Input image size (H, W)
            device: Device to test on
            
        Returns:
            Optimal batch size
        """
        if device == "cpu":
            return self.batch_size
        
        try:
            # Start with batch size of 1 and increase until OOM
            test_batch_size = 1
            max_batch_size = 32
            
            model = model.to(device)
            model.eval()
            
            while test_batch_size <= max_batch_size:
                try:
                    # Create test batch
                    test_input = torch.randn(
                        test_batch_size, 3, input_size[0], input_size[1]
                    ).to(device)
                    
                    # Try inference
                    with torch.no_grad():
                        _ = model(test_input)
                    
                    # Clear memory
                    del test_input
                    torch.cuda.empty_cache()
                    
                    # Increase batch size
                    test_batch_size *= 2
                    
                except RuntimeError as e:
                    if "out of memory" in str(e):
                        # Found the limit, use previous batch size
                        optimal_size = test_batch_size // 2
                        logger.info(f"Optimal batch size determined: {optimal_size}")
                        return optimal_size
                    raise
            
            return max_batch_size
            
        except Exception as e:
            logger.error(f"Failed to determine optimal batch size: {e}")
            return self.batch_size


class MemoryManager:
    """
    Utilities for memory management and cleanup.
    
    Provides functions to monitor and clean up memory usage during
    ML inference to prevent memory leaks and OOM errors.
    """
    
    @staticmethod
    def cleanup_memory(device: str = "cuda") -> None:
        """
        Perform memory cleanup.
        
        Args:
            device: Device to clean up ("cuda" or "cpu")
        """
        try:
            # Clear CUDA cache if using GPU
            if device == "cuda" and torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                logger.debug("CUDA cache cleared")
            
            # Force garbage collection
            gc.collect()
            logger.debug("Garbage collection completed")
            
        except Exception as e:
            logger.error(f"Memory cleanup failed: {e}")
    
    @staticmethod
    def get_memory_stats(device: str = "cuda") -> Dict[str, Any]:
        """
        Get current memory usage statistics.
        
        Args:
            device: Device to check
            
        Returns:
            Dictionary with memory statistics
        """
        stats = {}
        
        try:
            if device == "cuda" and torch.cuda.is_available():
                stats["device"] = "cuda"
                stats["allocated_mb"] = torch.cuda.memory_allocated(0) / (1024 ** 2)
                stats["reserved_mb"] = torch.cuda.memory_reserved(0) / (1024 ** 2)
                stats["max_allocated_mb"] = torch.cuda.max_memory_allocated(0) / (1024 ** 2)
                stats["total_mb"] = torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
                stats["utilization"] = stats["allocated_mb"] / stats["total_mb"]
            else:
                stats["device"] = "cpu"
                # For CPU, we can use psutil if available
                try:
                    import psutil
                    process = psutil.Process()
                    stats["rss_mb"] = process.memory_info().rss / (1024 ** 2)
                    stats["vms_mb"] = process.memory_info().vms / (1024 ** 2)
                except ImportError:
                    stats["note"] = "Install psutil for detailed CPU memory stats"
            
        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}")
            stats["error"] = str(e)
        
        return stats
    
    @staticmethod
    def check_memory_available(
        required_mb: float,
        device: str = "cuda"
    ) -> bool:
        """
        Check if sufficient memory is available.
        
        Args:
            required_mb: Required memory in MB
            device: Device to check
            
        Returns:
            True if sufficient memory available
        """
        try:
            if device == "cuda" and torch.cuda.is_available():
                available_mb = (
                    torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
                    - torch.cuda.memory_allocated(0) / (1024 ** 2)
                )
                return available_mb >= required_mb
            else:
                # For CPU, assume memory is available
                return True
                
        except Exception as e:
            logger.error(f"Failed to check memory availability: {e}")
            return False
    
    @staticmethod
    def reset_peak_memory_stats(device: str = "cuda") -> None:
        """
        Reset peak memory statistics.
        
        Args:
            device: Device to reset stats for
        """
        try:
            if device == "cuda" and torch.cuda.is_available():
                torch.cuda.reset_peak_memory_stats(0)
                logger.debug("Peak memory stats reset")
        except Exception as e:
            logger.error(f"Failed to reset peak memory stats: {e}")


class PerformanceOptimizer:
    """
    Main class that combines all performance optimization techniques.
    
    Provides a unified interface for applying quantization, caching,
    batch processing, and memory management.
    """
    
    def __init__(
        self,
        enable_quantization: bool = False,
        enable_caching: bool = True,
        cache_size: int = 128,
        batch_size: int = 8,
        device: str = "cpu"
    ):
        """
        Initialize performance optimizer.
        
        Args:
            enable_quantization: Whether to apply model quantization
            enable_caching: Whether to enable prediction caching
            cache_size: Maximum cache size
            batch_size: Batch size for batch processing
            device: Device to use
        """
        self.enable_quantization = enable_quantization
        self.enable_caching = enable_caching
        self.device = device
        
        # Initialize components
        self.quantizer = ModelQuantizer()
        self.cache = PredictionCache(maxsize=cache_size) if enable_caching else None
        self.batch_processor = BatchProcessor(batch_size=batch_size, device=device)
        self.memory_manager = MemoryManager()
        
        logger.info(f"Performance optimizer initialized:")
        logger.info(f"  - Quantization: {enable_quantization}")
        logger.info(f"  - Caching: {enable_caching} (size={cache_size})")
        logger.info(f"  - Batch size: {batch_size}")
        logger.info(f"  - Device: {device}")
    
    def optimize_model(self, model: torch.nn.Module) -> torch.nn.Module:
        """
        Apply optimizations to model.
        
        Args:
            model: Model to optimize
            
        Returns:
            Optimized model
        """
        if self.enable_quantization and self.device == "cpu":
            logger.info("Applying quantization for CPU inference...")
            model = self.quantizer.quantize_dynamic(model)
        
        return model
    
    def get_cached_prediction(
        self,
        image_tensor: torch.Tensor
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached prediction if available.
        
        Args:
            image_tensor: Input image tensor
            
        Returns:
            Cached prediction or None
        """
        if self.cache:
            return self.cache.get(image_tensor)
        return None
    
    def cache_prediction(
        self,
        image_tensor: torch.Tensor,
        prediction: Dict[str, Any]
    ) -> None:
        """
        Cache prediction result.
        
        Args:
            image_tensor: Input image tensor
            prediction: Prediction to cache
        """
        if self.cache:
            self.cache.put(image_tensor, prediction)
    
    def cleanup(self) -> None:
        """Perform cleanup operations."""
        self.memory_manager.cleanup_memory(self.device)
        if self.cache:
            self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get performance statistics.
        
        Returns:
            Dictionary with performance stats
        """
        stats = {
            "quantization_enabled": self.enable_quantization,
            "caching_enabled": self.enable_caching,
            "device": self.device,
            "memory": self.memory_manager.get_memory_stats(self.device)
        }
        
        if self.cache:
            stats["cache"] = self.cache.get_stats()
        
        return stats
