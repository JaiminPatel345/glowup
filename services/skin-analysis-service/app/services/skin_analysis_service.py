from typing import List, Optional
import logging
from datetime import datetime
from bson import ObjectId
import asyncio
import time
import hashlib
import os

from app.models.skin_analysis import (
    SkinAnalysisResult, 
    SkinIssue, 
    AnalysisMetadata
)
from app.services.ai_service import AIService
from app.services.image_service import ImageService
from app.core.config import settings

# Import Redis cache
import sys
sys.path.append('/app/shared')
from cache.redis_cache import redis_cache

logger = logging.getLogger(__name__)


class SkinAnalysisService:
    """Service for performing skin analysis and managing results"""
    
    def __init__(self, database):
        self.db = database
        self.ai_service = AIService()
        self.image_service = ImageService()
        self.collection = self.db.skin_analysis
        
        # Initialize Redis cache
        self._initialize_cache()
    
    def _initialize_cache(self):
        """Initialize Redis cache connection"""
        try:
            asyncio.create_task(redis_cache.connect())
            logger.info("Redis cache initialized for skin analysis service")
        except Exception as e:
            logger.error(f"Failed to initialize Redis cache: {e}")

    def _generate_image_hash(self, image_path: str) -> str:
        """Generate hash for image file"""
        try:
            with open(image_path, 'rb') as f:
                image_data = f.read()
            return hashlib.sha256(image_data).hexdigest()
        except Exception as e:
            logger.error(f"Failed to generate image hash: {e}")
            return str(hash(image_path))  # Fallback to path hash

    async def analyze_skin(self, user_id: str, image_path: str) -> SkinAnalysisResult:
        """
        Perform complete skin analysis on uploaded image
        Returns skin type and detected issues without product recommendations
        """
        start_time = time.time()
        
        try:
            # Generate image hash for caching
            image_hash = self._generate_image_hash(image_path)
            
            # Check cache first
            cached_result = await redis_cache.get_cached_skin_analysis(image_hash)
            if cached_result:
                logger.info(f"Returning cached skin analysis for user {user_id}")
                # Update user_id in cached result
                cached_result['user_id'] = user_id
                return SkinAnalysisResult(**cached_result)
            
            # Calculate image quality score
            quality_score = self.image_service.calculate_image_quality_score(image_path)
            
            # Check if image quality is sufficient
            if quality_score < 0.3:  # Minimum quality threshold
                raise ValueError("Image quality is insufficient for analysis. Please upload a clearer image.")
            
            # Perform AI analysis
            analysis_results = await self.ai_service.analyze_skin_image(image_path)
            
            # Create skin issues from AI results
            issues = []
            for issue_data in analysis_results.get('issues', []):
                # Generate highlighted image for each issue
                highlighted_image_url = await self._generate_highlighted_image(
                    image_path, issue_data
                )
                
                issue = SkinIssue(
                    id=issue_data['id'],
                    name=issue_data['name'],
                    description=issue_data['description'],
                    severity=issue_data['severity'],
                    causes=issue_data.get('causes', []),
                    highlighted_image_url=highlighted_image_url,
                    confidence=issue_data.get('confidence', 0.8)
                )
                issues.append(issue)
            
            # Create analysis metadata
            processing_time = time.time() - start_time
            metadata = AnalysisMetadata(
                model_version=self.ai_service.get_model_version(),
                processing_time=processing_time,
                image_quality=quality_score
            )
            
            # Create analysis result
            analysis_result = SkinAnalysisResult(
                user_id=user_id,
                image_url=image_path,  # In production, this would be a cloud storage URL
                skin_type=analysis_results.get('skin_type', 'unknown'),
                issues=issues,
                analysis_metadata=metadata
            )
            
            # Store result in database
            result_dict = analysis_result.dict(by_alias=True)
            result_dict.pop('id', None)  # Remove id to let MongoDB generate it
            
            insert_result = await self.collection.insert_one(result_dict)
            analysis_result.id = insert_result.inserted_id
            
            # Cache the result for future requests with same image
            cache_data = analysis_result.dict(by_alias=True)
            cache_data.pop('user_id', None)  # Don't cache user-specific data
            await redis_cache.cache_skin_analysis(image_hash, cache_data, 7200)  # 2 hours
            
            logger.info(f"Skin analysis completed for user {user_id} in {processing_time:.2f}s")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Skin analysis failed for user {user_id}: {str(e)}")
            raise
    
    async def get_analysis_by_id(self, analysis_id: str) -> Optional[SkinAnalysisResult]:
        """Retrieve analysis result by ID"""
        try:
            if not ObjectId.is_valid(analysis_id):
                return None
            
            # Try cache first
            cache_key = f"analysis:{analysis_id}"
            cached_result = await redis_cache.get(cache_key)
            if cached_result:
                logger.debug(f"Analysis {analysis_id} found in cache")
                return SkinAnalysisResult(**cached_result)
            
            result = await self.collection.find_one({"_id": ObjectId(analysis_id)})
            
            if result:
                analysis_result = SkinAnalysisResult(**result)
                # Cache for 1 hour
                await redis_cache.set(cache_key, result, 3600)
                return analysis_result
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve analysis {analysis_id}: {str(e)}")
            return None
    
    async def get_user_history(self, user_id: str, limit: int = 10, offset: int = 0) -> List[SkinAnalysisResult]:
        """Get analysis history for a user"""
        try:
            cursor = self.collection.find(
                {"userId": user_id}
            ).sort("createdAt", -1).skip(offset).limit(limit)
            
            results = []
            async for doc in cursor:
                results.append(SkinAnalysisResult(**doc))
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get history for user {user_id}: {str(e)}")
            return []
    
    async def _generate_highlighted_image(self, image_path: str, issue_data: dict) -> Optional[str]:
        """Generate highlighted image showing detected issue areas"""
        try:
            # The AI service now handles highlighting during analysis
            # This method is called if additional highlighting is needed
            
            # If the issue already has a highlighted image URL, return it
            if issue_data.get('highlighted_image_url'):
                return issue_data['highlighted_image_url']
            
            # Otherwise, generate basic highlighting based on issue type
            issue_type = issue_data.get('name', '').lower()
            
            if 'acne' in issue_type:
                regions = await self.ai_service._detect_acne_regions(
                    await self._load_image_array(image_path)
                )
                return await self.ai_service._create_highlighted_image(
                    image_path, regions, "acne"
                )
            elif 'dark' in issue_type or 'pigment' in issue_type:
                regions = await self.ai_service._detect_dark_spots(
                    await self._load_image_array(image_path)
                )
                return await self.ai_service._create_highlighted_image(
                    image_path, regions, "dark_spots"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to generate highlighted image: {str(e)}")
            return None
    
    async def _load_image_array(self, image_path: str):
        """Load image as numpy array for processing"""
        try:
            import cv2
            image = cv2.imread(image_path)
            return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        except Exception as e:
            logger.error(f"Failed to load image array: {str(e)}")
            return None
    
    async def delete_analysis(self, analysis_id: str, user_id: str) -> bool:
        """Delete analysis result (with user verification)"""
        try:
            if not ObjectId.is_valid(analysis_id):
                return False
            
            result = await self.collection.delete_one({
                "_id": ObjectId(analysis_id),
                "userId": user_id  # Ensure user can only delete their own analyses
            })
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Failed to delete analysis {analysis_id}: {str(e)}")
            return False