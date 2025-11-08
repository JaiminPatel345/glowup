import pytest
import numpy as np
import cv2
from unittest.mock import patch, MagicMock, AsyncMock

from app.services.ai_service import ai_service, HairFastGANModel

class TestHairFastGANModel:
    """Unit tests for HairFastGANModel"""
    
    @pytest.mark.unit
    async def test_load_model_success(self):
        """Test successful model loading"""
        model = HairFastGANModel()
        
        with patch('os.path.exists', return_value=False):
            await model.load_model()
            
        assert model.model_loaded is True
    
    @pytest.mark.unit
    def test_preprocess_image(self, sample_image):
        """Test image preprocessing"""
        model = HairFastGANModel()
        tensor = model.preprocess_image(sample_image)
        
        assert tensor.shape[0] == 1  # Batch dimension
        assert tensor.shape[1] == 3  # RGB channels
        assert tensor.shape[2] == model.input_size[0]  # Height
        assert tensor.shape[3] == model.input_size[1]  # Width
    
    @pytest.mark.unit
    def test_postprocess_output(self, sample_image):
        """Test output postprocessing"""
        model = HairFastGANModel()
        
        # Create mock tensor output
        tensor = model.preprocess_image(sample_image)
        output = model.postprocess_output(tensor)
        
        assert output.dtype == np.uint8
        assert len(output.shape) == 3
        assert output.shape[2] == 3  # BGR channels
    
    @pytest.mark.unit
    async def test_apply_hairstyle_mock(self, sample_image):
        """Test hairstyle application with mock model"""
        model = HairFastGANModel()
        
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        result = await model.apply_hairstyle(sample_image, style_image)
        
        assert result.shape == sample_image.shape
        assert result.dtype == np.uint8
    
    @pytest.mark.unit
    async def test_apply_hairstyle_with_color(self, sample_image):
        """Test hairstyle application with color image"""
        model = HairFastGANModel()
        
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        color_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        result = await model.apply_hairstyle(sample_image, style_image, color_image)
        
        assert result.shape == sample_image.shape
        assert result.dtype == np.uint8
    
    @pytest.mark.unit
    def test_mock_hair_transfer(self, sample_image):
        """Test mock hair transfer implementation"""
        model = HairFastGANModel()
        
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        result = model._mock_hair_transfer(sample_image, style_image)
        
        assert result.shape == sample_image.shape
        assert result.dtype == np.uint8
    
    @pytest.mark.unit
    def test_apply_hair_color(self, sample_image):
        """Test hair color application"""
        model = HairFastGANModel()
        
        color_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        result = model._apply_hair_color(sample_image, color_image)
        
        assert result.shape == sample_image.shape
        assert result.dtype == np.uint8

class TestAIService:
    """Unit tests for AIService"""
    
    @pytest.mark.unit
    async def test_initialize(self):
        """Test AI service initialization"""
        with patch.object(ai_service.hair_model, 'load_model', new_callable=AsyncMock):
            await ai_service.initialize()
    
    @pytest.mark.unit
    async def test_process_frame(self, sample_image):
        """Test single frame processing"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
            mock_apply.return_value = sample_image
            
            result, processing_time = await ai_service.process_frame(sample_image, style_image)
            
            assert result.shape == sample_image.shape
            assert processing_time > 0
            mock_apply.assert_called_once()
    
    @pytest.mark.unit
    async def test_process_frame_with_color(self, sample_image):
        """Test single frame processing with color image"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        color_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
            mock_apply.return_value = sample_image
            
            result, processing_time = await ai_service.process_frame(
                sample_image, style_image, color_image
            )
            
            assert result.shape == sample_image.shape
            assert processing_time > 0
            mock_apply.assert_called_once_with(sample_image, style_image, color_image)
    
    @pytest.mark.unit
    async def test_process_frame_error_handling(self, sample_image):
        """Test frame processing error handling"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
            mock_apply.side_effect = Exception("Processing failed")
            
            result, processing_time = await ai_service.process_frame(sample_image, style_image)
            
            # Should return original frame on error
            np.testing.assert_array_equal(result, sample_image)
            assert processing_time > 0
    
    @pytest.mark.unit
    async def test_process_video_frames(self, sample_video_frames):
        """Test video frames processing"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        with patch.object(ai_service, 'process_frame', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = (sample_video_frames[0], 50.0)
            
            results = await ai_service.process_video_frames(sample_video_frames, style_image)
            
            assert len(results) == len(sample_video_frames)
            assert mock_process.call_count == len(sample_video_frames)
    
    @pytest.mark.unit
    async def test_process_video_frames_empty_list(self):
        """Test video frames processing with empty list"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        results = await ai_service.process_video_frames([], style_image)
        
        assert results == []
    
    @pytest.mark.unit
    def test_get_processing_stats(self):
        """Test getting processing statistics"""
        stats = ai_service.get_processing_stats()
        
        assert isinstance(stats, dict)
        assert "total_processed" in stats
        assert "average_processing_time" in stats
        assert "success_rate" in stats
    
    @pytest.mark.unit
    async def test_process_frame_updates_stats(self, sample_image):
        """Test that processing frame updates statistics"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        initial_count = ai_service.processing_stats["total_processed"]
        
        with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
            mock_apply.return_value = sample_image
            
            await ai_service.process_frame(sample_image, style_image)
            
            assert ai_service.processing_stats["total_processed"] == initial_count + 1