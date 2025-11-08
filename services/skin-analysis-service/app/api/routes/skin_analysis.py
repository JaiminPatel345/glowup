from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import logging
import asyncio
import time

from app.models.skin_analysis import (
    SkinAnalysisResponse, 
    ProductRecommendations,
    SkinAnalysisRequest
)
from app.services.image_service import ImageService
from app.services.skin_analysis_service import SkinAnalysisService
from app.services.product_service import ProductService
from app.core.database import get_database

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=SkinAnalysisResponse)
async def analyze_skin(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    user_id: str = Form(...),
    db=Depends(get_database)
):
    """
    Analyze uploaded skin image and return skin type and detected issues.
    Does not include product recommendations - use separate endpoint for that.
    """
    start_time = time.time()
    
    try:
        # Validate image
        image_service = ImageService()
        await image_service.validate_image(image)
        
        # Process image
        processed_image_path = await image_service.save_and_process_image(image)
        
        # Perform skin analysis
        analysis_service = SkinAnalysisService(db)
        analysis_result = await analysis_service.analyze_skin(
            user_id=user_id,
            image_path=processed_image_path
        )
        
        processing_time = time.time() - start_time
        logger.info(f"Skin analysis completed in {processing_time:.2f} seconds for user {user_id}")
        
        # Clean up uploaded file in background
        background_tasks.add_task(image_service.cleanup_file, processed_image_path)
        
        return SkinAnalysisResponse(
            skin_type=analysis_result.skin_type,
            issues=analysis_result.issues,
            analysis_id=str(analysis_result.id)
        )
        
    except Exception as e:
        logger.error(f"Skin analysis failed for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/analysis/{analysis_id}")
async def get_analysis_result(
    analysis_id: str,
    db=Depends(get_database)
):
    """Get previously stored analysis result by ID"""
    try:
        analysis_service = SkinAnalysisService(db)
        result = await analysis_service.get_analysis_by_id(analysis_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return SkinAnalysisResponse(
            skin_type=result.skin_type,
            issues=result.issues,
            analysis_id=str(result.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve analysis {analysis_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analysis")


@router.get("/recommendations/{issue_id}", response_model=ProductRecommendations)
async def get_product_recommendations(
    issue_id: str,
    category: Optional[str] = None,  # "all", "ayurvedic", "non-ayurvedic"
    db=Depends(get_database)
):
    """
    Get product recommendations for a specific skin issue.
    Separate endpoint as per requirements - not included in analysis response.
    """
    try:
        product_service = ProductService(db)
        recommendations = await product_service.get_recommendations(issue_id, category)
        
        if not recommendations:
            # Return empty recommendations instead of error
            return ProductRecommendations(
                issue_id=issue_id,
                all_products=[],
                ayurvedic_products=[],
                non_ayurvedic_products=[]
            )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Failed to get recommendations for issue {issue_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get product recommendations")


@router.get("/user/{user_id}/history")
async def get_user_analysis_history(
    user_id: str,
    limit: int = 10,
    offset: int = 0,
    db=Depends(get_database)
):
    """Get analysis history for a specific user"""
    try:
        analysis_service = SkinAnalysisService(db)
        history = await analysis_service.get_user_history(user_id, limit, offset)
        
        return {
            "user_id": user_id,
            "analyses": [
                {
                    "analysis_id": str(analysis.id),
                    "skin_type": analysis.skin_type,
                    "issues_count": len(analysis.issues),
                    "created_at": analysis.created_at.isoformat()
                }
                for analysis in history
            ],
            "total": len(history)
        }
        
    except Exception as e:
        logger.error(f"Failed to get history for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analysis history")


@router.get("/products/search")
async def search_products(
    q: str,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    db=Depends(get_database)
):
    """Search products by name, brand, or ingredients with filters"""
    try:
        product_service = ProductService(db)
        
        filters = {}
        if category == "ayurvedic":
            filters["is_ayurvedic"] = True
        elif category == "non-ayurvedic":
            filters["is_ayurvedic"] = False
        if max_price:
            filters["max_price"] = max_price
        if min_rating:
            filters["min_rating"] = min_rating
        
        products = await product_service.search_products(q, filters)
        
        return {
            "query": q,
            "filters": filters,
            "products": products,
            "total": len(products)
        }
        
    except Exception as e:
        logger.error(f"Product search failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Product search failed")


@router.get("/products/trending")
async def get_trending_products(
    category: Optional[str] = None,
    limit: int = 10,
    db=Depends(get_database)
):
    """Get trending (highest rated) products"""
    try:
        product_service = ProductService(db)
        products = await product_service.get_trending_products(category, limit)
        
        return {
            "category": category or "all",
            "products": products,
            "total": len(products)
        }
        
    except Exception as e:
        logger.error(f"Failed to get trending products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get trending products")


@router.get("/products/{product_id}")
async def get_product_details(
    product_id: str,
    db=Depends(get_database)
):
    """Get detailed information about a specific product"""
    try:
        product_service = ProductService(db)
        product = await product_service.get_product_by_id(product_id)
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve product details")


@router.get("/stats")
async def get_service_stats(db=Depends(get_database)):
    """Get service statistics including product and recommendation data"""
    try:
        product_service = ProductService(db)
        analysis_service = SkinAnalysisService(db)
        
        # Get product stats
        product_stats = await product_service.get_recommendation_stats()
        
        # Get analysis stats
        total_analyses = await analysis_service.collection.count_documents({})
        
        return {
            "service": "skin-analysis",
            "version": "1.0.0",
            "statistics": {
                "total_analyses": total_analyses,
                **product_stats
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get service stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve service statistics")