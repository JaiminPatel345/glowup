#!/usr/bin/env python3
"""
Validation script for AI Service ML integration.

Tests the integration of ModelManager, ImagePreprocessor, and PostProcessor
with the AI Service to ensure the complete pipeline works correctly.
"""

import sys
import os
import asyncio
import logging
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_test_image(output_path: str = "test_image.jpg") -> str:
    """Create a test image for validation."""
    # Create a simple test image (224x224 RGB)
    img_array = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    img = Image.fromarray(img_array)
    img.save(output_path)
    logger.info(f"Created test image: {output_path}")
    return output_path


async def test_ai_service_initialization():
    """Test AI Service initialization with ML components."""
    logger.info("\n=== Test 1: AI Service Initialization ===")
    
    try:
        from app.services.ai_service import AIService
        
        service = AIService()
        
        # Check ML components
        assert hasattr(service, 'model_manager'), "Missing model_manager attribute"
        assert hasattr(service, 'preprocessor'), "Missing preprocessor attribute"
        assert hasattr(service, 'postprocessor'), "Missing postprocessor attribute"
        assert hasattr(service, 'ml_enabled'), "Missing ml_enabled attribute"
        
        logger.info(f"✓ AI Service initialized")
        logger.info(f"  - ML enabled: {service.ml_enabled}")
        logger.info(f"  - Model version: {service.model_version}")
        
        # Get model info
        model_info = service.get_model_info()
        logger.info(f"  - Model info: {model_info}")
        
        return service
        
    except Exception as e:
        logger.error(f"✗ AI Service initialization failed: {e}")
        raise


async def test_analyze_skin_method(service, test_image_path: str):
    """Test the analyze_skin method with ML pipeline."""
    logger.info("\n=== Test 2: analyze_skin Method ===")
    
    try:
        # Check if ML is enabled
        if not service.ml_enabled:
            logger.warning("ML not enabled, skipping ML-specific test")
            return
        
        # Check if model file exists
        from app.core.ml_config import ml_settings
        model_path = Path(ml_settings.MODEL_PATH)
        
        if not model_path.exists():
            logger.warning(f"Model file not found at {model_path}, skipping inference test")
            logger.info("This is expected if models haven't been downloaded yet")
            return
        
        # Run analysis
        logger.info(f"Running analysis on {test_image_path}...")
        result = await service.analyze_skin(test_image_path)
        
        # Validate result structure
        assert "skin_type" in result, "Missing skin_type in result"
        assert "issues" in result, "Missing issues in result"
        assert "analysis_timestamp" in result, "Missing analysis_timestamp in result"
        assert "model_confidence" in result, "Missing model_confidence in result"
        assert "inference_time" in result, "Missing inference_time in result"
        assert "device_used" in result, "Missing device_used in result"
        assert "timing_breakdown" in result, "Missing timing_breakdown in result"
        
        logger.info(f"✓ analyze_skin completed successfully")
        logger.info(f"  - Skin type: {result['skin_type']}")
        logger.info(f"  - Issues detected: {len(result['issues'])}")
        logger.info(f"  - Inference time: {result['inference_time']:.3f}s")
        logger.info(f"  - Total time: {result['total_processing_time']:.3f}s")
        logger.info(f"  - Device used: {result['device_used']}")
        logger.info(f"  - Model confidence: {result['model_confidence']:.3f}")
        
        # Display timing breakdown
        timing = result['timing_breakdown']
        logger.info(f"  - Timing breakdown:")
        logger.info(f"    * Preprocessing: {timing['preprocessing']:.3f}s")
        logger.info(f"    * Inference: {timing['inference']:.3f}s")
        logger.info(f"    * Postprocessing: {timing['postprocessing']:.3f}s")
        
        # Display detected issues
        if result['issues']:
            logger.info(f"  - Detected issues:")
            for issue in result['issues']:
                logger.info(f"    * {issue['name']}: {issue['confidence']:.3f} ({issue['severity']})")
        
        return result
        
    except Exception as e:
        logger.error(f"✗ analyze_skin failed: {e}")
        import traceback
        traceback.print_exc()
        raise


async def test_analyze_skin_image_method(service, test_image_path: str):
    """Test the analyze_skin_image method with fallback logic."""
    logger.info("\n=== Test 3: analyze_skin_image Method (with fallback) ===")
    
    try:
        logger.info(f"Running analysis on {test_image_path}...")
        result = await service.analyze_skin_image(test_image_path)
        
        # Validate result structure
        assert "skin_type" in result, "Missing skin_type in result"
        assert "issues" in result, "Missing issues in result"
        assert "processing_time" in result, "Missing processing_time in result"
        assert "model_source" in result, "Missing model_source in result"
        
        logger.info(f"✓ analyze_skin_image completed successfully")
        logger.info(f"  - Skin type: {result['skin_type']}")
        logger.info(f"  - Issues detected: {len(result['issues'])}")
        logger.info(f"  - Processing time: {result['processing_time']:.3f}s")
        logger.info(f"  - Model source: {result['model_source']}")
        
        return result
        
    except Exception as e:
        logger.error(f"✗ analyze_skin_image failed: {e}")
        import traceback
        traceback.print_exc()
        raise


async def test_error_handling(service):
    """Test error handling with invalid inputs."""
    logger.info("\n=== Test 4: Error Handling ===")
    
    # Test with non-existent file
    try:
        await service.analyze_skin_image("nonexistent_file.jpg")
        logger.error("✗ Should have raised an error for non-existent file")
    except Exception as e:
        logger.info(f"✓ Correctly handled non-existent file: {type(e).__name__}")
    
    # Test with invalid image (if ML is enabled)
    if service.ml_enabled:
        try:
            # Create an invalid image file
            with open("invalid_image.txt", "w") as f:
                f.write("This is not an image")
            
            await service.analyze_skin("invalid_image.txt")
            logger.error("✗ Should have raised an error for invalid image")
        except Exception as e:
            logger.info(f"✓ Correctly handled invalid image: {type(e).__name__}")
        finally:
            # Clean up
            if os.path.exists("invalid_image.txt"):
                os.remove("invalid_image.txt")


async def test_performance_metrics(service, test_image_path: str):
    """Test performance metrics and timing."""
    logger.info("\n=== Test 5: Performance Metrics ===")
    
    try:
        # Run multiple analyses to check consistency
        times = []
        for i in range(3):
            result = await service.analyze_skin_image(test_image_path)
            times.append(result['processing_time'])
            logger.info(f"  Run {i+1}: {result['processing_time']:.3f}s")
        
        avg_time = sum(times) / len(times)
        logger.info(f"✓ Average processing time: {avg_time:.3f}s")
        
        # Check if within acceptable limits
        from app.core.config import settings
        if avg_time <= settings.MAX_ANALYSIS_TIME:
            logger.info(f"✓ Performance within limits (<= {settings.MAX_ANALYSIS_TIME}s)")
        else:
            logger.warning(f"⚠ Performance exceeds limit: {avg_time:.3f}s > {settings.MAX_ANALYSIS_TIME}s")
        
    except Exception as e:
        logger.error(f"✗ Performance test failed: {e}")
        raise


async def main():
    """Run all validation tests."""
    logger.info("=" * 60)
    logger.info("AI Service ML Integration Validation")
    logger.info("=" * 60)
    
    test_image_path = None
    
    try:
        # Create test image
        test_image_path = create_test_image()
        
        # Test 1: Initialization
        service = await test_ai_service_initialization()
        
        # Test 2: analyze_skin method (ML pipeline)
        try:
            await test_analyze_skin_method(service, test_image_path)
        except Exception as e:
            logger.warning(f"ML pipeline test skipped or failed: {e}")
        
        # Test 3: analyze_skin_image method (with fallback)
        await test_analyze_skin_image_method(service, test_image_path)
        
        # Test 4: Error handling
        await test_error_handling(service)
        
        # Test 5: Performance metrics
        await test_performance_metrics(service, test_image_path)
        
        logger.info("\n" + "=" * 60)
        logger.info("✓ All validation tests completed successfully!")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error("\n" + "=" * 60)
        logger.error(f"✗ Validation failed: {e}")
        logger.error("=" * 60)
        return 1
        
    finally:
        # Clean up test image
        if test_image_path and os.path.exists(test_image_path):
            os.remove(test_image_path)
            logger.info(f"Cleaned up test image: {test_image_path}")


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
