import cv2
import numpy as np
import os
import tempfile
import aiofiles
from typing import List, Tuple, Optional
from fastapi import HTTPException, UploadFile
from app.core.config import settings
from app.models.hair_tryOn import VideoUploadResponse, ProcessingMetadata
import logging

logger = logging.getLogger(__name__)

class VideoService:
    def __init__(self):
        self.max_duration = settings.max_video_duration
        self.max_size = settings.max_video_size
        self.allowed_formats = settings.allowed_video_formats
        self.sampling_rate = settings.frame_sampling_rate
        
    async def validate_video(self, file: UploadFile) -> dict:
        """Validate uploaded video file"""
        # Check file extension
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in self.allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid video format. Allowed formats: {', '.join(self.allowed_formats)}"
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > self.max_size:
            raise HTTPException(
                status_code=400,
                detail=f"Video file too large. Maximum size: {self.max_size / (1024*1024):.1f}MB"
            )
        
        return {
            "size": file_size,
            "format": file_extension
        }
    
    async def save_uploaded_video(self, file: UploadFile, upload_id: str) -> str:
        """Save uploaded video to disk"""
        file_extension = file.filename.split('.')[-1].lower()
        file_path = os.path.join(settings.upload_dir, f"{upload_id}.{file_extension}")
        
        # Ensure upload directory exists
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        return file_path
    
    def get_video_info(self, video_path: str) -> dict:
        """Extract video information"""
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Cannot open video file")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        duration = frame_count / fps if fps > 0 else 0
        
        cap.release()
        
        # Validate duration
        if duration > self.max_duration:
            raise HTTPException(
                status_code=400,
                detail=f"Video too long. Maximum duration: {self.max_duration} seconds"
            )
        
        return {
            "fps": fps,
            "frame_count": frame_count,
            "duration": duration,
            "resolution": {"width": width, "height": height}
        }
    
    def extract_frames(self, video_path: str, sampling_rate: Optional[float] = None) -> List[np.ndarray]:
        """Extract frames from video with sampling"""
        if sampling_rate is None:
            sampling_rate = self.sampling_rate
            
        cap = cv2.VideoCapture(video_path)
        frames = []
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Sample frames based on sampling rate
                if frame_count % int(1 / sampling_rate) == 0:
                    frames.append(frame)
                
                frame_count += 1
                
        finally:
            cap.release()
        
        logger.info(f"Extracted {len(frames)} frames from {frame_count} total frames")
        return frames
    
    def reconstruct_video(self, frames: List[np.ndarray], output_path: str, fps: float) -> str:
        """Reconstruct video from processed frames"""
        if not frames:
            raise ValueError("No frames to reconstruct video")
        
        height, width, channels = frames[0].shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        try:
            for frame in frames:
                out.write(frame)
        finally:
            out.release()
        
        return output_path
    
    def resize_frame(self, frame: np.ndarray, target_size: Tuple[int, int]) -> np.ndarray:
        """Resize frame to target size"""
        return cv2.resize(frame, target_size)
    
    def preprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for AI model input"""
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Normalize pixel values
        frame_normalized = frame_rgb.astype(np.float32) / 255.0
        
        return frame_normalized
    
    def postprocess_frame(self, frame: np.ndarray) -> np.ndarray:
        """Postprocess frame from AI model output"""
        # Denormalize pixel values
        frame_denorm = (frame * 255.0).astype(np.uint8)
        
        # Convert RGB to BGR
        frame_bgr = cv2.cvtColor(frame_denorm, cv2.COLOR_RGB2BGR)
        
        return frame_bgr
    
    async def cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleaned up temporary file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to cleanup file {file_path}: {e}")

video_service = VideoService()