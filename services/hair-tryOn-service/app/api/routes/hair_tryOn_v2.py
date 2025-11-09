"""
Hair Try-On API Routes (v2)
Updated to use local HairFastGAN and PerfectCorp API
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import Response, JSONResponse
from typing import Optional
import logging
from datetime import datetime
import uuid

from app.core.config import settings
from app.services.hairfastgan_service import HairFastGANService
from app.services.perfectcorp_service import PerfectCorpService
from app.services.database_service import database_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hair-tryOn", tags=["Hair Try-On"])

# Initialize services
hairfastgan_service = HairFastGANService(
    model_path=f"{settings.model_path}/{settings.hair_model_name}",
    device="auto"
)

perfectcorp_service = PerfectCorpService(
    api_key=settings.perfectcorp_api_key,
    api_url=settings.perfectcorp_api_url,
    cache_ttl=settings.hairstyle_cache_ttl
)


@router.on_event("startup")
async def startup():
    """Initialize services on startup"""
    try:
        await hairfastgan_service.initialize()
        logger.info("Hair Try-On services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        logger.warning("Service will continue with limited functionality")


@router.get("/hairstyles")
async def get_default_hairstyles(
    page_size: int = 20,
    starting_token: Optional[str] = None,
    force_refresh: bool = False
):
    """
    Get default hairstyles from PerfectCorp API
    
    Args:
        page_size: Number of hairstyles to return
        starting_token: Pagination token
        force_refresh: Force refresh cache
        
    Returns:
        List of hairstyles with preview images
    """
    try:
        hairstyles = await perfectcorp_service.fetch_hairstyles(
            page_size=page_size,
            starting_token=starting_token,
            force_refresh=force_refresh
        )
        
        return {
            "success": True,
            "count": len(hairstyles),
            "hairstyles": hairstyles
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch hairstyles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hairstyles/{hairstyle_id}")
async def get_hairstyle_by_id(hairstyle_id: str):
    """
    Get a specific hairstyle by ID
    
    Args:
        hairstyle_id: Hairstyle ID
        
    Returns:
        Hairstyle details
    """
    try:
        hairstyle = await perfectcorp_service.get_hairstyle_by_id(hairstyle_id)
        
        if not hairstyle:
            raise HTTPException(status_code=404, detail="Hairstyle not found")
        
        return {
            "success": True,
            "hairstyle": hairstyle
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get hairstyle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process")
async def process_hair_tryOn(
    user_photo: UploadFile = File(..., description="User's photo"),
    hairstyle_image: Optional[UploadFile] = File(None, description="Custom hairstyle image"),
    hairstyle_id: Optional[str] = Form(None, description="Default hairstyle ID from PerfectCorp"),
    user_id: str = Form(..., description="User ID"),
    blend_ratio: float = Form(0.8, description="Blending ratio (0-1)")
):
    """
    Process hair try-on request
    
    User can either:
    - Upload a custom hairstyle image
    - Select a default hairstyle by ID
    
    Args:
        user_photo: User's photo
        hairstyle_image: Custom hairstyle image (optional)
        hairstyle_id: Default hairstyle ID (optional)
        user_id: User ID
        blend_ratio: Blending ratio
        
    Returns:
        Processed image with hairstyle applied
    """
    try:
        # Validate input
        if not hairstyle_image and not hairstyle_id:
            raise HTTPException(
                status_code=400,
                detail="Either hairstyle_image or hairstyle_id must be provided"
            )
        
        # Read user photo
        user_photo_data = await user_photo.read()
        
        # Get hairstyle image
        if hairstyle_image:
            # Use custom uploaded image
            hairstyle_data = await hairstyle_image.read()
            hairstyle_source = "custom"
        else:
            # Download default hairstyle
            hairstyle = await perfectcorp_service.get_hairstyle_by_id(hairstyle_id)
            if not hairstyle:
                raise HTTPException(status_code=404, detail="Hairstyle not found")
            
            hairstyle_data = await perfectcorp_service.download_hairstyle_image(
                hairstyle['preview_image_url']
            )
            hairstyle_source = f"default:{hairstyle_id}"
        
        # Process with HairFastGAN
        result_image_data = await hairfastgan_service.process_image(
            source_image_data=user_photo_data,
            style_image_data=hairstyle_data,
            blend_ratio=blend_ratio
        )
        
        # Save to database
        result_id = str(uuid.uuid4())
        await database_service.save_hair_tryOn_result({
            "result_id": result_id,
            "user_id": user_id,
            "hairstyle_source": hairstyle_source,
            "blend_ratio": blend_ratio,
            "created_at": datetime.utcnow(),
            "status": "completed"
        })
        
        # Return image
        return Response(
            content=result_image_data,
            media_type="image/jpeg",
            headers={
                "X-Result-ID": result_id,
                "X-Processing-Time": "0"  # Add actual timing
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hair try-on processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{user_id}")
async def get_user_history(
    user_id: str,
    limit: int = 10,
    skip: int = 0
):
    """
    Get user's hair try-on history
    
    Args:
        user_id: User ID
        limit: Number of results to return
        skip: Number of results to skip
        
    Returns:
        List of user's hair try-on results
    """
    try:
        history = await database_service.get_user_hair_tryOn_history(
            user_id=user_id,
            limit=limit,
            skip=skip
        )
        
        return {
            "success": True,
            "count": len(history),
            "history": history
        }
        
    except Exception as e:
        logger.error(f"Failed to get user history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/result/{result_id}")
async def delete_result(result_id: str, user_id: str):
    """
    Delete a hair try-on result
    
    Args:
        result_id: Result ID
        user_id: User ID (for authorization)
        
    Returns:
        Success message
    """
    try:
        success = await database_service.delete_hair_tryOn_result(
            result_id=result_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Result not found")
        
        return {
            "success": True,
            "message": "Result deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        device_info = hairfastgan_service.get_device_info()
        
        return {
            "status": "healthy",
            "service": "hair-tryOn-service",
            "version": settings.service_version,
            "model_loaded": hairfastgan_service.initialized,
            "device": device_info,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@router.post("/cache/clear")
async def clear_cache():
    """Clear hairstyles cache"""
    try:
        perfectcorp_service.clear_cache()
        
        return {
            "success": True,
            "message": "Cache cleared successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))
