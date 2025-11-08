from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import os
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.routes.hair_tryOn import router as hair_tryOn_router
from app.services.ai_service import ai_service
from app.services.database_service import database_service
from app.services.websocket_service import websocket_service

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Hair Try-On Service...")
    
    try:
        # Create necessary directories
        os.makedirs(settings.upload_dir, exist_ok=True)
        os.makedirs(settings.temp_dir, exist_ok=True)
        os.makedirs(settings.model_path, exist_ok=True)
        
        # Initialize database connection
        await connect_to_mongo()
        
        # Initialize services
        await database_service.initialize()
        await ai_service.initialize()
        await websocket_service.start_service()
        
        logger.info("Hair Try-On Service started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down Hair Try-On Service...")
        
        try:
            await websocket_service.stop_service()
            await close_mongo_connection()
            logger.info("Hair Try-On Service shut down successfully")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")

# Create FastAPI application
app = FastAPI(
    title="Hair Try-On Service",
    description="AI-powered hair style try-on service with video processing and real-time streaming",
    version=settings.service_version,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving uploads
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(hair_tryOn_router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred",
            "details": str(exc) if settings.debug else None
        }
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Hair Try-On Service",
        "version": settings.service_version,
        "status": "running",
        "endpoints": {
            "upload_video": "/api/hair-tryOn/upload-video",
            "process_video": "/api/hair-tryOn/process-video",
            "realtime_websocket": "/api/hair-tryOn/realtime/{session_id}",
            "get_result": "/api/hair-tryOn/result/{result_id}",
            "get_history": "/api/hair-tryOn/history/{user_id}",
            "health_check": "/api/hair-tryOn/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )