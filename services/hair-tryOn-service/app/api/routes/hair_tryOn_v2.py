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
from app.services.huggingface_service import HuggingFaceService
from app.services.perfectcorp_service import PerfectCorpService
from app.services.database_service import database_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hair", tags=["Hair Try-On"])

# Initialize services based on configuration
if settings.use_huggingface_api and settings.huggingface_api_key:
    logger.info("🤗 Using Hugging Face API for hair processing")
    hair_processing_service = HuggingFaceService(
        api_key=settings.huggingface_api_key,
        model_name="hairfast"  # Priority 1: HairFastGAN
    )
else:
    logger.info("🔧 Using local HairFastGAN model")
    hair_processing_service = HairFastGANService(
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
        await hair_processing_service.initialize()
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
    use_ai: bool = Form(False, description="Use PerfectCorp AI Hairstyle Generator")
):
    """
    Process hair try-on request
    
    User can either:
    - Upload a custom hairstyle image
    - Select a default hairstyle by ID
    - Use PerfectCorp AI Hairstyle Generator (if use_ai=true and API key is configured)
    
    Args:
        user_photo: User's photo
        hairstyle_image: Custom hairstyle image (optional)
        hairstyle_id: Default hairstyle ID (optional)
        user_id: User ID
        use_ai: Use PerfectCorp AI API for processing
        
    Returns:
        Processed image with hairstyle applied
    """
    logger.info(f"📸 Received hair try-on request for user {user_id}")
    logger.info(f"   - User photo: {user_photo.filename if user_photo else 'None'}")
    logger.info(f"   - Hairstyle image: {hairstyle_image.filename if hairstyle_image else 'None'}")
    logger.info(f"   - Hairstyle ID: {hairstyle_id or 'None'}")
    logger.info(f"   - Use AI: {use_ai}")
    
    try:
        # Read user photo
        user_photo_data = await user_photo.read()
        logger.info(f"✅ User photo read: {len(user_photo_data)} bytes")
        
        # Check if using PerfectCorp AI
        if use_ai and hairstyle_id:
            logger.info("🤖 Using PerfectCorp AI Hairstyle Generator")
            
            # Use PerfectCorp AI API
            result_image_data = await perfectcorp_service.apply_hairstyle(
                user_image_bytes=user_photo_data,
                template_id=hairstyle_id
            )
            
            if not result_image_data:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to process with PerfectCorp AI. Please try again or use custom image processing."
                )
            
            hairstyle_source = f"perfectcorp_ai:{hairstyle_id}"
            
        else:
            # Use traditional processing with HairFastGAN or HuggingFace
            logger.info("🎨 Using traditional hair processing (HairFastGAN/HuggingFace)")
            
            # Validate input
            if not hairstyle_image and not hairstyle_id:
                logger.error("❌ Validation failed: Neither hairstyle_image nor hairstyle_id provided")
                raise HTTPException(
                    status_code=400,
                    detail="Either hairstyle_image or hairstyle_id must be provided"
                )
            
            # Get hairstyle image
            if hairstyle_image:
                # Use custom uploaded image
                logger.info("📁 Using custom hairstyle image...")
                hairstyle_data = await hairstyle_image.read()
                hairstyle_source = "custom"
                logger.info(f"✅ Custom hairstyle read: {len(hairstyle_data)} bytes")
            else:
                # Download default hairstyle
                logger.info(f"🔍 Looking up hairstyle ID: {hairstyle_id}")
                hairstyle = perfectcorp_service.get_hairstyle_by_id(hairstyle_id)
                if not hairstyle:
                    logger.error(f"❌ Hairstyle not found for ID: {hairstyle_id}")
                    raise HTTPException(status_code=404, detail="Hairstyle not found")
                
                logger.info(f"✅ Found hairstyle: {hairstyle.get('style_name', 'Unknown')}")
                logger.info(f"📥 Downloading hairstyle image from: {hairstyle.get('preview_image_url')}")
                
                # Download the hairstyle image from URL
                image_url = hairstyle.get('preview_image_url')
                if not image_url:
                    logger.error(f"❌ No preview_image_url for hairstyle: {hairstyle_id}")
                    raise HTTPException(status_code=500, detail="Hairstyle image URL not found")
                
                # Download image using aiohttp
                import aiohttp
                import traceback
                try:
                    async with aiohttp.ClientSession() as session:
                        logger.info(f"🌐 Making HTTP request to: {image_url}")
                        async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                            logger.info(f"📡 Response status: {response.status}")
                            if response.status == 200:
                                hairstyle_data = await response.read()
                                logger.info(f"✅ Hairstyle downloaded: {len(hairstyle_data)} bytes")
                            else:
                                logger.error(f"❌ Failed to download image: HTTP {response.status}")
                                raise HTTPException(status_code=500, detail=f"Failed to download hairstyle image: HTTP {response.status}")
                except aiohttp.ClientError as download_error:
                    error_msg = f"{type(download_error).__name__}: {str(download_error)}"
                    logger.error(f"❌ Error downloading hairstyle image: {error_msg}")
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    raise HTTPException(status_code=500, detail=f"Error downloading hairstyle image: {error_msg}")
                except Exception as download_error:
                    error_msg = f"{type(download_error).__name__}: {str(download_error)}"
                    logger.error(f"❌ Error downloading hairstyle image: {error_msg}")
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    raise HTTPException(status_code=500, detail=f"Error downloading hairstyle image: {error_msg}")
                
                hairstyle_source = f"default:{hairstyle_id}"
            
            # Process with HairFastGAN or HuggingFace
            logger.info("🎨 Starting hair processing...")
            result_image_data = await hair_processing_service.process_image(
                source_image_data=user_photo_data,
                style_image_data=hairstyle_data
            )
            logger.info(f"✅ Processing complete: {len(result_image_data)} bytes")
        
        # Save to database
        result_id = str(uuid.uuid4())
        await database_service.save_hair_tryOn_result({
            "result_id": result_id,
            "user_id": user_id,
            "hairstyle_source": hairstyle_source,
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
        device_info = hair_processing_service.get_device_info()
        
        return {
            "status": "healthy",
            "service": "hair-tryOn-service",
            "version": settings.service_version,
            "model_loaded": hair_processing_service.initialized,
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
