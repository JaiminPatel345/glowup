#!/usr/bin/env python3
"""
Validation script for performance optimizations.

Tests:
1. Model quantization for CPU inference
2. Prediction caching with LRU cache
3. Batch processing support
4. Memory cleanup utilities
"""

import sys
import time
import torch
import numpy as np
from PIL import Image
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.ml.performance import (
    ModelQuantizer,
    PredictionCache,
    BatchProcessor,
    MemoryManager,
    PerformanceOptimizer
)


def create_dummy_model():
    """Create a simple dummy model for testing."""
    class DummyModel(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = torch.nn.Conv2d(3, 64, 3, padding=1)
            self.conv2 = torch.nn.Conv2d(64, 128, 3, padding=1)
            self.fc1 = torch.nn.Linear(128 * 56 * 56, 256)
            self.fc2 = torch.nn.Linear(256, 5)
            
        def forward(self, x):
            x = torch.relu(self.conv1(x))
            x = torch.nn.functional.max_pool2d(x, 2)
            x = torch.relu(self.conv2(x))
            x = torch.nn.functional.max_pool2d(x, 2)
            x = x.view(x.size(0), -1)
            x = torch.relu(self.fc1(x))
            x = self.fc2(x)
            return x
    
    return DummyModel()


def test_model_quantization():
    """Test 1: Model quantization for CPU inference."""
    print("\n" + "="*60)
    print("TEST 1: Model Quantization")
    print("="*60)
    
    try:
        # Create dummy model
        model = create_dummy_model()
        model.eval()
        
        # Get original model size
        original_size = sum(p.numel() * p.element_size() for p in model.parameters())
        print(f"✓ Created dummy model")
        print(f"  Original size: {original_size / (1024**2):.2f} MB")
        
        # Apply quantization
        quantizer = ModelQuantizer()
        quantized_model = quantizer.quantize_dynamic(model)
        
        # Get quantized model size
        quantized_size = sum(p.numel() * p.element_size() for p in quantized_model.parameters())
        reduction = (1 - quantized_size / original_size) * 100
        
        print(f"✓ Model quantized successfully")
        print(f"  Quantized size: {quantized_size / (1024**2):.2f} MB")
        print(f"  Size reduction: {reduction:.1f}%")
        
        # Test inference with both models
        test_input = torch.randn(1, 3, 224, 224)
        
        # Original model inference
        start = time.time()
        with torch.no_grad():
            _ = model(test_input)
        original_time = time.time() - start
        
        # Quantized model inference
        start = time.time()
        with torch.no_grad():
            _ = quantized_model(test_input)
        quantized_time = time.time() - start
        
        speedup = original_time / quantized_time if quantized_time > 0 else 1.0
        
        print(f"✓ Inference test completed")
        print(f"  Original inference time: {original_time*1000:.2f} ms")
        print(f"  Quantized inference time: {quantized_time*1000:.2f} ms")
        print(f"  Speedup: {speedup:.2f}x")
        
        print("\n✅ Model quantization test PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Model quantization test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_prediction_caching():
    """Test 2: Prediction caching with LRU cache."""
    print("\n" + "="*60)
    print("TEST 2: Prediction Caching")
    print("="*60)
    
    try:
        # Create cache
        cache = PredictionCache(maxsize=10)
        print(f"✓ Created prediction cache with maxsize=10")
        
        # Create test tensors
        test_tensors = [torch.randn(1, 3, 224, 224) for _ in range(5)]
        test_predictions = [
            {"skin_type": f"type_{i}", "confidence": 0.9}
            for i in range(5)
        ]
        
        # Test cache miss
        result = cache.get(test_tensors[0])
        assert result is None, "Expected cache miss"
        print(f"✓ Cache miss works correctly")
        
        # Test cache put and hit
        cache.put(test_tensors[0], test_predictions[0])
        result = cache.get(test_tensors[0])
        assert result is not None, "Expected cache hit"
        assert result["skin_type"] == "type_0", "Cached data mismatch"
        print(f"✓ Cache put and hit work correctly")
        
        # Test LRU eviction
        for i in range(12):
            tensor = torch.randn(1, 3, 224, 224)
            prediction = {"skin_type": f"type_{i}", "confidence": 0.9}
            cache.put(tensor, prediction)
        
        stats = cache.get_stats()
        assert stats["size"] == 10, f"Expected cache size 10, got {stats['size']}"
        print(f"✓ LRU eviction works correctly")
        print(f"  Cache size: {stats['size']}/{stats['maxsize']}")
        print(f"  Utilization: {stats['utilization']*100:.1f}%")
        
        # Test cache clear
        cache.clear()
        stats = cache.get_stats()
        assert stats["size"] == 0, "Cache not cleared"
        print(f"✓ Cache clear works correctly")
        
        print("\n✅ Prediction caching test PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Prediction caching test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_batch_processing():
    """Test 3: Batch processing support."""
    print("\n" + "="*60)
    print("TEST 3: Batch Processing")
    print("="*60)
    
    try:
        # Create batch processor
        batch_processor = BatchProcessor(batch_size=4, device="cpu")
        print(f"✓ Created batch processor with batch_size=4")
        
        # Create test tensors
        num_images = 10
        test_tensors = [torch.randn(1, 3, 224, 224) for _ in range(num_images)]
        print(f"✓ Created {num_images} test tensors")
        
        # Create batches
        batches = batch_processor.create_batch(test_tensors)
        expected_batches = (num_images + 3) // 4  # Ceiling division
        assert len(batches) == expected_batches, f"Expected {expected_batches} batches, got {len(batches)}"
        print(f"✓ Created {len(batches)} batches from {num_images} images")
        
        # Verify batch shapes
        for i, batch in enumerate(batches):
            expected_size = min(4, num_images - i * 4)
            assert batch.shape[0] == expected_size, f"Batch {i} has wrong size"
            assert batch.shape[1:] == (3, 224, 224), f"Batch {i} has wrong shape"
        print(f"✓ All batch shapes are correct")
        
        # Test batch processing with model
        model = create_dummy_model()
        model.eval()
        
        predictions = batch_processor.process_batch(model, batches[0])
        assert len(predictions) == batches[0].shape[0], "Wrong number of predictions"
        print(f"✓ Batch processing with model works correctly")
        print(f"  Processed {len(predictions)} images in batch")
        
        print("\n✅ Batch processing test PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Batch processing test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_memory_management():
    """Test 4: Memory cleanup utilities."""
    print("\n" + "="*60)
    print("TEST 4: Memory Management")
    print("="*60)
    
    try:
        memory_manager = MemoryManager()
        print(f"✓ Created memory manager")
        
        # Get initial memory stats
        stats_before = memory_manager.get_memory_stats("cpu")
        print(f"✓ Retrieved memory stats")
        print(f"  Device: {stats_before.get('device', 'unknown')}")
        
        # Allocate some tensors
        tensors = [torch.randn(1000, 1000) for _ in range(10)]
        print(f"✓ Allocated test tensors")
        
        # Perform cleanup
        memory_manager.cleanup_memory("cpu")
        print(f"✓ Memory cleanup completed")
        
        # Delete tensors
        del tensors
        
        # Get stats after cleanup
        stats_after = memory_manager.get_memory_stats("cpu")
        print(f"✓ Retrieved memory stats after cleanup")
        
        # Test GPU memory stats if available
        if torch.cuda.is_available():
            gpu_stats = memory_manager.get_memory_stats("cuda")
            print(f"✓ GPU memory stats:")
            print(f"  Allocated: {gpu_stats.get('allocated_mb', 0):.2f} MB")
            print(f"  Reserved: {gpu_stats.get('reserved_mb', 0):.2f} MB")
            print(f"  Total: {gpu_stats.get('total_mb', 0):.2f} MB")
            
            # Test memory availability check
            available = memory_manager.check_memory_available(100, "cuda")
            print(f"✓ Memory availability check: {available}")
        else:
            print(f"  GPU not available, skipping GPU tests")
        
        print("\n✅ Memory management test PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Memory management test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_performance_optimizer():
    """Test 5: Integrated performance optimizer."""
    print("\n" + "="*60)
    print("TEST 5: Performance Optimizer Integration")
    print("="*60)
    
    try:
        # Create optimizer with all features enabled
        optimizer = PerformanceOptimizer(
            enable_quantization=True,
            enable_caching=True,
            cache_size=64,
            batch_size=4,
            device="cpu"
        )
        print(f"✓ Created performance optimizer")
        
        # Create and optimize model
        model = create_dummy_model()
        model.eval()
        optimized_model = optimizer.optimize_model(model)
        print(f"✓ Model optimized")
        
        # Test caching
        test_tensor = torch.randn(1, 3, 224, 224)
        test_prediction = {"skin_type": "oily", "confidence": 0.9}
        
        optimizer.cache_prediction(test_tensor, test_prediction)
        cached = optimizer.get_cached_prediction(test_tensor)
        assert cached is not None, "Caching failed"
        print(f"✓ Caching works correctly")
        
        # Get stats
        stats = optimizer.get_stats()
        print(f"✓ Performance stats:")
        print(f"  Quantization enabled: {stats['quantization_enabled']}")
        print(f"  Caching enabled: {stats['caching_enabled']}")
        print(f"  Device: {stats['device']}")
        if 'cache' in stats:
            print(f"  Cache size: {stats['cache']['size']}/{stats['cache']['maxsize']}")
        
        # Test cleanup
        optimizer.cleanup()
        print(f"✓ Cleanup completed")
        
        print("\n✅ Performance optimizer integration test PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Performance optimizer integration test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all validation tests."""
    print("\n" + "="*60)
    print("PERFORMANCE OPTIMIZATIONS VALIDATION")
    print("="*60)
    print("\nThis script validates the performance optimization features:")
    print("1. Model quantization for CPU inference")
    print("2. Prediction caching with LRU cache")
    print("3. Batch processing support")
    print("4. Memory cleanup utilities")
    print("5. Integrated performance optimizer")
    
    results = []
    
    # Run tests
    results.append(("Model Quantization", test_model_quantization()))
    results.append(("Prediction Caching", test_prediction_caching()))
    results.append(("Batch Processing", test_batch_processing()))
    results.append(("Memory Management", test_memory_management()))
    results.append(("Performance Optimizer", test_performance_optimizer()))
    
    # Print summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:.<40} {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL TESTS PASSED")
        print("="*60)
        print("\nPerformance optimizations are working correctly!")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        print("="*60)
        failed_tests = [name for name, passed in results if not passed]
        print(f"\nFailed tests: {', '.join(failed_tests)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
