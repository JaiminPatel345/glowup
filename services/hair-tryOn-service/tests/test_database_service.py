import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from app.services.database_service import database_service
from app.models.hair_tryOn import (
    HairTryOnResult, 
    ProcessingType, 
    ProcessingStatus,
    HairTryOnHistory
)

class TestDatabaseService:
    """Unit tests for DatabaseService"""
    
    @pytest.mark.unit
    async def test_initialize(self, mock_database):
        """Test database service initialization"""
        await database_service.initialize()
        assert database_service.db is not None
    
    @pytest.mark.unit
    async def test_create_hair_tryOn_result(self, mock_database, sample_hair_tryOn_result):
        """Test creating hair try-on result"""
        mock_database.hair_tryOn_history.insert_one.return_value = MagicMock(inserted_id="test_id")
        
        result_id = await database_service.create_hair_tryOn_result(sample_hair_tryOn_result)
        
        assert result_id is not None
        mock_database.hair_tryOn_history.insert_one.assert_called_once()
    
    @pytest.mark.unit
    async def test_update_hair_tryOn_result(self, mock_database):
        """Test updating hair try-on result"""
        result_id = "test_result_id"
        updates = {"status": ProcessingStatus.COMPLETED.value}
        
        mock_database.hair_tryOn_history.update_one.return_value = MagicMock(modified_count=1)
        
        success = await database_service.update_hair_tryOn_result(result_id, updates)
        
        assert success is True
        mock_database.hair_tryOn_history.update_one.assert_called_once()
    
    @pytest.mark.unit
    async def test_update_hair_tryOn_result_not_found(self, mock_database):
        """Test updating non-existent hair try-on result"""
        result_id = "nonexistent_id"
        updates = {"status": ProcessingStatus.COMPLETED.value}
        
        mock_database.hair_tryOn_history.update_one.return_value = MagicMock(modified_count=0)
        
        success = await database_service.update_hair_tryOn_result(result_id, updates)
        
        assert success is False
    
    @pytest.mark.unit
    async def test_get_hair_tryOn_result_found(self, mock_database, sample_hair_tryOn_result):
        """Test getting existing hair try-on result"""
        result_id = "test_result_id"
        
        mock_database.hair_tryOn_history.find_one.return_value = sample_hair_tryOn_result.dict()
        
        result = await database_service.get_hair_tryOn_result(result_id)
        
        assert result is not None
        assert isinstance(result, HairTryOnResult)
        mock_database.hair_tryOn_history.find_one.assert_called_once_with({"_id": result_id})
    
    @pytest.mark.unit
    async def test_get_hair_tryOn_result_not_found(self, mock_database):
        """Test getting non-existent hair try-on result"""
        result_id = "nonexistent_id"
        
        mock_database.hair_tryOn_history.find_one.return_value = None
        
        result = await database_service.get_hair_tryOn_result(result_id)
        
        assert result is None
    
    @pytest.mark.unit
    async def test_get_user_hair_tryOn_history(self, mock_database):
        """Test getting user hair try-on history"""
        user_id = "test_user_id"
        
        # Mock count and find operations
        mock_database.hair_tryOn_history.count_documents.return_value = 5
        
        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter([
            {
                "id": "result1",
                "user_id": user_id,
                "type": ProcessingType.VIDEO.value,
                "status": ProcessingStatus.COMPLETED.value,
                "original_media_url": "/test1.mp4",
                "style_image_url": "/style1.jpg",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ])
        
        mock_database.hair_tryOn_history.find.return_value = mock_cursor
        
        history = await database_service.get_user_hair_tryOn_history(user_id)
        
        assert isinstance(history, HairTryOnHistory)
        assert history.user_id == user_id
        assert history.total_count == 5
        assert len(history.results) == 1
    
    @pytest.mark.unit
    async def test_get_user_hair_tryOn_history_with_filter(self, mock_database):
        """Test getting user hair try-on history with type filter"""
        user_id = "test_user_id"
        processing_type = ProcessingType.VIDEO
        
        mock_database.hair_tryOn_history.count_documents.return_value = 3
        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter([])
        mock_database.hair_tryOn_history.find.return_value = mock_cursor
        
        history = await database_service.get_user_hair_tryOn_history(
            user_id, processing_type=processing_type
        )
        
        # Verify the filter was applied
        call_args = mock_database.hair_tryOn_history.find.call_args[0][0]
        assert call_args["user_id"] == user_id
        assert call_args["type"] == processing_type.value
    
    @pytest.mark.unit
    async def test_delete_hair_tryOn_result_success(self, mock_database):
        """Test successful deletion of hair try-on result"""
        result_id = "test_result_id"
        user_id = "test_user_id"
        
        mock_database.hair_tryOn_history.delete_one.return_value = MagicMock(deleted_count=1)
        
        success = await database_service.delete_hair_tryOn_result(result_id, user_id)
        
        assert success is True
        mock_database.hair_tryOn_history.delete_one.assert_called_once_with({
            "_id": result_id,
            "user_id": user_id
        })
    
    @pytest.mark.unit
    async def test_delete_hair_tryOn_result_not_found(self, mock_database):
        """Test deletion of non-existent hair try-on result"""
        result_id = "nonexistent_id"
        user_id = "test_user_id"
        
        mock_database.hair_tryOn_history.delete_one.return_value = MagicMock(deleted_count=0)
        
        success = await database_service.delete_hair_tryOn_result(result_id, user_id)
        
        assert success is False
    
    @pytest.mark.unit
    async def test_cleanup_old_results(self, mock_database):
        """Test cleanup of old results"""
        days_old = 30
        
        mock_database.hair_tryOn_history.delete_many.return_value = MagicMock(deleted_count=10)
        
        deleted_count = await database_service.cleanup_old_results(days_old)
        
        assert deleted_count == 10
        mock_database.hair_tryOn_history.delete_many.assert_called_once()
        
        # Verify the date filter
        call_args = mock_database.hair_tryOn_history.delete_many.call_args[0][0]
        assert "created_at" in call_args
        assert "$lt" in call_args["created_at"]
    
    @pytest.mark.unit
    async def test_get_processing_statistics(self, mock_database):
        """Test getting processing statistics"""
        days = 7
        
        # Mock aggregation result
        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter([
            {
                "_id": {"status": "completed", "type": "video"},
                "count": 10,
                "avg_processing_time": 5.5
            },
            {
                "_id": {"status": "failed", "type": "video"},
                "count": 2,
                "avg_processing_time": 3.0
            }
        ])
        
        mock_database.hair_tryOn_history.aggregate.return_value = mock_cursor
        
        stats = await database_service.get_processing_statistics(days)
        
        assert stats["period_days"] == days
        assert stats["total_processed"] == 12
        assert stats["successful_processed"] == 10
        assert stats["success_rate"] == 83.33
        assert len(stats["breakdown"]) == 2
    
    @pytest.mark.unit
    async def test_create_processing_queue_entry(self, mock_database):
        """Test creating processing queue entry"""
        user_id = "test_user_id"
        processing_type = ProcessingType.VIDEO
        input_data = {"video_url": "/test.mp4"}
        
        mock_database.processing_queue.insert_one.return_value = MagicMock()
        
        entry_id = await database_service.create_processing_queue_entry(
            user_id, processing_type, input_data
        )
        
        assert entry_id is not None
        mock_database.processing_queue.insert_one.assert_called_once()
    
    @pytest.mark.unit
    async def test_get_pending_queue_entries(self, mock_database):
        """Test getting pending queue entries"""
        limit = 10
        
        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter([
            {
                "_id": "entry1",
                "user_id": "user1",
                "type": "video",
                "status": "pending"
            }
        ])
        
        mock_database.processing_queue.find.return_value = mock_cursor
        
        entries = await database_service.get_pending_queue_entries(limit)
        
        assert len(entries) == 1
        assert entries[0]["_id"] == "entry1"
    
    @pytest.mark.unit
    async def test_update_queue_entry_status_success(self, mock_database):
        """Test updating queue entry status to success"""
        entry_id = "test_entry_id"
        status = ProcessingStatus.COMPLETED
        result_data = {"result_url": "/result.mp4"}
        
        mock_database.processing_queue.update_one.return_value = MagicMock(modified_count=1)
        
        success = await database_service.update_queue_entry_status(
            entry_id, status, result_data
        )
        
        assert success is True
        mock_database.processing_queue.update_one.assert_called_once()
    
    @pytest.mark.unit
    async def test_update_queue_entry_status_failed(self, mock_database):
        """Test updating queue entry status to failed"""
        entry_id = "test_entry_id"
        status = ProcessingStatus.FAILED
        
        mock_database.processing_queue.update_one.return_value = MagicMock(modified_count=1)
        
        success = await database_service.update_queue_entry_status(entry_id, status)
        
        assert success is True
        # Should be called twice: once for retry count increment, once for status update
        assert mock_database.processing_queue.update_one.call_count == 2

@pytest.mark.integration
class TestDatabaseIntegration:
    """Integration tests for database operations"""
    
    @pytest.mark.integration
    async def test_full_result_lifecycle(self, mock_database, sample_hair_tryOn_result):
        """Test complete result lifecycle: create, update, get, delete"""
        # Create
        result_id = await database_service.create_hair_tryOn_result(sample_hair_tryOn_result)
        assert result_id is not None
        
        # Update
        updates = {"status": ProcessingStatus.COMPLETED.value}
        success = await database_service.update_hair_tryOn_result(result_id, updates)
        assert success is True
        
        # Get
        mock_database.hair_tryOn_history.find_one.return_value = {
            **sample_hair_tryOn_result.dict(),
            "_id": result_id,
            "status": ProcessingStatus.COMPLETED.value
        }
        
        result = await database_service.get_hair_tryOn_result(result_id)
        assert result is not None
        assert result.status == ProcessingStatus.COMPLETED
        
        # Delete
        success = await database_service.delete_hair_tryOn_result(
            result_id, sample_hair_tryOn_result.user_id
        )
        assert success is True