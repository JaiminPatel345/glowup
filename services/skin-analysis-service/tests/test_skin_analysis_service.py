import pytest
from app.services.skin_analysis_service import SkinAnalysisService
from app.models.skin_analysis import SkinAnalysisResult


class TestSkinAnalysisService:
    """Unit tests for SkinAnalysisService"""
    
    @pytest.fixture
    def analysis_service(self, test_db):
        return SkinAnalysisService(test_db)
    
    @pytest.mark.unit
    async def test_analyze_skin(self, analysis_service, temp_image_file):
        """Test complete skin analysis"""
        result = await analysis_service.analyze_skin("test_user_123", temp_image_file)
        
        assert isinstance(result, SkinAnalysisResult)
        assert result.user_id == "test_user_123"
        assert result.skin_type in ["oily", "dry", "normal", "combination"]
        assert isinstance(result.issues, list)
        assert result.analysis_metadata is not None
        assert result.id is not None
        
        # Verify metadata
        metadata = result.analysis_metadata
        assert metadata.processing_time > 0
        assert 0.0 <= metadata.image_quality <= 1.0
        assert metadata.model_version is not None
    
    @pytest.mark.unit
    async def test_get_analysis_by_id(self, analysis_service, db_with_data):
        """Test retrieving analysis by ID"""
        # First, get an existing analysis ID from the database
        cursor = db_with_data.skin_analysis.find({})
        existing_doc = await cursor.to_list(1)
        
        if existing_doc:
            analysis_id = str(existing_doc[0]["_id"])
            result = await analysis_service.get_analysis_by_id(analysis_id)
            
            assert result is not None
            assert isinstance(result, SkinAnalysisResult)
            assert str(result.id) == analysis_id
        
        # Test with non-existent ID
        non_existent_result = await analysis_service.get_analysis_by_id("507f1f77bcf86cd799439011")
        assert non_existent_result is None
        
        # Test with invalid ID format
        invalid_result = await analysis_service.get_analysis_by_id("invalid_id")
        assert invalid_result is None
    
    @pytest.mark.unit
    async def test_get_user_history(self, analysis_service, db_with_data):
        """Test getting user analysis history"""
        history = await analysis_service.get_user_history("test_user_123")
        
        assert isinstance(history, list)
        # Should have at least one analysis from test data
        assert len(history) >= 0
        
        for analysis in history:
            assert isinstance(analysis, SkinAnalysisResult)
            assert analysis.user_id == "test_user_123"
        
        # Test with pagination
        limited_history = await analysis_service.get_user_history("test_user_123", limit=1)
        assert len(limited_history) <= 1
        
        # Test with non-existent user
        empty_history = await analysis_service.get_user_history("non_existent_user")
        assert isinstance(empty_history, list)
        assert len(empty_history) == 0
    
    @pytest.mark.unit
    async def test_delete_analysis(self, analysis_service, temp_image_file):
        """Test deleting analysis"""
        # Create an analysis first
        result = await analysis_service.analyze_skin("test_user_delete", temp_image_file)
        analysis_id = str(result.id)
        
        # Delete the analysis
        deleted = await analysis_service.delete_analysis(analysis_id, "test_user_delete")
        assert deleted is True
        
        # Verify it's deleted
        retrieved = await analysis_service.get_analysis_by_id(analysis_id)
        assert retrieved is None
        
        # Test deleting with wrong user (should fail)
        result2 = await analysis_service.analyze_skin("test_user_delete2", temp_image_file)
        analysis_id2 = str(result2.id)
        
        deleted_wrong_user = await analysis_service.delete_analysis(analysis_id2, "wrong_user")
        assert deleted_wrong_user is False
        
        # Analysis should still exist
        retrieved2 = await analysis_service.get_analysis_by_id(analysis_id2)
        assert retrieved2 is not None
    
    @pytest.mark.unit
    async def test_generate_highlighted_image(self, analysis_service, temp_image_file):
        """Test highlighted image generation"""
        # Test with acne issue
        acne_issue = {
            "name": "Acne",
            "id": "acne_test_001"
        }
        
        highlighted_url = await analysis_service._generate_highlighted_image(
            temp_image_file, acne_issue
        )
        
        # Should return None or a valid URL
        if highlighted_url:
            assert isinstance(highlighted_url, str)
            assert highlighted_url.startswith("/uploads/")
        
        # Test with issue that already has highlighted image
        issue_with_url = {
            "name": "Test Issue",
            "highlighted_image_url": "/existing/image.jpg"
        }
        
        existing_url = await analysis_service._generate_highlighted_image(
            temp_image_file, issue_with_url
        )
        assert existing_url == "/existing/image.jpg"
    
    @pytest.mark.unit
    async def test_load_image_array(self, analysis_service, temp_image_file):
        """Test loading image as numpy array"""
        image_array = await analysis_service._load_image_array(temp_image_file)
        
        if image_array is not None:
            assert image_array.shape[2] == 3  # RGB channels
            assert image_array.dtype.name.startswith('uint')
        
        # Test with non-existent file
        none_array = await analysis_service._load_image_array("/non/existent/file.jpg")
        assert none_array is None