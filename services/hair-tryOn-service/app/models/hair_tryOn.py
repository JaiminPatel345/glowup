from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ProcessingType(str, Enum):
    VIDEO = "video"
    REALTIME = "realtime"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class HairTryOnRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    type: ProcessingType = Field(..., description="Processing type")
    style_image_url: Optional[str] = Field(None, description="Style reference image URL")
    color_image_url: Optional[str] = Field(None, description="Hair color reference image URL")

class VideoProcessingRequest(HairTryOnRequest):
    video_url: str = Field(..., description="Input video URL")
    
class RealtimeSessionRequest(HairTryOnRequest):
    session_id: str = Field(..., description="WebSocket session ID")

class ProcessingMetadata(BaseModel):
    model_version: str = Field(default="1.0.0", description="AI model version used")
    processing_time: float = Field(..., description="Processing time in seconds")
    frames_processed: int = Field(..., description="Number of frames processed")
    frame_sampling_rate: float = Field(default=0.5, description="Frame sampling rate used")
    original_fps: Optional[float] = Field(None, description="Original video FPS")
    output_fps: Optional[float] = Field(None, description="Output video FPS")

class HairTryOnResult(BaseModel):
    id: str = Field(..., description="Result ID")
    user_id: str = Field(..., description="User ID")
    type: ProcessingType = Field(..., description="Processing type")
    status: ProcessingStatus = Field(..., description="Processing status")
    original_media_url: str = Field(..., description="Original video/image URL")
    style_image_url: str = Field(..., description="Style reference image URL")
    color_image_url: Optional[str] = Field(None, description="Hair color reference image URL")
    result_media_url: Optional[str] = Field(None, description="Processed result URL")
    processing_metadata: Optional[ProcessingMetadata] = Field(None, description="Processing metadata")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")

class HairTryOnHistory(BaseModel):
    user_id: str = Field(..., description="User ID")
    results: List[HairTryOnResult] = Field(default=[], description="List of hair try-on results")
    total_count: int = Field(default=0, description="Total number of results")

class WebSocketMessage(BaseModel):
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(default={}, description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")

class FrameProcessingResult(BaseModel):
    frame_id: str = Field(..., description="Frame identifier")
    processed_frame_data: bytes = Field(..., description="Processed frame data")
    processing_time: float = Field(..., description="Processing time in milliseconds")
    quality_score: Optional[float] = Field(None, description="Quality score of the result")

class VideoUploadResponse(BaseModel):
    upload_id: str = Field(..., description="Upload identifier")
    file_url: str = Field(..., description="Uploaded file URL")
    file_size: int = Field(..., description="File size in bytes")
    duration: float = Field(..., description="Video duration in seconds")
    fps: float = Field(..., description="Video FPS")
    resolution: Dict[str, int] = Field(..., description="Video resolution (width, height)")

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    retry_possible: bool = Field(default=True, description="Whether retry is possible")