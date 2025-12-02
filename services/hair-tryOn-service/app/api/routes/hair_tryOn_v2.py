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
import asyncio


from app.core.config import settings

from app.services.perfectcorp_service import PerfectCorpService
from app.services.magicapi_service import MagicAPIService
from app.services.database_service import database_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hair", tags=["Hair Try-On"])

perfectcorp_service = PerfectCorpService(
    api_key=settings.perfectcorp_api_key,
    api_url=settings.perfectcorp_api_url,
    cache_ttl=settings.hairstyle_cache_ttl
)


@router.on_event("startup")
async def startup():
    """Initialize services on startup"""
    try:
        # No async initialization needed for LightX or PerfectCorp (static)
        logger.info("Hair Try-On services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        logger.warning("Service will continue with limited functionality")


@router.get("/hairstyles")
async def get_default_hairstyles(
    page_size: int = 20,
    starting_token: Optional[str] = None,
    force_refresh: bool = False,
    fetch_all: bool = False
):
    """
    Get default hairstyles from static data
    
    Note: For API templates, use /templates endpoint
    
    Args:
        page_size: Number of hairstyles to return per call
        starting_token: Pagination token
        force_refresh: Force refresh cache
        fetch_all: If True, returns all hairstyles at once
        
    Returns:
        List of hairstyles with preview images
    """
    try:
        if fetch_all:
            # When using static data, fetch all hairstyles at once (no pagination)
            logger.info("Fetching all hairstyles from static data")
            
            # Fetch with a large page size to get all hairstyles at once
            result = await perfectcorp_service.fetch_hairstyles(
                page=1,
                page_size=1000,  # Large enough to get all hairstyles
                gender=None,
                starting_token=None,
                force_refresh=force_refresh
            )
            
            all_hairstyles = result.get("data", [])
            logger.info(f"Total hairstyles fetched: {len(all_hairstyles)}")
            
            # Log gender breakdown
            male_count = sum(1 for h in all_hairstyles if h.get('gender', '').lower() == 'male')
            female_count = sum(1 for h in all_hairstyles if h.get('gender', '').lower() == 'female')
            logger.info(f"📊 Gender breakdown - Male: {male_count}, Female: {female_count}")
            
            return {
                "success": True,
                "count": len(all_hairstyles),
                "hairstyles": all_hairstyles,
                "next_token": None  # No pagination when fetching all
            }
        else:
            # Single API call with optional token
            result = await perfectcorp_service.fetch_hairstyles(
                page_size=page_size,
                starting_token=starting_token,
                force_refresh=force_refresh
            )
            
            print(f"🔵 Route received result keys: {list(result.keys())}")  # Debug print
            print(f"🔵 Result data length: {len(result.get('data', []))}")  # Debug print
            
            # The service returns 'data' key, not 'hairstyles'
            hairstyles_data = result.get("data", [])
            
            # Debug: Log first few hairstyles with gender info
            if hairstyles_data:
                print(f"🔍 First 3 hairstyles gender info:")
                for i, style in enumerate(hairstyles_data[:3]):
                    print(f"  [{i}] ID: {style.get('id')}, Gender: {style.get('gender')}, Category: {style.get('category')}")
            
            return {
                "success": True,
                "count": len(hairstyles_data),
                "hairstyles": hairstyles_data,
                "next_token": result.get("next_token")
            }
        
    except Exception as e:
        logger.error(f"Failed to fetch hairstyles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def get_api_templates(
    page_size: int = 20,
    starting_token: Optional[str] = None
):
    """
    Get hairstyle templates from PerfectCorp API (if enabled)
    
    This endpoint returns templates available for AI Hairstyle Generator.
    Falls back to static data if API is not configured.
    
    Args:
        page_size: Number of templates to return per call
        starting_token: Pagination token from previous response
        
    Returns:
        List of templates with preview URLs
    """
    try:
        result = await perfectcorp_service.list_templates(
            page_size=page_size,
            starting_token=starting_token
        )
        
        return {
            "success": True,
            "count": len(result.get("templates", [])),
            "templates": result.get("templates", []),
            "next_token": result.get("next_token")
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch templates: {e}")
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
    use_ai: Optional[bool] = Form(None, description="Use PerfectCorp AI Hairstyle Generator (default: auto-detect based on API key)")
):
    """
    Process hair try-on request
    
    User can either:
    - Upload a custom hairstyle image → Uses traditional HairFastGAN processing
    - Select a default hairstyle by ID → Uses PerfectCorp AI if API key configured
    - Use PerfectCorp AI Hairstyle Generator (if use_ai=true and API key is configured)
    
    Args:
        user_photo: User's photo
        hairstyle_image: Custom hairstyle image (optional)
        hairstyle_id: Default hairstyle ID (optional)
        user_id: User ID
        use_ai: Use PerfectCorp AI API for processing (None = auto-detect, True = force AI, False = force traditional)
        
    Returns:
        Processed image with hairstyle applied
    """
    logger.info(f"📸 Received hair try-on request for user {user_id}")
    logger.info(f"   - User photo: {user_photo.filename if user_photo else 'None'}")
    logger.info(f"   - Hairstyle image: {hairstyle_image.filename if hairstyle_image else 'None'}")
    logger.info(f"   - Hairstyle ID: {hairstyle_id or 'None'}")
    logger.info(f"   - Use AI (explicit): {use_ai}")
    
    try:    
        # Read user photo
        user_photo_data = await user_photo.read()
        logger.info(f"✅ User photo read: {len(user_photo_data)} bytes")
        
        # Initialize MagicAPI Service
        magicapi_service = MagicAPIService(
            api_key=settings.magicapi_api_key,
            api_url=settings.magicapi_api_url
        )
        
        # Determine prompt
        prompt = "hairstyle"
        if hairstyle_id:
            # Look up hairstyle name from static data
            hairstyle = perfectcorp_service.get_hairstyle_by_id(hairstyle_id)
            if hairstyle:
                prompt = f"{hairstyle.get('style_name', '')} hairstyle"
                logger.info(f"🎯 Using prompt from hairstyle ID: {prompt}")
        
        # Process with MagicAPI
        logger.info(f"🎨 Processing with MagicAPI (Prompt: {prompt})")
        result_url = await magicapi_service.generate_hairstyle(user_photo_data, prompt)
        
        if not result_url:
            # Fallback or Error
            logger.error("❌ MagicAPI processing failed")
            raise HTTPException(status_code=500, detail="Failed to process hair try-on")
            
        logger.info(f"✅ Processing complete. Result URL: {result_url}")
        
        # Save to database
        result_id = str(uuid.uuid4())
        await database_service.save_hair_tryOn_result({
            "result_id": result_id,
            "user_id": user_id,
            "result_media_url": result_url,
            "hairstyle_source": f"magicapi:{prompt}",
            "created_at": datetime.utcnow(),
            "status": "completed"
        })
        
        # Return JSON with URL
        return {
            "success": True,
            "result_id": result_id,
            "result_url": result_url,
            "processing_time": 0
        }
        
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
        return {
            "status": "healthy",
            "service": "hair-tryOn-service",
            "version": settings.service_version,
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
