from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from app.core.database import get_database
from app.models.hair_tryOn import (
    HairTryOnResult, 
    HairTryOnHistory, 
    ProcessingStatus, 
    ProcessingType,
    ProcessingMetadata
)
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    """Service for MongoDB operations related to hair try-on"""
    
    def __init__(self):
        self.db = None
    
    async def initialize(self):
        """Initialize database connection"""
        self.db = get_database()
        logger.info("Database service initialized")
    
    async def create_hair_tryOn_result(self, result: HairTryOnResult) -> str:
        """Create a new hair try-on result record"""
        try:
            result_dict = result.dict()
            result_dict["_id"] = str(ObjectId())
            result_dict["created_at"] = datetime.utcnow()
            result_dict["updated_at"] = datetime.utcnow()
            
            await self.db.hair_tryOn_history.insert_one(result_dict)
            logger.info(f"Created hair try-on result: {result_dict['_id']}")
            
            return result_dict["_id"]
            
        except Exception as e:
            logger.error(f"Failed to create hair try-on result: {e}")
            raise
    
    async def save_hair_tryOn_result(self, result_data: Dict[str, Any]) -> str:
        """Save a hair try-on result from dictionary data"""
        try:
            result_data["_id"] = result_data.get("result_id", str(ObjectId()))
            result_data["created_at"] = result_data.get("created_at", datetime.utcnow())
            result_data["updated_at"] = datetime.utcnow()
            
            await self.db.hair_tryOn_history.insert_one(result_data)
            logger.info(f"Saved hair try-on result: {result_data['_id']}")
            
            return result_data["_id"]
            
        except Exception as e:
            logger.error(f"Failed to save hair try-on result: {e}")
            raise
    
    async def update_hair_tryOn_result(
        self, 
        result_id: str, 
        updates: Dict[str, Any]
    ) -> bool:
        """Update an existing hair try-on result"""
        try:
            updates["updated_at"] = datetime.utcnow()
            
            result = await self.db.hair_tryOn_history.update_one(
                {"_id": result_id},
                {"$set": updates}
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated hair try-on result: {result_id}")
                return True
            else:
                logger.warning(f"No hair try-on result found with ID: {result_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to update hair try-on result {result_id}: {e}")
            raise
    
    async def get_hair_tryOn_result(self, result_id: str) -> Optional[HairTryOnResult]:
        """Get a hair try-on result by ID"""
        try:
            result = await self.db.hair_tryOn_history.find_one({"_id": result_id})
            
            if result:
                return HairTryOnResult(**result)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get hair try-on result {result_id}: {e}")
            raise
    
    async def get_user_hair_tryOn_history(
        self, 
        user_id: str, 
        limit: int = 20, 
        offset: int = 0,
        processing_type: Optional[ProcessingType] = None
    ) -> HairTryOnHistory:
        """Get hair try-on history for a user"""
        try:
            # Build query filter
            query_filter = {"user_id": user_id}
            if processing_type:
                query_filter["type"] = processing_type.value
            
            # Get total count
            total_count = await self.db.hair_tryOn_history.count_documents(query_filter)
            
            # Get results with pagination
            cursor = self.db.hair_tryOn_history.find(query_filter)\
                .sort("created_at", -1)\
                .skip(offset)\
                .limit(limit)
            
            results = []
            async for doc in cursor:
                results.append(HairTryOnResult(**doc))
            
            return HairTryOnHistory(
                user_id=user_id,
                results=results,
                total_count=total_count
            )
            
        except Exception as e:
            logger.error(f"Failed to get hair try-on history for user {user_id}: {e}")
            raise
    
    async def delete_hair_tryOn_result(self, result_id: str, user_id: str) -> bool:
        """Delete a hair try-on result (with user ownership check)"""
        try:
            result = await self.db.hair_tryOn_history.delete_one({
                "_id": result_id,
                "user_id": user_id
            })
            
            if result.deleted_count > 0:
                logger.info(f"Deleted hair try-on result: {result_id}")
                return True
            else:
                logger.warning(f"No hair try-on result found with ID: {result_id} for user: {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete hair try-on result {result_id}: {e}")
            raise
    
    async def cleanup_old_results(self, days_old: int = 30) -> int:
        """Clean up old hair try-on results"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            result = await self.db.hair_tryOn_history.delete_many({
                "created_at": {"$lt": cutoff_date}
            })
            
            deleted_count = result.deleted_count
            logger.info(f"Cleaned up {deleted_count} old hair try-on results")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old results: {e}")
            raise
    
    async def get_processing_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get processing statistics for the last N days"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {"created_at": {"$gte": start_date}}},
                {"$group": {
                    "_id": {
                        "status": "$status",
                        "type": "$type"
                    },
                    "count": {"$sum": 1},
                    "avg_processing_time": {
                        "$avg": "$processing_metadata.processing_time"
                    }
                }},
                {"$sort": {"_id.type": 1, "_id.status": 1}}
            ]
            
            stats = []
            async for doc in self.db.hair_tryOn_history.aggregate(pipeline):
                stats.append(doc)
            
            # Calculate totals
            total_processed = sum(stat["count"] for stat in stats)
            successful_processed = sum(
                stat["count"] for stat in stats 
                if stat["_id"]["status"] == ProcessingStatus.COMPLETED.value
            )
            
            success_rate = (successful_processed / total_processed * 100) if total_processed > 0 else 0
            
            return {
                "period_days": days,
                "total_processed": total_processed,
                "successful_processed": successful_processed,
                "success_rate": round(success_rate, 2),
                "breakdown": stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing statistics: {e}")
            raise
    
    async def create_processing_queue_entry(
        self, 
        user_id: str, 
        processing_type: ProcessingType,
        input_data: Dict[str, Any]
    ) -> str:
        """Create an entry in the processing queue"""
        try:
            queue_entry = {
                "_id": str(ObjectId()),
                "user_id": user_id,
                "type": processing_type.value,
                "status": ProcessingStatus.PENDING.value,
                "input_data": input_data,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "retry_count": 0,
                "max_retries": 3
            }
            
            await self.db.processing_queue.insert_one(queue_entry)
            logger.info(f"Created processing queue entry: {queue_entry['_id']}")
            
            return queue_entry["_id"]
            
        except Exception as e:
            logger.error(f"Failed to create processing queue entry: {e}")
            raise
    
    async def get_pending_queue_entries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get pending entries from the processing queue"""
        try:
            cursor = self.db.processing_queue.find({
                "status": ProcessingStatus.PENDING.value
            }).sort("created_at", 1).limit(limit)
            
            entries = []
            async for doc in cursor:
                entries.append(doc)
            
            return entries
            
        except Exception as e:
            logger.error(f"Failed to get pending queue entries: {e}")
            raise
    
    async def update_queue_entry_status(
        self, 
        entry_id: str, 
        status: ProcessingStatus,
        result_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update the status of a processing queue entry"""
        try:
            updates = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            
            if result_data:
                updates["result_data"] = result_data
            
            if status == ProcessingStatus.FAILED:
                # Increment retry count
                await self.db.processing_queue.update_one(
                    {"_id": entry_id},
                    {"$inc": {"retry_count": 1}}
                )
            
            result = await self.db.processing_queue.update_one(
                {"_id": entry_id},
                {"$set": updates}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update queue entry status {entry_id}: {e}")
            raise

# Global database service instance
database_service = DatabaseService()