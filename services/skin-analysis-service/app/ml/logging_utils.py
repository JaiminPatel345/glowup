"""
Structured logging utilities for ML components.

Provides consistent logging with timing metrics, performance tracking,
and structured log formatting for all ML operations.
"""

import logging
import time
import functools
from typing import Any, Callable, Dict, Optional
from contextlib import contextmanager
import json

logger = logging.getLogger(__name__)


class MLLogger:
    """
    Structured logger for ML operations with timing and metrics tracking.
    
    Provides consistent logging format across all ML components with
    automatic timing, performance metrics, and structured data.
    """
    
    def __init__(self, component_name: str):
        """
        Initialize ML logger for a specific component.
        
        Args:
            component_name: Name of the ML component (e.g., "ModelManager", "Preprocessor")
        """
        self.component_name = component_name
        self.logger = logging.getLogger(f"ml.{component_name}")
        self._operation_times = {}
        self._operation_counts = {}
    
    def log_operation_start(self, operation: str, **kwargs):
        """
        Log the start of an ML operation.
        
        Args:
            operation: Name of the operation (e.g., "model_loading", "inference")
            **kwargs: Additional context to log
        """
        context = self._format_context(kwargs)
        self.logger.info(f"[{self.component_name}] Starting {operation}{context}")
    
    def log_operation_complete(
        self,
        operation: str,
        duration: float,
        success: bool = True,
        **kwargs
    ):
        """
        Log the completion of an ML operation with timing.
        
        Args:
            operation: Name of the operation
            duration: Duration in seconds
            success: Whether operation succeeded
            **kwargs: Additional metrics and context
        """
        # Track operation metrics
        if operation not in self._operation_times:
            self._operation_times[operation] = []
            self._operation_counts[operation] = 0
        
        self._operation_times[operation].append(duration)
        self._operation_counts[operation] += 1
        
        # Format log message
        status = "completed" if success else "failed"
        context = self._format_context(kwargs)
        
        log_message = (
            f"[{self.component_name}] {operation} {status} "
            f"in {duration:.3f}s{context}"
        )
        
        if success:
            self.logger.info(log_message)
        else:
            self.logger.error(log_message)
    
    def log_error(
        self,
        operation: str,
        error: Exception,
        **kwargs
    ):
        """
        Log an error during ML operation.
        
        Args:
            operation: Name of the operation that failed
            error: Exception that occurred
            **kwargs: Additional error context
        """
        context = self._format_context(kwargs)
        error_type = type(error).__name__
        
        self.logger.error(
            f"[{self.component_name}] {operation} failed: "
            f"{error_type}: {error}{context}",
            exc_info=True
        )
    
    def log_warning(self, message: str, **kwargs):
        """
        Log a warning message.
        
        Args:
            message: Warning message
            **kwargs: Additional context
        """
        context = self._format_context(kwargs)
        self.logger.warning(f"[{self.component_name}] {message}{context}")
    
    def log_metric(self, metric_name: str, value: Any, **kwargs):
        """
        Log a performance metric.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            **kwargs: Additional context
        """
        context = self._format_context(kwargs)
        self.logger.info(
            f"[{self.component_name}] Metric: {metric_name}={value}{context}"
        )
    
    def log_memory_usage(self, device: str, allocated_mb: float, reserved_mb: Optional[float] = None):
        """
        Log memory usage information.
        
        Args:
            device: Device name (e.g., "cuda", "cpu")
            allocated_mb: Allocated memory in MB
            reserved_mb: Reserved memory in MB (for GPU)
        """
        if reserved_mb is not None:
            self.logger.info(
                f"[{self.component_name}] Memory usage on {device}: "
                f"allocated={allocated_mb:.2f}MB, reserved={reserved_mb:.2f}MB"
            )
        else:
            self.logger.info(
                f"[{self.component_name}] Memory usage on {device}: "
                f"allocated={allocated_mb:.2f}MB"
            )
    
    def get_operation_stats(self, operation: str) -> Dict[str, Any]:
        """
        Get statistics for a specific operation.
        
        Args:
            operation: Name of the operation
            
        Returns:
            Dictionary with operation statistics
        """
        if operation not in self._operation_times:
            return {
                "count": 0,
                "total_time": 0.0,
                "avg_time": 0.0,
                "min_time": 0.0,
                "max_time": 0.0
            }
        
        times = self._operation_times[operation]
        return {
            "count": self._operation_counts[operation],
            "total_time": sum(times),
            "avg_time": sum(times) / len(times),
            "min_time": min(times),
            "max_time": max(times)
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """
        Get statistics for all tracked operations.
        
        Returns:
            Dictionary mapping operation names to their statistics
        """
        return {
            operation: self.get_operation_stats(operation)
            for operation in self._operation_times.keys()
        }
    
    def reset_stats(self):
        """Reset all tracked statistics."""
        self._operation_times.clear()
        self._operation_counts.clear()
        self.logger.info(f"[{self.component_name}] Statistics reset")
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """
        Format context dictionary for logging.
        
        Args:
            context: Dictionary of context information
            
        Returns:
            Formatted context string
        """
        if not context:
            return ""
        
        # Format context items
        items = [f"{k}={v}" for k, v in context.items()]
        return f" | {', '.join(items)}"


@contextmanager
def log_operation(
    logger: MLLogger,
    operation: str,
    log_success: bool = True,
    log_failure: bool = True,
    **context
):
    """
    Context manager for logging ML operations with automatic timing.
    
    Usage:
        with log_operation(logger, "inference", device="cuda"):
            result = model.predict(input)
    
    Args:
        logger: MLLogger instance
        operation: Name of the operation
        log_success: Whether to log successful completion
        log_failure: Whether to log failures
        **context: Additional context to include in logs
    """
    start_time = time.time()
    logger.log_operation_start(operation, **context)
    
    try:
        yield
        duration = time.time() - start_time
        
        if log_success:
            logger.log_operation_complete(operation, duration, success=True, **context)
    
    except Exception as e:
        duration = time.time() - start_time
        
        if log_failure:
            logger.log_error(operation, e, duration=duration, **context)
        
        raise


def log_timing(operation_name: Optional[str] = None):
    """
    Decorator for logging function execution time.
    
    Usage:
        @log_timing("model_inference")
        def predict(self, input):
            return self.model(input)
    
    Args:
        operation_name: Optional custom operation name (defaults to function name)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get logger from self if available
            ml_logger = None
            if args and hasattr(args[0], '_logger'):
                ml_logger = args[0]._logger
            
            op_name = operation_name or func.__name__
            start_time = time.time()
            
            if ml_logger:
                ml_logger.log_operation_start(op_name)
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if ml_logger:
                    ml_logger.log_operation_complete(op_name, duration, success=True)
                else:
                    logger.info(f"{op_name} completed in {duration:.3f}s")
                
                return result
            
            except Exception as e:
                duration = time.time() - start_time
                
                if ml_logger:
                    ml_logger.log_error(op_name, e, duration=duration)
                else:
                    logger.error(f"{op_name} failed after {duration:.3f}s: {e}")
                
                raise
        
        return wrapper
    return decorator


def log_performance_metrics(
    logger: MLLogger,
    operation: str,
    metrics: Dict[str, Any]
):
    """
    Log multiple performance metrics for an operation.
    
    Args:
        logger: MLLogger instance
        operation: Name of the operation
        metrics: Dictionary of metric names to values
    """
    for metric_name, value in metrics.items():
        logger.log_metric(f"{operation}.{metric_name}", value)


def format_timing_summary(stats: Dict[str, Dict[str, Any]]) -> str:
    """
    Format timing statistics into a readable summary.
    
    Args:
        stats: Statistics dictionary from MLLogger.get_all_stats()
        
    Returns:
        Formatted summary string
    """
    if not stats:
        return "No timing statistics available"
    
    lines = ["Timing Statistics Summary:", "=" * 60]
    
    for operation, op_stats in stats.items():
        lines.append(f"\n{operation}:")
        lines.append(f"  Count: {op_stats['count']}")
        lines.append(f"  Total Time: {op_stats['total_time']:.3f}s")
        lines.append(f"  Average Time: {op_stats['avg_time']:.3f}s")
        lines.append(f"  Min Time: {op_stats['min_time']:.3f}s")
        lines.append(f"  Max Time: {op_stats['max_time']:.3f}s")
    
    lines.append("=" * 60)
    return "\n".join(lines)


class PerformanceTracker:
    """
    Track and aggregate performance metrics across ML operations.
    """
    
    def __init__(self):
        """Initialize performance tracker."""
        self.metrics = {}
        self.logger = MLLogger("PerformanceTracker")
    
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """
        Record a performance metric.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            tags: Optional tags for categorization
        """
        if metric_name not in self.metrics:
            self.metrics[metric_name] = []
        
        self.metrics[metric_name].append({
            "value": value,
            "timestamp": time.time(),
            "tags": tags or {}
        })
    
    def get_metric_summary(self, metric_name: str) -> Dict[str, Any]:
        """
        Get summary statistics for a metric.
        
        Args:
            metric_name: Name of the metric
            
        Returns:
            Dictionary with summary statistics
        """
        if metric_name not in self.metrics:
            return {}
        
        values = [m["value"] for m in self.metrics[metric_name]]
        
        return {
            "count": len(values),
            "mean": sum(values) / len(values),
            "min": min(values),
            "max": max(values),
            "total": sum(values)
        }
    
    def export_metrics(self) -> Dict[str, Any]:
        """
        Export all metrics for external monitoring systems.
        
        Returns:
            Dictionary with all metrics and summaries
        """
        return {
            metric_name: {
                "data": self.metrics[metric_name],
                "summary": self.get_metric_summary(metric_name)
            }
            for metric_name in self.metrics.keys()
        }
    
    def clear_metrics(self):
        """Clear all recorded metrics."""
        self.metrics.clear()
        self.logger.log_operation_complete("clear_metrics", 0.0)
