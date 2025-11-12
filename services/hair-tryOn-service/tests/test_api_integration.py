import pytest
import json
import tempfile
import os
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from io import BytesIO

from app.main import app

class TestHairTryOnAPI:
    """Integration tests for Hair Try-On API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.mark.integration
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Hair Try-On Service"
        assert "endpoints" in data
    
    @pytest.mark.integration
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/api/hair/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "hair-tryOn-service"
    
    @pytest.mark.integration
    @patch('app.services.video_service.video_service.validate_video')
    @patch('app.services.video_service.video_service.save_uploaded_video')
    @patch('app.services.video_service.video_service.get_video_info')
    def test_upload_video_success(self, mock_get_info, mock_save, mock_validate, client):
        """Test successful video upload"""
        # Mock video service methods
        mock_validate.return_value = {"size": 1000, "format": "mp4"}
        mock_save.return_value = "/uploads/test_id.mp4"
        mock_get_info.return_value = {
            "fps": 30.0,
            "frame_count": 300,
            "duration": 10.0,
            "resolution": {"width": 640, "height": 480}
        }
        
        # Create fake video file
        video_content = b"fake video content"
        
        response = client.post(
            "/api/hair/upload-video",
            files={"video": ("test.mp4", BytesIO(video_content), "video/mp4")},
            data={"user_id": "test_user"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "upload_id" in data
        assert data["file_size"] == 1000
        assert data["duration"] == 10.0
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.create_hair_tryOn_result')
    @patch('app.services.database_service.database_service.update_hair_tryOn_result')
    def test_process_video_initiation(self, mock_update, mock_create, client):
        """Test video processing initiation"""
        mock_create.return_value = "test_result_id"
        mock_update.return_value = True
        
        # Create fake image files
        style_image = BytesIO(b"fake style image")
        
        response = client.post(
            "/api/hair/process-video",
            files={"style_image": ("style.jpg", style_image, "image/jpeg")},
            data={
                "upload_id": "test_upload_id",
                "user_id": "test_user"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test_result_id"
        assert data["status"] == "processing"
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_hair_tryOn_result')
    def test_get_result_success(self, mock_get_result, client, sample_hair_tryOn_result):
        """Test getting result successfully"""
        mock_get_result.return_value = sample_hair_tryOn_result
        
        response = client.get(
            f"/api/hair/result/{sample_hair_tryOn_result.id}",
            params={"user_id": sample_hair_tryOn_result.user_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_hair_tryOn_result.id
        assert data["user_id"] == sample_hair_tryOn_result.user_id
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_hair_tryOn_result')
    def test_get_result_not_found(self, mock_get_result, client):
        """Test getting non-existent result"""
        mock_get_result.return_value = None
        
        response = client.get(
            "/api/hair/result/nonexistent_id",
            params={"user_id": "test_user"}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_hair_tryOn_result')
    def test_get_result_access_denied(self, mock_get_result, client, sample_hair_tryOn_result):
        """Test getting result with wrong user ID"""
        mock_get_result.return_value = sample_hair_tryOn_result
        
        response = client.get(
            f"/api/hair/result/{sample_hair_tryOn_result.id}",
            params={"user_id": "wrong_user"}
        )
        
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_user_hair_tryOn_history')
    def test_get_user_history(self, mock_get_history, client):
        """Test getting user history"""
        from app.models.hair_tryOn import HairTryOnHistory
        
        mock_history = HairTryOnHistory(
            user_id="test_user",
            results=[],
            total_count=0
        )
        mock_get_history.return_value = mock_history
        
        response = client.get("/api/hair/history/test_user")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "test_user"
        assert data["total_count"] == 0
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_user_hair_tryOn_history')
    def test_get_user_history_with_filters(self, mock_get_history, client):
        """Test getting user history with filters"""
        from app.models.hair_tryOn import HairTryOnHistory
        
        mock_history = HairTryOnHistory(
            user_id="test_user",
            results=[],
            total_count=0
        )
        mock_get_history.return_value = mock_history
        
        response = client.get(
            "/api/hair/history/test_user",
            params={
                "limit": 10,
                "offset": 5,
                "type_filter": "video"
            }
        )
        
        assert response.status_code == 200
        # Verify the service was called with correct parameters
        mock_get_history.assert_called_once()
    
    @pytest.mark.integration
    def test_get_user_history_invalid_type_filter(self, client):
        """Test getting user history with invalid type filter"""
        response = client.get(
            "/api/hair/history/test_user",
            params={"type_filter": "invalid_type"}
        )
        
        assert response.status_code == 400
        assert "Invalid type filter" in response.json()["detail"]
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.delete_hair_tryOn_result')
    def test_delete_result_success(self, mock_delete, client):
        """Test successful result deletion"""
        mock_delete.return_value = True
        
        response = client.delete(
            "/api/hair/result/test_result_id",
            params={"user_id": "test_user"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "deleted successfully" in data["message"]
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.delete_hair_tryOn_result')
    def test_delete_result_not_found(self, mock_delete, client):
        """Test deleting non-existent result"""
        mock_delete.return_value = False
        
        response = client.delete(
            "/api/hair/result/nonexistent_id",
            params={"user_id": "test_user"}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_processing_statistics')
    @patch('app.services.websocket_service.websocket_service.connection_manager.get_connection_stats')
    @patch('app.services.ai_service.ai_service.get_processing_stats')
    def test_get_stats(self, mock_ai_stats, mock_ws_stats, mock_db_stats, client):
        """Test getting processing statistics"""
        mock_db_stats.return_value = {"total_processed": 100}
        mock_ws_stats.return_value = {"active_connections": 5}
        mock_ai_stats.return_value = {"total_processed": 100}
        
        response = client.get("/api/hair/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "database_stats" in data
        assert "websocket_stats" in data
        assert "ai_stats" in data

class TestVideoUploadValidation:
    """Test video upload validation"""
    
    @pytest.mark.integration
    def test_upload_video_missing_file(self, client):
        """Test upload without video file"""
        response = client.post(
            "/api/hair/upload-video",
            data={"user_id": "test_user"}
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    def test_upload_video_missing_user_id(self, client):
        """Test upload without user ID"""
        video_content = b"fake video content"
        
        response = client.post(
            "/api/hair/upload-video",
            files={"video": ("test.mp4", BytesIO(video_content), "video/mp4")}
        )
        
        assert response.status_code == 422  # Validation error

class TestErrorHandling:
    """Test API error handling"""
    
    @pytest.mark.integration
    @patch('app.services.database_service.database_service.get_hair_tryOn_result')
    def test_database_error_handling(self, mock_get_result, client):
        """Test handling of database errors"""
        mock_get_result.side_effect = Exception("Database connection failed")
        
        response = client.get(
            "/api/hair/result/test_id",
            params={"user_id": "test_user"}
        )
        
        assert response.status_code == 500
        assert "Failed to retrieve result" in response.json()["detail"]
    
    @pytest.mark.integration
    @patch('app.services.video_service.video_service.validate_video')
    def test_video_service_error_handling(self, mock_validate, client):
        """Test handling of video service errors"""
        mock_validate.side_effect = Exception("Video processing failed")
        
        video_content = b"fake video content"
        
        response = client.post(
            "/api/hair/upload-video",
            files={"video": ("test.mp4", BytesIO(video_content), "video/mp4")},
            data={"user_id": "test_user"}
        )
        
        assert response.status_code == 500
        assert "Video upload failed" in response.json()["detail"]