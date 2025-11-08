import redis
import json
import logging
import hashlib
from typing import Any, Optional, Dict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis caching utility for Python services"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or "redis://localhost:6379"
        self.client = None
        self.is_connected = False
        
    async def connect(self):
        """Initialize Redis connection"""
        try:
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            await self._ping()
            self.is_connected = True
            logger.info("Redis cache connected successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.is_connected = False
            raise
    
    async def _ping(self):
        """Test Redis connection"""
        if self.client:
            return self.client.ping()
        return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if not self.is_connected:
                logger.warning("Redis not connected, skipping cache get")
                return None
                
            value = self.client.get(key)
            if value:
                return json.loads(value)
            return None
            
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        """Set value in cache with TTL"""
        try:
            if not self.is_connected:
                logger.warning("Redis not connected, skipping cache set")
                return False
                
            serialized_value = json.dumps(value, default=str)
            self.client.setex(key, ttl_seconds, serialized_value)
            return True
            
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if not self.is_connected:
                logger.warning("Redis not connected, skipping cache delete")
                return False
                
            self.client.delete(key)
            return True
            
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            if not self.is_connected:
                return False
            return bool(self.client.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False
    
    async def increment(self, key: str, ttl_seconds: int = 3600) -> int:
        """Increment counter"""
        try:
            if not self.is_connected:
                logger.warning("Redis not connected, skipping increment")
                return 0
                
            result = self.client.incr(key)
            if result == 1:
                # Set TTL only on first increment
                self.client.expire(key, ttl_seconds)
            return result
            
        except Exception as e:
            logger.error(f"Redis INCR error for key {key}: {e}")
            return 0
    
    # Specialized caching methods for skin analysis
    
    async def cache_skin_analysis(self, image_hash: str, analysis_result: Dict, ttl_seconds: int = 7200) -> bool:
        """Cache skin analysis results"""
        key = f"skin_analysis:{image_hash}"
        return await self.set(key, analysis_result, ttl_seconds)
    
    async def get_cached_skin_analysis(self, image_hash: str) -> Optional[Dict]:
        """Get cached skin analysis results"""
        key = f"skin_analysis:{image_hash}"
        return await self.get(key)
    
    async def cache_product_recommendations(self, issue_id: str, products: Dict, ttl_seconds: int = 3600) -> bool:
        """Cache product recommendations"""
        key = f"products:{issue_id}"
        return await self.set(key, products, ttl_seconds)
    
    async def get_cached_product_recommendations(self, issue_id: str) -> Optional[Dict]:
        """Get cached product recommendations"""
        key = f"products:{issue_id}"
        return await self.get(key)
    
    async def cache_user_session(self, user_id: str, session_data: Dict, ttl_seconds: int = 86400) -> bool:
        """Cache user session data"""
        key = f"session:{user_id}"
        return await self.set(key, session_data, ttl_seconds)
    
    async def get_user_session(self, user_id: str) -> Optional[Dict]:
        """Get cached user session"""
        key = f"session:{user_id}"
        return await self.get(key)
    
    async def invalidate_user_session(self, user_id: str) -> bool:
        """Invalidate user session"""
        key = f"session:{user_id}"
        return await self.delete(key)
    
    async def check_rate_limit(self, identifier: str, limit: int, window_seconds: int) -> Dict:
        """Check rate limiting"""
        key = f"rate_limit:{identifier}"
        current = await self.increment(key, window_seconds)
        
        return {
            "allowed": current <= limit,
            "current": current,
            "limit": limit,
            "reset_time": datetime.now() + timedelta(seconds=window_seconds)
        }
    
    @staticmethod
    def generate_image_hash(image_data: bytes) -> str:
        """Generate hash for image content"""
        return hashlib.sha256(image_data).hexdigest()
    
    async def health_check(self) -> Dict:
        """Health check for Redis service"""
        try:
            if not self.is_connected:
                return {
                    "status": "disconnected",
                    "message": "Redis client not connected"
                }
            
            await self._ping()
            return {
                "status": "healthy",
                "message": "Redis connection is healthy"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": str(e)
            }


# Singleton instance
redis_cache = RedisCache()