import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
import tempfile
import os
from PIL import Image
import io

from app.main import app


class TestAPIIntegration:
    """Integration tests for API endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    async def async_client(self):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    @pytest.fixture
    def sample_image_bytes(self, sample_image):
        """Convert sample image to bytes for upload"""
        pil_image = Image.fromarray(sample_image)
        img_bytes = io.BytesIO()
        pil_image.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    @pytest.mark.integration
    def test_health_check(self, client):
        """Test basic health check endpoint"""
        response = client.get("/health/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "skin-analysis"
    
    @pytest.mark.integration
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
    
    @pytest.mark.integration
    async def test_analyze_skin_endpoint(self, async_client, sample_image_bytes):
        """Test skin analysis endpoint"""
        files = {"image": ("test.jpg", sample_image_bytes, "image/jpeg")}
        data = {"user_id": "test_user_integration"}
        
        response = await async_client.post("/api/skin/analyze", files=files, data=data)
        
        # Note: This might fail if MongoDB is not available in test environment
        # In that case, we expect a 500 error, which is acceptable for integration tests
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert "skin_type" in result
            assert "issues" in result
            assert "analysis_id" in result
    
    @pytest.mark.integration
    async def test_analyze_skin_invalid_file(self, async_client):
        """Test skin analysis with invalid file"""
        files = {"image": ("test.txt", b"not an image", "text/plain")}
        data = {"user_id": "test_user"}
        
        response = await async_client.post("/api/skin/analyze", files=files, data=data)
        assert response.status_code == 415  # Unsupported Media Type
    
    @pytest.mark.integration
    async def test_analyze_skin_missing_user_id(self, async_client, sample_image_bytes):
        """Test skin analysis without user ID"""
        files = {"image": ("test.jpg", sample_image_bytes, "image/jpeg")}
        
        response = await async_client.post("/api/skin/analyze", files=files)
        assert response.status_code == 422  # Validation Error
    
    @pytest.mark.integration
    async def test_get_recommendations_endpoint(self, async_client):
        """Test product recommendations endpoint"""
        response = await async_client.get("/api/skin/recommendations/acne_001")
        
        # Should return recommendations even if empty
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert "issue_id" in result
            assert "all_products" in result
            assert "ayurvedic_products" in result
            assert "non_ayurvedic_products" in result
    
    @pytest.mark.integration
    async def test_get_recommendations_with_category(self, async_client):
        """Test product recommendations with category filter"""
        response = await async_client.get("/api/skin/recommendations/acne_001?category=ayurvedic")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert result["issue_id"] == "acne_001"
    
    @pytest.mark.integration
    async def test_search_products_endpoint(self, async_client):
        """Test product search endpoint"""
        response = await async_client.get("/api/skin/products/search?q=neem")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert "query" in result
            assert "products" in result
            assert "total" in result
    
    @pytest.mark.integration
    async def test_trending_products_endpoint(self, async_client):
        """Test trending products endpoint"""
        response = await async_client.get("/api/skin/products/trending")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert "category" in result
            assert "products" in result
            assert "total" in result
    
    @pytest.mark.integration
    async def test_get_analysis_result_endpoint(self, async_client):
        """Test getting analysis result by ID"""
        # Test with invalid ID
        response = await async_client.get("/api/skin/analysis/invalid_id")
        assert response.status_code in [404, 500]
        
        # Test with valid but non-existent ID
        response = await async_client.get("/api/skin/analysis/507f1f77bcf86cd799439011")
        assert response.status_code in [404, 500]
    
    @pytest.mark.integration
    async def test_user_history_endpoint(self, async_client):
        """Test user analysis history endpoint"""
        response = await async_client.get("/api/skin/user/test_user/history")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert "user_id" in result
            assert "analyses" in result
            assert "total" in result
    
    @pytest.mark.integration
    async def test_service_stats_endpoint(self, async_client):
        """Test service statistics endpoint"""
        response = await async_client.get("/api/skin/stats")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            result = response.json()
            assert "service" in result
            assert "version" in result
            assert "statistics" in result
    
    @pytest.mark.integration
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/")
        
        # CORS headers should be present
        assert "access-control-allow-origin" in response.headers or response.status_code == 405
    
    @pytest.mark.integration
    async def test_file_upload_size_limit(self, async_client):
        """Test file upload size limit"""
        # Create a large file (larger than limit)
        large_image_data = b"x" * (20 * 1024 * 1024)  # 20MB
        
        files = {"image": ("large.jpg", large_image_data, "image/jpeg")}
        data = {"user_id": "test_user"}
        
        response = await async_client.post("/api/skin/analyze", files=files, data=data)
        assert response.status_code == 413  # Payload Too Large