#!/usr/bin/env python3
"""
Validation script for ML configuration module.

This script validates that the ML configuration is properly set up
and all settings are correctly loaded and validated.
"""

import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.ml_config import MLSettings, ml_settings


def test_ml_settings_initialization():
    """Test that ML settings can be initialized."""
    print("Testing ML settings initialization...")
    try:
        settings = MLSettings()
        print("✓ ML settings initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to initialize ML settings: {e}")
        return False


def test_default_values():
    """Test that default values are set correctly."""
    print("\nTesting default values...")
    try:
        settings = MLSettings()
        
        # Check critical defaults
        assert settings.MODEL_NAME == "efficientnet_b0", f"Expected MODEL_NAME='efficientnet_b0', got '{settings.MODEL_NAME}'"
        assert settings.DEVICE in ["auto", "cuda", "cpu"], f"Invalid DEVICE value: {settings.DEVICE}"
        assert 0.0 <= settings.CONFIDENCE_THRESHOLD <= 1.0, f"Invalid CONFIDENCE_THRESHOLD: {settings.CONFIDENCE_THRESHOLD}"
        assert settings.BATCH_SIZE >= 1, f"Invalid BATCH_SIZE: {settings.BATCH_SIZE}"
        assert settings.INPUT_SIZE == (224, 224), f"Invalid INPUT_SIZE: {settings.INPUT_SIZE}"
        
        print("✓ All default values are valid")
        return True
    except AssertionError as e:
        print(f"✗ Default value validation failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def test_validation_logic():
    """Test that validation logic works correctly."""
    print("\nTesting validation logic...")
    
    # Test invalid confidence threshold
    try:
        MLSettings(CONFIDENCE_THRESHOLD=1.5)
        print("✗ Should have raised error for invalid CONFIDENCE_THRESHOLD")
        return False
    except ValueError as e:
        print(f"✓ Correctly rejected invalid CONFIDENCE_THRESHOLD: {e}")
    
    # Test invalid batch size
    try:
        MLSettings(BATCH_SIZE=0)
        print("✗ Should have raised error for invalid BATCH_SIZE")
        return False
    except ValueError as e:
        print(f"✓ Correctly rejected invalid BATCH_SIZE: {e}")
    
    # Test invalid device
    try:
        MLSettings(DEVICE="invalid")
        print("✗ Should have raised error for invalid DEVICE")
        return False
    except ValueError as e:
        print(f"✓ Correctly rejected invalid DEVICE: {e}")
    
    # Test fallback API validation
    try:
        MLSettings(ENABLE_FALLBACK_API=True, FALLBACK_API_URL=None)
        print("✗ Should have raised error for missing FALLBACK_API_URL")
        return False
    except ValueError as e:
        print(f"✓ Correctly rejected missing FALLBACK_API_URL: {e}")
    
    print("✓ All validation logic tests passed")
    return True


def test_directory_creation():
    """Test that required directories are created."""
    print("\nTesting directory creation...")
    try:
        settings = MLSettings()
        
        # Check HuggingFace cache directory
        hf_cache = Path(settings.HF_CACHE_DIR)
        assert hf_cache.exists(), f"HF_CACHE_DIR not created: {hf_cache}"
        print(f"✓ HuggingFace cache directory exists: {hf_cache}")
        
        # Check model directory
        model_dir = Path(settings.MODEL_PATH).parent
        assert model_dir.exists(), f"Model directory not created: {model_dir}"
        print(f"✓ Model directory exists: {model_dir}")
        
        return True
    except AssertionError as e:
        print(f"✗ Directory creation failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def test_helper_methods():
    """Test helper methods in MLSettings."""
    print("\nTesting helper methods...")
    try:
        settings = MLSettings()
        
        # Test get_model_path
        model_path = settings.get_model_path()
        assert isinstance(model_path, Path), "get_model_path should return Path object"
        print(f"✓ get_model_path() returns: {model_path}")
        
        # Test get_hf_cache_dir
        cache_dir = settings.get_hf_cache_dir()
        assert isinstance(cache_dir, Path), "get_hf_cache_dir should return Path object"
        print(f"✓ get_hf_cache_dir() returns: {cache_dir}")
        
        # Test is_gpu_available
        gpu_available = settings.is_gpu_available()
        assert isinstance(gpu_available, bool), "is_gpu_available should return bool"
        print(f"✓ is_gpu_available() returns: {gpu_available}")
        
        # Test get_device_string
        device_string = settings.get_device_string()
        assert device_string in ["cuda", "cpu"], f"Invalid device string: {device_string}"
        print(f"✓ get_device_string() returns: {device_string}")
        
        # Test should_use_fallback
        should_fallback = settings.should_use_fallback()
        assert isinstance(should_fallback, bool), "should_use_fallback should return bool"
        print(f"✓ should_use_fallback() returns: {should_fallback}")
        
        # Test get_config_summary
        summary = settings.get_config_summary()
        assert isinstance(summary, dict), "get_config_summary should return dict"
        assert "model_name" in summary, "Summary should contain model_name"
        assert "device" in summary, "Summary should contain device"
        print(f"✓ get_config_summary() returns valid dict with {len(summary)} keys")
        
        return True
    except AssertionError as e:
        print(f"✗ Helper method test failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def test_global_instance():
    """Test that global ml_settings instance works."""
    print("\nTesting global ml_settings instance...")
    try:
        # Access global instance
        assert ml_settings is not None, "Global ml_settings should not be None"
        assert isinstance(ml_settings, MLSettings), "Global ml_settings should be MLSettings instance"
        
        # Test accessing properties
        model_name = ml_settings.MODEL_NAME
        device = ml_settings.DEVICE
        confidence = ml_settings.CONFIDENCE_THRESHOLD
        
        print(f"✓ Global ml_settings accessible")
        print(f"  - MODEL_NAME: {model_name}")
        print(f"  - DEVICE: {device}")
        print(f"  - CONFIDENCE_THRESHOLD: {confidence}")
        
        return True
    except Exception as e:
        print(f"✗ Global instance test failed: {e}")
        return False


def test_config_summary():
    """Test configuration summary output."""
    print("\nConfiguration Summary:")
    print("-" * 60)
    try:
        summary = ml_settings.get_config_summary()
        for key, value in summary.items():
            print(f"  {key}: {value}")
        print("-" * 60)
        return True
    except Exception as e:
        print(f"✗ Failed to get config summary: {e}")
        return False


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("ML Configuration Validation")
    print("=" * 60)
    
    tests = [
        test_ml_settings_initialization,
        test_default_values,
        test_validation_logic,
        test_directory_creation,
        test_helper_methods,
        test_global_instance,
        test_config_summary,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n✗ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    print("Validation Summary")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("\n✓ All validation tests passed!")
        print("\nML configuration is properly set up and ready to use.")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        print("\nPlease review the errors above and fix the configuration.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
