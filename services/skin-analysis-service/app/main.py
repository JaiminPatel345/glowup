from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.routes import skin_analysis, health

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Skin Analysis Service...")
    await connect_to_mongo()
    logger.info("Connected to MongoDB")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Skin Analysis Service...")
    await close_mongo_connection()
    logger.info("Disconnected from MongoDB")


app = FastAPI(
    title="Skin Analysis Service",
    description="AI-powered skin analysis and product recommendation service",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(skin_analysis.router, prefix="/api/skin", tags=["skin-analysis"])


@app.get("/")
async def root():
    return {"message": "Skin Analysis Service is running", "version": "1.0.0"}