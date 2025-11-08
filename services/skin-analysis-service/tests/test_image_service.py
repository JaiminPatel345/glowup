import pytest
import os
import tempfile
from PIL import Image
import numpy as np

from app.services.image_service import ImageService
from fastapi import HTTPException


class TestImageService:
    """Unit tests for ImageService"""
    
    @pytest.fixture
    def image_service(self, override_settings):
        return ImageService()
    
    @pytest.mark.unit
    async def test_validate_image_success(self, image_service, mock_upload_file):
        """Test successful image validation"""
        # Should not raise any exception
        await image_service.validate_image(mock_upload_file)
    
    @pytest.mark.unit
    async def test_validate_image_invalid_type(self, image_service):
        """Test image validation with invalid file type"""
        class MockInvalidFile:
            content_type = "text/plain"
            size = 1000
            filename = "test.txt"
            
            async def read(self):
                return b"not an image"
            
            async def seek(self, position):
                pass
            
            @property
            def file(self):
                return self
        
        with pytest.raises(HTTPException) as exc_info:
            await image_service.validate_image(MockInvalidFile())
        
        assert exc_info.value.status_code == 415
    
    @pytest.mark.unit
    async def test_validate_image_too_large(self, image_service):
        """Test image validation with file too large"""
        class MockLargeFile:
            content_type = "image/jpeg"
            size = 20 * 1024 * 1024  # 20MB
            filename = "large.jpg"
            
            async def read(self):
                return b"x" * (20 * 1024 * 1024)
            
            async def seek(self, position):
                pass
        
        with pytest.raises(HTTPException) as exc_info:
            await image_service.validate_image(MockLargeFile())
        
        assert exc_info.value.status_code == 413
    
    @pytest.mark.unit
    async def test_save_and_process_image(self, image_service, mock_upload_file):
        """Test image saving and processing"""
        processed_path = await image_service.save_and_process_image(mock_upload_file)
        
        assert os.path.exists(processed_path)
        assert processed_path.endswith('.jpg')
        
        # Verify image can be loaded
        image = Image.open(processed_path)
        assert image.size == (512, 512)  # Should be resized to standard size
        
        # Cleanup
        os.unlink(processed_path)
    
    @pytest.mark.unit
    def test_calculate_image_quality_score(self, image_service, temp_image_file):
        """Test image quality score calculation"""
        score = image_service.calculate_image_quality_score(temp_image_file)
        
        assert 0.0 <= score <= 1.0
        assert isinstance(score, float)
    
    @pytest.mark.unit
    def test_get_image_dimensions(self, image_service, temp_image_file):
        """Test getting image dimensions"""
        width, height = image_service.get_image_dimensions(temp_image_file)
        
        assert width > 0
        assert height > 0
        assert isinstance(width, int)
        assert isinstance(height, int)
    
    @pytest.mark.unit
    async def test_cleanup_file(self, image_service):
        """Test file cleanup"""
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(b"test content")
        
        assert os.path.exists(tmp_path)
        
        # Clean up the file
        await image_service.cleanup_file(tmp_path)
        
        # File should be deleted
        assert not os.path.exists(tmp_path)
    
    @pytest.mark.unit
    async def test_preprocess_image(self, image_service, temp_image_file):
        """Test image preprocessing"""
        processed_path = await image_service.preprocess_image(temp_image_file)
        
        assert os.path.exists(processed_path)
        
        # Verify processed image properties
        image = Image.open(processed_path)
        assert image.size == (512, 512)  # Standard size
        
        # Cleanup
        os.unlink(processed_path)