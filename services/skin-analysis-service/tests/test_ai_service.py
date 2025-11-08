import pytest
import numpy as np
import tempfile
import os
from PIL import Image

from app.services.ai_service import AIService


class TestAIService:
    """Unit tests for AIService"""
    
    @pytest.fixture
    def ai_service(self):
        return AIService()
    
    @pytest.mark.unit
    async def test_analyze_skin_image(self, ai_service, temp_image_file):
        """Test skin image analysis"""
        result = await ai_service.analyze_skin_image(temp_image_file)
        
        assert "skin_type" in result
        assert "issues" in result
        assert "analysis_timestamp" in result
        assert "model_confidence" in result
        
        # Verify skin type is valid
        valid_skin_types = ["oily", "dry", "normal", "combination"]
        assert result["skin_type"] in valid_skin_types
        
        # Verify issues structure
        assert isinstance(result["issues"], list)
        for issue in result["issues"]:
            assert "id" in issue
            assert "name" in issue
            assert "description" in issue
            assert "severity" in issue
            assert "causes" in issue
            assert "confidence" in issue
    
    @pytest.mark.unit
    async def test_preprocess_for_model(self, ai_service, temp_image_file):
        """Test image preprocessing for model input"""
        processed_image = await ai_service.preprocess_for_model(temp_image_file)
        
        assert isinstance(processed_image, np.ndarray)
        assert processed_image.shape == (224, 224, 3)  # Standard input size
        assert processed_image.dtype == np.float32
        assert 0.0 <= processed_image.max() <= 1.0  # Should be normalized
    
    @pytest.mark.unit
    async def test_detect_skin_type(self, ai_service):
        """Test skin type detection"""
        # Create test images with different brightness levels
        dark_image = np.zeros((224, 224, 3), dtype=np.float32)  # Very dark
        bright_image = np.ones((224, 224, 3), dtype=np.float32)  # Very bright
        medium_image = np.full((224, 224, 3), 0.5, dtype=np.float32)  # Medium
        
        dark_type = await ai_service.detect_skin_type(dark_image)
        bright_type = await ai_service.detect_skin_type(bright_image)
        medium_type = await ai_service.detect_skin_type(medium_image)
        
        valid_types = ["oily", "dry", "normal", "combination"]
        assert dark_type in valid_types
        assert bright_type in valid_types
        assert medium_type in valid_types
    
    @pytest.mark.unit
    async def test_detect_skin_issues(self, ai_service):
        """Test skin issue detection"""
        # Create test image with high variance (simulating texture issues)
        test_image = np.random.rand(224, 224, 3).astype(np.float32)
        
        issues = await ai_service.detect_skin_issues(test_image)
        
        assert isinstance(issues, list)
        for issue in issues:
            assert "id" in issue
            assert "name" in issue
            assert "description" in issue
            assert "severity" in issue
            assert "causes" in issue
            assert "confidence" in issue
    
    @pytest.mark.unit
    async def test_detect_acne_regions(self, ai_service, sample_image):
        """Test acne region detection"""
        regions = await ai_service._detect_acne_regions(sample_image)
        
        assert isinstance(regions, list)
        # Each region should be a tuple of (x1, y1, x2, y2)
        for region in regions:
            assert len(region) == 4
            x1, y1, x2, y2 = region
            assert x1 < x2
            assert y1 < y2
    
    @pytest.mark.unit
    async def test_detect_dark_spots(self, ai_service, sample_image):
        """Test dark spot detection"""
        regions = await ai_service._detect_dark_spots(sample_image)
        
        assert isinstance(regions, list)
        # Each region should be a tuple of (x1, y1, x2, y2)
        for region in regions:
            assert len(region) == 4
            x1, y1, x2, y2 = region
            assert x1 < x2
            assert y1 < y2
    
    @pytest.mark.unit
    async def test_create_highlighted_image(self, ai_service, temp_image_file):
        """Test highlighted image creation"""
        # Mock regions
        regions = [(50, 50, 100, 100), (150, 150, 200, 200)]
        
        highlighted_url = await ai_service._create_highlighted_image(
            temp_image_file, regions, "acne"
        )
        
        assert highlighted_url is not None
        assert highlighted_url.startswith("/uploads/")
        assert "highlighted_acne" in highlighted_url
        
        # Verify the highlighted image exists
        from app.core.config import settings
        highlighted_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(highlighted_url))
        assert os.path.exists(highlighted_path)
        
        # Cleanup
        os.unlink(highlighted_path)
    
    @pytest.mark.unit
    def test_get_model_version(self, ai_service):
        """Test model version retrieval"""
        version = ai_service.get_model_version()
        
        assert isinstance(version, str)
        assert len(version) > 0
    
    @pytest.mark.unit
    async def test_analyze_skin_type_basic(self, ai_service, sample_image):
        """Test basic skin type analysis"""
        skin_type = await ai_service._analyze_skin_type_basic(sample_image)
        
        valid_types = ["oily", "dry", "normal", "combination"]
        assert skin_type in valid_types
    
    @pytest.mark.unit
    async def test_detect_basic_issues(self, ai_service, sample_image, temp_image_file):
        """Test basic issue detection"""
        issues = await ai_service._detect_basic_issues(sample_image, temp_image_file)
        
        assert isinstance(issues, list)
        for issue in issues:
            assert "id" in issue
            assert "name" in issue
            assert "description" in issue
            assert "severity" in issue
            assert "causes" in issue
            assert "confidence" in issue
    
    @pytest.mark.unit
    def test_extract_features_for_custom_model(self, ai_service, sample_image):
        """Test feature extraction for custom model"""
        features = ai_service._extract_features_for_custom_model(sample_image)
        
        assert isinstance(features, list)
        assert len(features) == 6  # Should extract 6 features
        assert all(isinstance(f, (int, float)) for f in features)