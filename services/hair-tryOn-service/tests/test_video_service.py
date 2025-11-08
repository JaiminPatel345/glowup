import pytest
import tempfile
import os
import cv2
import numpy as np
from unittest.mock import patch, MagicMock
from fastapi import HTTPException, UploadFile
from io import BytesIO

from app.services.video_service import video_service

class TestVideoService:
    """Unit tests for VideoService"""
    
    @pytest.mark.unit
    async def test_validate_video_valid_format(self):
        """Test video validation with valid format"""
        # Create mock upload file
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_video.mp4"
        mock_file.file = BytesIO(b"fake video content")
        
        result = await video_service.validate_video(mock_file)
        
        assert "size" in result
        assert "format" in result
        assert result["format"] == "mp4"
    
    @pytest.mark.unit
    async def test_validate_video_invalid_format(self):
        """Test video validation with invalid format"""
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_video.txt"
        
        with pytest.raises(HTTPException) as exc_info:
            await video_service.validate_video(mock_file)
        
        assert exc_info.value.status_code == 400
        assert "Invalid video format" in str(exc_info.value.detail)
    
    @pytest.mark.unit
    async def test_validate_video_too_large(self):
        """Test video validation with file too large"""
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_video.mp4"
        mock_file.file = BytesIO(b"x" * (video_service.max_size + 1))
        
        with pytest.raises(HTTPException) as exc_info:
            await video_service.validate_video(mock_file)
        
        assert exc_info.value.status_code == 400
        assert "too large" in str(exc_info.value.detail)
    
    @pytest.mark.unit
    def test_get_video_info_valid_video(self, temp_video_file):
        """Test getting video information from valid video"""
        info = video_service.get_video_info(temp_video_file)
        
        assert "fps" in info
        assert "frame_count" in info
        assert "duration" in info
        assert "resolution" in info
        assert info["fps"] > 0
        assert info["frame_count"] > 0
        assert info["duration"] > 0
    
    @pytest.mark.unit
    def test_get_video_info_invalid_video(self):
        """Test getting video information from invalid video"""
        with pytest.raises(HTTPException) as exc_info:
            video_service.get_video_info("nonexistent_file.mp4")
        
        assert exc_info.value.status_code == 400
        assert "Cannot open video file" in str(exc_info.value.detail)
    
    @pytest.mark.unit
    def test_extract_frames(self, temp_video_file):
        """Test frame extraction from video"""
        frames = video_service.extract_frames(temp_video_file, sampling_rate=1.0)
        
        assert len(frames) > 0
        assert all(isinstance(frame, np.ndarray) for frame in frames)
        assert all(len(frame.shape) == 3 for frame in frames)  # Height, Width, Channels
    
    @pytest.mark.unit
    def test_extract_frames_with_sampling(self, temp_video_file):
        """Test frame extraction with sampling rate"""
        frames_full = video_service.extract_frames(temp_video_file, sampling_rate=1.0)
        frames_half = video_service.extract_frames(temp_video_file, sampling_rate=0.5)
        
        # Half sampling should result in fewer frames
        assert len(frames_half) <= len(frames_full)
    
    @pytest.mark.unit
    def test_reconstruct_video(self, sample_video_frames):
        """Test video reconstruction from frames"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
            output_path = f.name
        
        try:
            result_path = video_service.reconstruct_video(sample_video_frames, output_path, 30.0)
            
            assert result_path == output_path
            assert os.path.exists(output_path)
            
            # Verify the reconstructed video
            cap = cv2.VideoCapture(output_path)
            assert cap.isOpened()
            
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            assert frame_count == len(sample_video_frames)
            
            cap.release()
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    @pytest.mark.unit
    def test_reconstruct_video_empty_frames(self):
        """Test video reconstruction with empty frames list"""
        with pytest.raises(ValueError) as exc_info:
            video_service.reconstruct_video([], "output.mp4", 30.0)
        
        assert "No frames to reconstruct" in str(exc_info.value)
    
    @pytest.mark.unit
    def test_resize_frame(self, sample_image):
        """Test frame resizing"""
        target_size = (50, 50)
        resized = video_service.resize_frame(sample_image, target_size)
        
        assert resized.shape[:2] == target_size[::-1]  # OpenCV uses (height, width)
    
    @pytest.mark.unit
    def test_preprocess_frame(self, sample_image):
        """Test frame preprocessing"""
        processed = video_service.preprocess_frame(sample_image)
        
        assert processed.dtype == np.float32
        assert processed.min() >= 0.0
        assert processed.max() <= 1.0
    
    @pytest.mark.unit
    def test_postprocess_frame(self, sample_image):
        """Test frame postprocessing"""
        # First preprocess, then postprocess
        preprocessed = video_service.preprocess_frame(sample_image)
        postprocessed = video_service.postprocess_frame(preprocessed)
        
        assert postprocessed.dtype == np.uint8
        assert postprocessed.min() >= 0
        assert postprocessed.max() <= 255
    
    @pytest.mark.unit
    async def test_cleanup_temp_files(self):
        """Test temporary file cleanup"""
        # Create temporary files
        temp_files = []
        for i in range(3):
            with tempfile.NamedTemporaryFile(delete=False) as f:
                temp_files.append(f.name)
        
        # Verify files exist
        for file_path in temp_files:
            assert os.path.exists(file_path)
        
        # Cleanup
        await video_service.cleanup_temp_files(temp_files)
        
        # Verify files are deleted
        for file_path in temp_files:
            assert not os.path.exists(file_path)
    
    @pytest.mark.unit
    async def test_save_uploaded_video(self):
        """Test saving uploaded video file"""
        # Create mock upload file
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "test_video.mp4"
        mock_file.read = AsyncMock(return_value=b"fake video content")
        
        upload_id = "test_upload_id"
        
        with patch('os.makedirs'), patch('aiofiles.open') as mock_open:
            mock_file_handle = AsyncMock()
            mock_open.return_value.__aenter__.return_value = mock_file_handle
            
            result_path = await video_service.save_uploaded_video(mock_file, upload_id)
            
            assert upload_id in result_path
            assert result_path.endswith('.mp4')
            mock_file_handle.write.assert_called_once_with(b"fake video content")