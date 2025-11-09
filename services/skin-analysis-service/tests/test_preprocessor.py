"""
Unit tests for ImagePreprocessor.

Tests image preprocessing functionality including resizing, normalization,
tensor conversion, and batch processing.
"""

import pytest
import torch
import numpy as np
from PIL import Image

from app.ml.preprocessor import ImagePreprocessor


class TestImagePreprocessor:
    """Test suite for ImagePreprocessor class."""
    
    @pytest.fixture
    def preprocessor(self):
        """Create a preprocessor instance with default settings."""
        return ImagePreprocessor(target_size=(224, 224))
    
    @pytest.fixture
    def custom_preprocessor(self):
        """Create a preprocessor instance with custom target size."""
        return ImagePreprocessor(target_size=(256, 256))
    
    @pytest.fixture
    def sample_rgb_image(self):
        """Create a sample RGB image."""
        # Create a 512x512 RGB image with random colors
        image_array = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        return Image.fromarray(image_array, mode='RGB')
    
    @pytest.fixture
    def sample_rgba_image(self):
        """Create a sample RGBA image."""
        # Create a 512x512 RGBA image
        image_array = np.random.randint(0, 255, (512, 512, 4), dtype=np.uint8)
        return Image.fromarray(image_array, mode='RGBA')
    
    @pytest.fixture
    def sample_grayscale_image(self):
        """Create a sample grayscale image."""
        # Create a 512x512 grayscale image
        image_array = np.random.randint(0, 255, (512, 512), dtype=np.uint8)
        return Image.fromarray(image_array, mode='L')
    
    @pytest.fixture
    def small_image(self):
        """Create a small image (below minimum size)."""
        image_array = np.random.randint(0, 255, (30, 30, 3), dtype=np.uint8)
        return Image.fromarray(image_array, mode='RGB')
    
    @pytest.fixture
    def large_image(self):
        """Create a large image."""
        image_array = np.random.randint(0, 255, (1024, 1024, 3), dtype=np.uint8)
        return Image.fromarray(image_array, mode='RGB')
    
    # Test initialization
    def test_preprocessor_initialization_default(self):
        """Test preprocessor initialization with default parameters."""
        preprocessor = ImagePreprocessor()
        
        assert preprocessor.target_size == (224, 224)
        assert preprocessor.mean == [0.485, 0.456, 0.406]
        assert preprocessor.std == [0.229, 0.224, 0.225]
        assert preprocessor.transform is not None
    
    def test_preprocessor_initialization_custom_size(self):
        """Test preprocessor initialization with custom target size."""
        preprocessor = ImagePreprocessor(target_size=(256, 256))
        
        assert preprocessor.target_size == (256, 256)
    
    # Test image resizing
    def test_preprocess_resizes_to_target_dimensions(self, preprocessor, sample_rgb_image):
        """Test that preprocessing resizes image to target dimensions."""
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        # Check tensor shape: (batch_size, channels, height, width)
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_custom_size_resizing(self, custom_preprocessor, sample_rgb_image):
        """Test resizing with custom target size."""
        tensor = custom_preprocessor.preprocess(sample_rgb_image)
        
        assert tensor.shape == (1, 3, 256, 256)
    
    def test_preprocess_large_image_resizing(self, preprocessor, large_image):
        """Test that large images are properly resized."""
        tensor = preprocessor.preprocess(large_image)
        
        assert tensor.shape == (1, 3, 224, 224)
    
    # Test normalization
    def test_preprocess_applies_normalization(self, preprocessor, sample_rgb_image):
        """Test that ImageNet normalization is applied."""
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        # Remove batch dimension for checking
        tensor_no_batch = tensor.squeeze(0)
        
        # Check that values are normalized (should be roughly in range [-3, 3])
        # ImageNet normalization typically produces values in this range
        assert tensor_no_batch.min() >= -5.0
        assert tensor_no_batch.max() <= 5.0
        
        # Check that tensor is not in [0, 1] range (which would indicate no normalization)
        # At least some values should be negative due to normalization
        assert (tensor_no_batch < 0).any()
    
    def test_normalization_statistics(self, preprocessor):
        """Test that correct ImageNet statistics are used."""
        assert preprocessor.mean == [0.485, 0.456, 0.406]
        assert preprocessor.std == [0.229, 0.224, 0.225]
    
    # Test tensor conversion
    def test_preprocess_returns_tensor(self, preprocessor, sample_rgb_image):
        """Test that preprocessing returns a PyTorch tensor."""
        result = preprocessor.preprocess(sample_rgb_image)
        
        assert isinstance(result, torch.Tensor)
    
    def test_preprocess_tensor_dtype(self, preprocessor, sample_rgb_image):
        """Test that tensor has correct data type."""
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        assert tensor.dtype == torch.float32
    
    def test_preprocess_adds_batch_dimension(self, preprocessor, sample_rgb_image):
        """Test that batch dimension is added."""
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        # Should have 4 dimensions: (batch, channels, height, width)
        assert tensor.dim() == 4
        assert tensor.shape[0] == 1  # Batch size of 1
    
    def test_preprocess_channel_order(self, preprocessor, sample_rgb_image):
        """Test that channels are in correct order (RGB)."""
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        # Should have 3 channels (RGB)
        assert tensor.shape[1] == 3
    
    # Test image format conversion
    def test_preprocess_converts_rgba_to_rgb(self, preprocessor, sample_rgba_image):
        """Test that RGBA images are converted to RGB."""
        tensor = preprocessor.preprocess(sample_rgba_image)
        
        # Should have 3 channels after conversion
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_converts_grayscale_to_rgb(self, preprocessor, sample_grayscale_image):
        """Test that grayscale images are converted to RGB."""
        tensor = preprocessor.preprocess(sample_grayscale_image)
        
        # Should have 3 channels after conversion
        assert tensor.shape == (1, 3, 224, 224)
    
    # Test invalid image handling
    def test_preprocess_rejects_none_image(self, preprocessor):
        """Test that None image is rejected."""
        with pytest.raises(ValueError, match="Invalid image format or quality"):
            preprocessor.preprocess(None)
    
    def test_preprocess_rejects_small_image(self, preprocessor, small_image):
        """Test that images below minimum size are rejected."""
        with pytest.raises(ValueError, match="Invalid image format or quality"):
            preprocessor.preprocess(small_image)
    
    def test_validate_image_returns_false_for_none(self, preprocessor):
        """Test that validate_image returns False for None."""
        assert preprocessor.validate_image(None) is False
    
    def test_validate_image_returns_false_for_small_image(self, preprocessor, small_image):
        """Test that validate_image returns False for small images."""
        assert preprocessor.validate_image(small_image) is False
    
    def test_validate_image_returns_true_for_valid_image(self, preprocessor, sample_rgb_image):
        """Test that validate_image returns True for valid images."""
        assert preprocessor.validate_image(sample_rgb_image) is True
    
    def test_validate_image_checks_minimum_dimensions(self, preprocessor):
        """Test that images must be at least 50x50 pixels."""
        # Create images at boundary
        valid_image = Image.fromarray(
            np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8), mode='RGB'
        )
        invalid_image = Image.fromarray(
            np.random.randint(0, 255, (49, 49, 3), dtype=np.uint8), mode='RGB'
        )
        
        assert preprocessor.validate_image(valid_image) is True
        assert preprocessor.validate_image(invalid_image) is False
    
    # Test batch preprocessing
    def test_preprocess_batch_multiple_images(self, preprocessor, sample_rgb_image):
        """Test batch preprocessing with multiple images."""
        images = [sample_rgb_image, sample_rgb_image, sample_rgb_image]
        
        batch_tensor = preprocessor.preprocess_batch(images)
        
        # Should have shape (batch_size, channels, height, width)
        assert batch_tensor.shape == (3, 3, 224, 224)
    
    def test_preprocess_batch_single_image(self, preprocessor, sample_rgb_image):
        """Test batch preprocessing with single image."""
        images = [sample_rgb_image]
        
        batch_tensor = preprocessor.preprocess_batch(images)
        
        assert batch_tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_batch_empty_list(self, preprocessor):
        """Test batch preprocessing with empty list."""
        images = []
        
        # Empty list should raise RuntimeError from torch.stack
        with pytest.raises(RuntimeError, match="stack expects a non-empty TensorList"):
            preprocessor.preprocess_batch(images)
    
    def test_preprocess_batch_converts_formats(self, preprocessor, sample_rgba_image, sample_grayscale_image):
        """Test that batch preprocessing converts different image formats."""
        images = [sample_rgba_image, sample_grayscale_image]
        
        batch_tensor = preprocessor.preprocess_batch(images)
        
        # All images should be converted to RGB (3 channels)
        assert batch_tensor.shape == (2, 3, 224, 224)
    
    def test_preprocess_batch_consistency(self, preprocessor, sample_rgb_image):
        """Test that batch preprocessing produces same results as individual preprocessing."""
        # Preprocess individually
        tensor1 = preprocessor.preprocess(sample_rgb_image).squeeze(0)
        
        # Preprocess in batch
        batch_tensor = preprocessor.preprocess_batch([sample_rgb_image])
        tensor2 = batch_tensor[0]
        
        # Results should be identical
        assert torch.allclose(tensor1, tensor2, atol=1e-6)
    
    def test_preprocess_batch_different_sizes(self, preprocessor):
        """Test batch preprocessing with images of different original sizes."""
        image1 = Image.fromarray(
            np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8), mode='RGB'
        )
        image2 = Image.fromarray(
            np.random.randint(0, 255, (600, 400, 3), dtype=np.uint8), mode='RGB'
        )
        
        batch_tensor = preprocessor.preprocess_batch([image1, image2])
        
        # All should be resized to same target size
        assert batch_tensor.shape == (2, 3, 224, 224)
    
    # Test denormalization
    def test_denormalize_reverses_normalization(self, preprocessor, sample_rgb_image):
        """Test that denormalization approximately reverses normalization."""
        # Preprocess image
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        # Denormalize
        denormalized = preprocessor.denormalize(tensor)
        
        # Check output shape and type
        assert denormalized.shape == (224, 224, 3)
        assert denormalized.dtype == np.uint8
        
        # Check value range
        assert denormalized.min() >= 0
        assert denormalized.max() <= 255
    
    def test_denormalize_without_batch_dimension(self, preprocessor, sample_rgb_image):
        """Test denormalization on tensor without batch dimension."""
        tensor = preprocessor.preprocess(sample_rgb_image).squeeze(0)
        
        denormalized = preprocessor.denormalize(tensor)
        
        assert denormalized.shape == (224, 224, 3)
        assert denormalized.dtype == np.uint8
    
    def test_denormalize_with_batch_dimension(self, preprocessor, sample_rgb_image):
        """Test denormalization on tensor with batch dimension."""
        tensor = preprocessor.preprocess(sample_rgb_image)
        
        denormalized = preprocessor.denormalize(tensor)
        
        assert denormalized.shape == (224, 224, 3)
        assert denormalized.dtype == np.uint8
    
    # Test edge cases
    def test_preprocess_square_image(self, preprocessor):
        """Test preprocessing of square image."""
        square_image = Image.fromarray(
            np.random.randint(0, 255, (400, 400, 3), dtype=np.uint8), mode='RGB'
        )
        
        tensor = preprocessor.preprocess(square_image)
        
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_rectangular_image(self, preprocessor):
        """Test preprocessing of rectangular image."""
        rect_image = Image.fromarray(
            np.random.randint(0, 255, (600, 400, 3), dtype=np.uint8), mode='RGB'
        )
        
        tensor = preprocessor.preprocess(rect_image)
        
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_very_wide_image(self, preprocessor):
        """Test preprocessing of very wide image."""
        wide_image = Image.fromarray(
            np.random.randint(0, 255, (200, 800, 3), dtype=np.uint8), mode='RGB'
        )
        
        tensor = preprocessor.preprocess(wide_image)
        
        assert tensor.shape == (1, 3, 224, 224)
    
    def test_preprocess_very_tall_image(self, preprocessor):
        """Test preprocessing of very tall image."""
        tall_image = Image.fromarray(
            np.random.randint(0, 255, (800, 200, 3), dtype=np.uint8), mode='RGB'
        )
        
        tensor = preprocessor.preprocess(tall_image)
        
        assert tensor.shape == (1, 3, 224, 224)
    
    # Test multiple preprocessing calls
    def test_multiple_preprocess_calls(self, preprocessor, sample_rgb_image):
        """Test that multiple preprocessing calls work correctly."""
        tensor1 = preprocessor.preprocess(sample_rgb_image)
        tensor2 = preprocessor.preprocess(sample_rgb_image)
        
        # Both should have correct shape
        assert tensor1.shape == (1, 3, 224, 224)
        assert tensor2.shape == (1, 3, 224, 224)
        
        # Results should be identical for same input
        assert torch.allclose(tensor1, tensor2, atol=1e-6)
    
    def test_preprocess_different_images(self, preprocessor):
        """Test preprocessing different images produces different results."""
        image1 = Image.fromarray(
            np.zeros((300, 300, 3), dtype=np.uint8), mode='RGB'
        )
        image2 = Image.fromarray(
            np.ones((300, 300, 3), dtype=np.uint8) * 255, mode='RGB'
        )
        
        tensor1 = preprocessor.preprocess(image1)
        tensor2 = preprocessor.preprocess(image2)
        
        # Results should be different
        assert not torch.allclose(tensor1, tensor2, atol=1e-3)
    
    # Test memory efficiency
    def test_preprocess_does_not_modify_original(self, preprocessor, sample_rgb_image):
        """Test that preprocessing does not modify the original image."""
        original_size = sample_rgb_image.size
        original_mode = sample_rgb_image.mode
        
        preprocessor.preprocess(sample_rgb_image)
        
        # Original image should be unchanged
        assert sample_rgb_image.size == original_size
        assert sample_rgb_image.mode == original_mode
    
    def test_batch_preprocess_does_not_modify_originals(self, preprocessor, sample_rgb_image):
        """Test that batch preprocessing does not modify original images."""
        images = [sample_rgb_image, sample_rgb_image]
        original_sizes = [img.size for img in images]
        
        preprocessor.preprocess_batch(images)
        
        # Original images should be unchanged
        for img, orig_size in zip(images, original_sizes):
            assert img.size == orig_size
