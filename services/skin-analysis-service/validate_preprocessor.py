#!/usr/bin/env python3
"""
Validation script for ImagePreprocessor.

Tests basic functionality of the preprocessor to ensure it works correctly.
"""

import sys
from pathlib import Path
from PIL import Image
import numpy as np
import torch

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.ml.preprocessor import ImagePreprocessor


def test_basic_preprocessing():
    """Test basic preprocessing functionality."""
    print("Testing basic preprocessing...")
    
    # Create a test image
    test_image = Image.new('RGB', (512, 512), color='red')
    
    # Initialize preprocessor
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    
    # Preprocess image
    tensor = preprocessor.preprocess(test_image)
    
    # Verify output shape
    assert tensor.shape == (1, 3, 224, 224), f"Expected shape (1, 3, 224, 224), got {tensor.shape}"
    
    # Verify tensor type
    assert isinstance(tensor, torch.Tensor), "Output should be a torch.Tensor"
    
    print("✓ Basic preprocessing test passed")


def test_batch_preprocessing():
    """Test batch preprocessing functionality."""
    print("Testing batch preprocessing...")
    
    # Create multiple test images
    images = [
        Image.new('RGB', (512, 512), color='red'),
        Image.new('RGB', (256, 256), color='green'),
        Image.new('RGB', (1024, 768), color='blue')
    ]
    
    # Initialize preprocessor
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    
    # Preprocess batch
    batch_tensor = preprocessor.preprocess_batch(images)
    
    # Verify output shape
    assert batch_tensor.shape == (3, 3, 224, 224), f"Expected shape (3, 3, 224, 224), got {batch_tensor.shape}"
    
    print("✓ Batch preprocessing test passed")


def test_image_validation():
    """Test image validation functionality."""
    print("Testing image validation...")
    
    preprocessor = ImagePreprocessor()
    
    # Test valid image
    valid_image = Image.new('RGB', (512, 512), color='red')
    assert preprocessor.validate_image(valid_image), "Valid image should pass validation"
    
    # Test small image (should fail)
    small_image = Image.new('RGB', (30, 30), color='red')
    assert not preprocessor.validate_image(small_image), "Small image should fail validation"
    
    # Test None image (should fail)
    assert not preprocessor.validate_image(None), "None image should fail validation"
    
    print("✓ Image validation test passed")


def test_normalization():
    """Test that normalization is applied correctly."""
    print("Testing normalization...")
    
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    
    # Create a white image
    white_image = Image.new('RGB', (224, 224), color=(255, 255, 255))
    
    # Preprocess
    tensor = preprocessor.preprocess(white_image)
    
    # Check that values are normalized (should not be in [0, 255] range)
    max_val = tensor.max().item()
    min_val = tensor.min().item()
    
    # After normalization with ImageNet stats, white pixels should be around 2.0-2.5
    assert max_val > 1.5 and max_val < 3.0, f"Normalized max value {max_val} seems incorrect"
    
    print("✓ Normalization test passed")


def test_rgb_conversion():
    """Test conversion of different image modes to RGB."""
    print("Testing RGB conversion...")
    
    preprocessor = ImagePreprocessor(target_size=(224, 224))
    
    # Test RGBA image
    rgba_image = Image.new('RGBA', (512, 512), color=(255, 0, 0, 128))
    tensor = preprocessor.preprocess(rgba_image)
    assert tensor.shape == (1, 3, 224, 224), "RGBA image should be converted to RGB"
    
    # Test grayscale image
    gray_image = Image.new('L', (512, 512), color=128)
    tensor = preprocessor.preprocess(gray_image)
    assert tensor.shape == (1, 3, 224, 224), "Grayscale image should be converted to RGB"
    
    print("✓ RGB conversion test passed")


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("ImagePreprocessor Validation")
    print("=" * 60)
    print()
    
    try:
        test_basic_preprocessing()
        test_batch_preprocessing()
        test_image_validation()
        test_normalization()
        test_rgb_conversion()
        
        print()
        print("=" * 60)
        print("✓ All validation tests passed!")
        print("=" * 60)
        return 0
        
    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"✗ Validation failed: {e}")
        print("=" * 60)
        return 1
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ Unexpected error: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
