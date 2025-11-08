import pytest
import asyncio
import os
import tempfile
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image
import numpy as np
import cv2

from app.core.config import settings
from app.core.database import Database


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_db():
    """Create a test database connection"""
    # Use a test database
    test_db_name = "test_growup_skin_analysis"
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    database = client[test_db_name]
    
    yield database
    
    # Cleanup: drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest.fixture
async def db_with_data(test_db):
    """Database with sample test data"""
    # Insert sample analysis data
    sample_analysis = {
        "userId": "test_user_123",
        "imageUrl": "/test/image.jpg",
        "skinType": "combination",
        "issues": [
            {
                "id": "acne_test_001",
                "name": "Acne",
                "description": "Test acne detection",
                "severity": "medium",
                "causes": ["Test cause"],
                "confidence": 0.85
            }
        ],
        "analysisMetadata": {
            "modelVersion": "test-v1.0",
            "processingTime": 2.5,
            "imageQuality": 0.8
        },
        "createdAt": "2024-01-01T00:00:00Z"
    }
    
    await test_db.skin_analysis.insert_one(sample_analysis)
    
    # Insert sample product data
    sample_products = [
        {
            "id": "test_prod_001",
            "name": "Test Neem Face Wash",
            "brand": "Test Brand",
            "price": 150.0,
            "rating": 4.2,
            "image_url": "https://test.com/image.jpg",
            "is_ayurvedic": True,
            "ingredients": ["Neem", "Turmeric"],
            "issue_types": ["acne"],
            "category": "cleanser"
        },
        {
            "id": "test_prod_002",
            "name": "Test Moisturizer",
            "brand": "Test Brand 2",
            "price": 300.0,
            "rating": 4.5,
            "image_url": "https://test.com/moisturizer.jpg",
            "is_ayurvedic": False,
            "ingredients": ["Hyaluronic Acid"],
            "issue_types": ["dryness"],
            "category": "moisturizer"
        }
    ]
    
    await test_db.products.insert_many(sample_products)
    
    yield test_db


@pytest.fixture
def sample_image():
    """Create a sample test image"""
    # Create a simple test image
    image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
    
    # Add some patterns to make it more realistic
    # Add some "acne spots" (dark circles)
    cv2.circle(image, (100, 100), 10, (50, 50, 50), -1)
    cv2.circle(image, (200, 150), 8, (60, 60, 60), -1)
    
    # Add some texture
    noise = np.random.normal(0, 10, image.shape).astype(np.uint8)
    image = cv2.add(image, noise)
    
    return image


@pytest.fixture
def temp_image_file(sample_image):
    """Create a temporary image file"""
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
        # Convert numpy array to PIL Image and save
        pil_image = Image.fromarray(sample_image)
        pil_image.save(tmp_file.name, 'JPEG')
        
        yield tmp_file.name
        
        # Cleanup
        if os.path.exists(tmp_file.name):
            os.unlink(tmp_file.name)


@pytest.fixture
def mock_upload_file(temp_image_file):
    """Mock UploadFile for testing"""
    class MockUploadFile:
        def __init__(self, filename, content_type="image/jpeg"):
            self.filename = filename
            self.content_type = content_type
            self.size = os.path.getsize(filename)
            self._file = None
        
        async def read(self):
            with open(self.filename, 'rb') as f:
                return f.read()
        
        async def seek(self, position):
            pass
        
        @property
        def file(self):
            if self._file is None:
                self._file = open(self.filename, 'rb')
            return self._file
    
    return MockUploadFile(temp_image_file)


@pytest.fixture
def override_settings():
    """Override settings for testing"""
    original_upload_dir = settings.UPLOAD_DIR
    original_max_file_size = settings.MAX_FILE_SIZE
    
    # Create temporary upload directory
    with tempfile.TemporaryDirectory() as temp_dir:
        settings.UPLOAD_DIR = temp_dir
        settings.MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB for testing
        
        yield
        
        # Restore original settings
        settings.UPLOAD_DIR = original_upload_dir
        settings.MAX_FILE_SIZE = original_max_file_size