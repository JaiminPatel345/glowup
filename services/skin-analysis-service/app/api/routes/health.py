from fastapi import APIRouter, Depends
from app.core.database import get_database
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "skin-analysis"}


@router.get("/detailed")
async def detailed_health_check(db=Depends(get_database)):
    """Detailed health check including database connectivity"""
    try:
        # Test database connection
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"
    
    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "service": "skin-analysis",
        "database": db_status,
        "version": "1.0.0"
    }