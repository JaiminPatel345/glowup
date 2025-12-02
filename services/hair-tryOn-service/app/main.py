from dotenv import load_dotenv
import os

# Load environment variables from .env file immediately
load_dotenv()
# Also try loading .env.local if it exists (overrides .env)
load_dotenv(".env.local", override=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import os
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.routes.hair_tryOn_v2 import router as hair_tryOn_router
from app.services.database_service import database_service

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s \n"
)
logging.getLogger("pymongo").setLevel(logging.WARNING)
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
        try:
            await connect_to_mongo()
            # Initialize services
            await database_service.initialize()
            logger.info("Database connected successfully")
        except Exception as db_e:
            logger.error(f"Failed to connect to database: {db_e}")
            logger.warning("Service starting without database connection")
        
        logger.info("Hair Try-On Service started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        # Don't raise, allow partial startup
        yield
    finally:
        # Shutdown
        logger.info("Shutting down Hair Try-On Service...")
        
        try:
            await close_mongo_connection()
            logger.info("Hair Try-On Service shut down successfully")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")

# Create FastAPI application
app = FastAPI(
    title="Hair Try-On Service",
    description="AI-powered hair style try-on service with local HairFastGAN inference",
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

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(f"📨 Hair Service - Incoming: {request.method} {request.url.path}")
    logger.info(f"   Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    
    logger.info(f"📤 Hair Service - Response: {request.method} {request.url.path} -> {response.status_code}")
    
    return response

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
        "features": [
            "Local HairFastGAN inference",
            "PerfectCorp default hairstyles",
            "Custom hairstyle upload",
            "Single image processing"
        ],
        "endpoints": {
            "get_hairstyles": "/api/hair/hairstyles",
            "get_hairstyle": "/api/hair/hairstyles/{hairstyle_id}",
            "process": "/api/hair/process",
            "get_history": "/api/hair/history/{user_id}",
            "delete_result": "/api/hair/result/{result_id}",
            "health_check": "/api/hair/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=3004,
        reload=settings.debug,
        log_level="info"
    )