#!/usr/bin/env python3
"""
Example usage of ML configuration module.

This script demonstrates how to use the ML configuration
in your code for model management and inference.
"""

import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.ml_config import ml_settings, MLSettings


def example_basic_usage():
    """Example: Basic usage of ML settings."""
    print("=" * 60)
    print("Example 1: Basic Usage")
    print("=" * 60)
    
    # Access global settings instance
    print(f"Model Name: {ml_settings.MODEL_NAME}")
    print(f"Model Path: {ml_settings.MODEL_PATH}")
    print(f"Device: {ml_settings.get_device_string()}")
    print(f"Confidence Threshold: {ml_settings.CONFIDENCE_THRESHOLD}")
    print(f"Batch Size: {ml_settings.BATCH_SIZE}")
    print()


def example_device_detection():
    """Example: Device detection and configuration."""
    print("=" * 60)
    print("Example 2: Device Detection")
    print("=" * 60)
    
    # Check if GPU is available
    if ml_settings.is_gpu_available():
        print("✓ GPU is available and enabled")
        print(f"  Device: {ml_settings.get_device_string()}")
        print(f"  GPU Memory Fraction: {ml_settings.GPU_MEMORY_FRACTION}")
    else:
        print("✓ Using CPU")
        print(f"  Device: {ml_settings.get_device_string()}")
    
    print()


def example_path_helpers():
    """Example: Using path helper methods."""
    print("=" * 60)
    print("Example 3: Path Helpers")
    print("=" * 60)
    
    # Get model path
    model_path = ml_settings.get_model_path()
    print(f"Model Path: {model_path}")
    print(f"Model Exists: {model_path.exists()}")
    
    # Get HuggingFace cache directory
    cache_dir = ml_settings.get_hf_cache_dir()
    print(f"HF Cache Dir: {cache_dir}")
    print(f"Cache Dir Exists: {cache_dir.exists()}")
    
    print()


def example_fallback_logic():
    """Example: Fallback API logic."""
    print("=" * 60)
    print("Example 4: Fallback API Logic")
    print("=" * 60)
    
    print(f"Fallback Enabled: {ml_settings.ENABLE_FALLBACK_API}")
    
    if ml_settings.ENABLE_FALLBACK_API:
        print(f"Fallback URL: {ml_settings.FALLBACK_API_URL}")
        print(f"Fallback on Error: {ml_settings.FALLBACK_ON_ERROR}")
        print(f"Fallback on Low Confidence: {ml_settings.FALLBACK_ON_LOW_CONFIDENCE}")
        
        # Simulate error scenario
        error = Exception("Model inference failed")
        if ml_settings.should_use_fallback(error=error):
            print("✓ Would use fallback API due to error")
        
        # Simulate low confidence scenario
        low_confidence = 0.5
        if ml_settings.should_use_fallback(confidence=low_confidence):
            print("✓ Would use fallback API due to low confidence")
        else:
            print("✓ Would not use fallback API (confidence acceptable)")
    else:
        print("✓ Fallback API is disabled")
    
    print()


def example_config_summary():
    """Example: Getting configuration summary."""
    print("=" * 60)
    print("Example 5: Configuration Summary")
    print("=" * 60)
    
    summary = ml_settings.get_config_summary()
    
    print("Current Configuration:")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    
    print()


def example_custom_settings():
    """Example: Creating custom settings instance."""
    print("=" * 60)
    print("Example 6: Custom Settings Instance")
    print("=" * 60)
    
    # Create custom settings for testing
    custom_settings = MLSettings(
        MODEL_NAME="resnet50",
        DEVICE="cpu",
        CONFIDENCE_THRESHOLD=0.8,
        BATCH_SIZE=4,
        ENABLE_QUANTIZATION=True
    )
    
    print("Custom Settings:")
    print(f"  Model Name: {custom_settings.MODEL_NAME}")
    print(f"  Device: {custom_settings.get_device_string()}")
    print(f"  Confidence: {custom_settings.CONFIDENCE_THRESHOLD}")
    print(f"  Batch Size: {custom_settings.BATCH_SIZE}")
    print(f"  Quantization: {custom_settings.ENABLE_QUANTIZATION}")
    
    print()


def example_inference_configuration():
    """Example: Configuration for inference."""
    print("=" * 60)
    print("Example 7: Inference Configuration")
    print("=" * 60)
    
    print("Inference Settings:")
    print(f"  Input Size: {ml_settings.INPUT_SIZE}")
    print(f"  Confidence Threshold: {ml_settings.CONFIDENCE_THRESHOLD}")
    print(f"  Min Confidence: {ml_settings.MIN_CONFIDENCE_THRESHOLD}")
    print(f"  Max Confidence: {ml_settings.MAX_CONFIDENCE_THRESHOLD}")
    print(f"  Max Inference Time: {ml_settings.MAX_INFERENCE_TIME}s")
    
    print("\nPreprocessing:")
    print(f"  Normalize Mean: {ml_settings.NORMALIZE_MEAN}")
    print(f"  Normalize Std: {ml_settings.NORMALIZE_STD}")
    print(f"  Augmentation: {ml_settings.ENABLE_AUGMENTATION}")
    
    print("\nPost-processing:")
    print(f"  Highlighted Images: {ml_settings.ENABLE_HIGHLIGHTED_IMAGES}")
    print(f"  Highlight Color: {ml_settings.HIGHLIGHT_COLOR}")
    print(f"  Highlight Alpha: {ml_settings.HIGHLIGHT_ALPHA}")
    
    print()


def example_optimization_settings():
    """Example: Performance optimization settings."""
    print("=" * 60)
    print("Example 8: Optimization Settings")
    print("=" * 60)
    
    print("Performance Optimization:")
    print(f"  Lazy Loading: {ml_settings.LAZY_LOADING}")
    print(f"  Preload Model: {ml_settings.PRELOAD_MODEL}")
    print(f"  Model Cache Size: {ml_settings.MODEL_CACHE_SIZE}")
    print(f"  Quantization: {ml_settings.ENABLE_QUANTIZATION}")
    print(f"  ONNX: {ml_settings.ENABLE_ONNX}")
    
    print("\nMonitoring:")
    print(f"  Log Inference Time: {ml_settings.LOG_INFERENCE_TIME}")
    print(f"  Log Memory Usage: {ml_settings.LOG_MEMORY_USAGE}")
    print(f"  Enable Metrics: {ml_settings.ENABLE_METRICS}")
    
    print()


def example_error_handling():
    """Example: Error handling configuration."""
    print("=" * 60)
    print("Example 9: Error Handling")
    print("=" * 60)
    
    print("Error Handling Settings:")
    print(f"  Retry on Error: {ml_settings.RETRY_ON_ERROR}")
    print(f"  Max Retries: {ml_settings.MAX_RETRIES}")
    print(f"  Retry Delay: {ml_settings.RETRY_DELAY}s")
    
    print("\nDebug Settings:")
    print(f"  Debug Mode: {ml_settings.DEBUG_MODE}")
    print(f"  Save Preprocessed Images: {ml_settings.SAVE_PREPROCESSED_IMAGES}")
    print(f"  Save Attention Maps: {ml_settings.SAVE_ATTENTION_MAPS}")
    
    print()


def main():
    """Run all examples."""
    print("\n")
    print("*" * 60)
    print("ML Configuration Usage Examples")
    print("*" * 60)
    print()
    
    examples = [
        example_basic_usage,
        example_device_detection,
        example_path_helpers,
        example_fallback_logic,
        example_config_summary,
        example_custom_settings,
        example_inference_configuration,
        example_optimization_settings,
        example_error_handling,
    ]
    
    for example in examples:
        try:
            example()
        except Exception as e:
            print(f"Error in {example.__name__}: {e}\n")
    
    print("*" * 60)
    print("Examples Complete")
    print("*" * 60)
    print()


if __name__ == "__main__":
    main()
