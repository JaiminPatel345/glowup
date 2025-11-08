import uuid
import os
import asyncio
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from app.models.hair_tryOn import (
    HairTryOnResult, 
    VideoUploadResponse, 
    ProcessingType, 
    ProcessingStatus,
    ProcessingMetadata,
    ErrorResponse
)
from app.services.video_service import video_service
from app.services.ai_service import ai_service
from app.services.database_service import database_service
from app.services.websocket_service import websocket_service
from app.core.config import settings
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hair-tryOn", tags=["Hair Try-On"])

@router.post("/upload-video", response_model=VideoUploadResponse)
async def upload_video(
    video: UploadFile = File(..., description="Video file to process"),
    user_id: str = Form(..., description="User ID")
):
    """Upload video for hair try-on processing"""
    try:
        # Validate video file
        validation_result = await video_service.validate_video(video)
        
        # Generate upload ID
        upload_id = str(uuid.uuid4())
        
        # Save video file
        video_path = await video_service.save_uploaded_video(video, upload_id)
        
        # Get video information
        video_info = video_service.get_video_info(video_path)
        
        return VideoUploadResponse(
            upload_id=upload_id,
            file_url=f"/uploads/{upload_id}.{video.filename.split('.')[-1]}",
            file_size=validation_result["size"],
            duration=video_info["duration"],
            fps=video_info["fps"],
            resolution=video_info["resolution"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video upload failed: {e}")
        raise HTTPException(status_code=500, detail="Video upload failed")

@router.post("/process-video", response_model=HairTryOnResult)
async def process_video(
    upload_id: str = Form(..., description="Video upload ID"),
    user_id: str = Form(..., description="User ID"),
    style_image: UploadFile = File(..., description="Hair style reference image"),
    color_image: Optional[UploadFile] = File(None, description="Hair color reference image (optional)")
):
    """Process uploaded video with hair style transfer"""
    try:
        # Create initial result record
        result = HairTryOnResult(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=ProcessingType.VIDEO,
            status=ProcessingStatus.PENDING,
            original_media_url=f"/uploads/{upload_id}",
            style_image_url="",
            color_image_url=None
        )
        
        # Save to database
        result_id = await database_service.create_hair_tryOn_result(result)
        
        # Update status to processing
        await database_service.update_hair_tryOn_result(result_id, {
            "status": ProcessingStatus.PROCESSING.value
        })
        
        # Process video in background
        asyncio.create_task(_process_video_background(result_id, upload_id, style_image, color_image))
        
        # Return initial result
        result.id = result_id
        result.status = ProcessingStatus.PROCESSING
        
        return result
        
    except Exception as e:
        logger.error(f"Video processing initiation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to start video processing")

async def _process_video_background(
    result_id: str, 
    upload_id: str, 
    style_image: UploadFile,
    color_image: Optional[UploadFile] = None
):
    """Background task for video processing"""
    import time
    start_time = time.time()
    
    try:
        # Find video file
        video_files = [f for f in os.listdir(settings.upload_dir) if f.startswith(upload_id)]
        if not video_files:
            raise FileNotFoundError(f"Video file not found for upload ID: {upload_id}")
        
        video_path = os.path.join(settings.upload_dir, video_files[0])
        
        # Save style image
        style_image_path = os.path.join(settings.temp_dir, f"{result_id}_style.jpg")
        os.makedirs(settings.temp_dir, exist_ok=True)
        
        with open(style_image_path, "wb") as f:
            content = await style_image.read()
            f.write(content)
        
        # Load style image
        style_img = cv2.imread(style_image_path)
        if style_img is None:
            raise ValueError("Failed to load style image")
        
        # Load color image if provided
        color_img = None
        if color_image:
            color_image_path = os.path.join(settings.temp_dir, f"{result_id}_color.jpg")
            with open(color_image_path, "wb") as f:
                content = await color_image.read()
                f.write(content)
            color_img = cv2.imread(color_image_path)
        
        # Extract frames from video
        frames = video_service.extract_frames(video_path)
        logger.info(f"Extracted {len(frames)} frames for processing")
        
        # Process frames with AI
        processed_frames = await ai_service.process_video_frames(frames, style_img, color_img)
        
        # Reconstruct video
        video_info = video_service.get_video_info(video_path)
        output_path = os.path.join(settings.upload_dir, f"{result_id}_result.mp4")
        video_service.reconstruct_video(processed_frames, output_path, video_info["fps"])
        
        # Calculate processing metadata
        processing_time = time.time() - start_time
        metadata = ProcessingMetadata(
            processing_time=processing_time,
            frames_processed=len(processed_frames),
            frame_sampling_rate=settings.frame_sampling_rate,
            original_fps=video_info["fps"],
            output_fps=video_info["fps"]
        )
        
        # Update result in database
        await database_service.update_hair_tryOn_result(result_id, {
            "status": ProcessingStatus.COMPLETED.value,
            "result_media_url": f"/uploads/{result_id}_result.mp4",
            "processing_metadata": metadata.dict()
        })
        
        # Cleanup temporary files
        temp_files = [style_image_path]
        if color_image and 'color_image_path' in locals():
            temp_files.append(color_image_path)
        await video_service.cleanup_temp_files(temp_files)
        
        logger.info(f"Video processing completed for result {result_id} in {processing_time:.2f}s")
        
    except Exception as e:
        logger.error(f"Video processing failed for result {result_id}: {e}")
        
        # Update result with error
        await database_service.update_hair_tryOn_result(result_id, {
            "status": ProcessingStatus.FAILED.value,
            "error_message": str(e)
        })

@router.get("/result/{result_id}", response_model=HairTryOnResult)
async def get_result(result_id: str, user_id: str):
    """Get hair try-on result by ID"""
    try:
        result = await database_service.get_hair_tryOn_result(result_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Check user ownership
        if result.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get result {result_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve result")

@router.get("/history/{user_id}")
async def get_user_history(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    type_filter: Optional[str] = None
):
    """Get user's hair try-on history"""
    try:
        processing_type = None
        if type_filter:
            try:
                processing_type = ProcessingType(type_filter)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid type filter")
        
        history = await database_service.get_user_hair_tryOn_history(
            user_id, limit, offset, processing_type
        )
        
        return history
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve history")

@router.delete("/result/{result_id}")
async def delete_result(result_id: str, user_id: str):
    """Delete a hair try-on result"""
    try:
        success = await database_service.delete_hair_tryOn_result(result_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Result not found or access denied")
        
        return {"message": "Result deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete result {result_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete result")

@router.websocket("/realtime/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, user_id: str):
    """WebSocket endpoint for real-time hair try-on"""
    await websocket_service.handle_connection(websocket, session_id, user_id)

@router.get("/stats")
async def get_processing_stats():
    """Get processing statistics"""
    try:
        stats = await database_service.get_processing_statistics()
        websocket_stats = websocket_service.connection_manager.get_connection_stats()
        ai_stats = ai_service.get_processing_stats()
        
        return {
            "database_stats": stats,
            "websocket_stats": websocket_stats,
            "ai_stats": ai_stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "hair-tryOn-service",
        "version": settings.service_version
    }