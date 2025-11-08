import pytest
import asyncio
import tempfile
import os
import numpy as np
import cv2
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.core.database import mongodb
from app.services.database_service import database_service
from app.services.ai_service import ai_service
from app.services.websocket_service import websocket_service

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)

@pytest.fixture
async def mock_database():
    """Mock database for testing."""
    # Create a mock database
    mock_db = MagicMock()
    
    # Mock collections
    mock_db.hair_tryOn_history = AsyncMock()
    mock_db.processing_queue = AsyncMock()
    
    # Mock database operations
    mock_db.hair_tryOn_history.insert_one = AsyncMock(return_value=MagicMock(inserted_id="test_id"))
    mock_db.hair_tryOn_history.find_one = AsyncMock(return_value=None)
    mock_db.hair_tryOn_history.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    mock_db.hair_tryOn_history.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    mock_db.hair_tryOn_history.count_documents = AsyncMock(return_value=0)
    mock_db.hair_tryOn_history.find = MagicMock(return_value=AsyncMock())
    mock_db.hair_tryOn_history.aggregate = MagicMock(return_value=AsyncMock())
    
    # Replace the real database with mock
    original_db = mongodb.database
    mongodb.database = mock_db
    
    yield mock_db
    
    # Restore original database
    mongodb.database = original_db

@pytest.fixture
def sample_image():
    """Create a sample image for testing."""
    # Create a simple test image (100x100 RGB)
    image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    return image

@pytest.fixture
def sample_video_frames():
    """Create sample video frames for testing."""
    frames = []
    for i in range(5):  # 5 frames
        frame = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        frames.append(frame)
    return frames

@pytest.fixture
def temp_video_file():
    """Create a temporary video file for testing."""
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
        # Create a simple video file using OpenCV
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(f.name, fourcc, 30.0, (100, 100))
        
        # Write 30 frames (1 second at 30fps)
        for i in range(30):
            frame = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
            out.write(frame)
        
        out.release()
        
        yield f.name
        
        # Cleanup
        if os.path.exists(f.name):
            os.unlink(f.name)

@pytest.fixture
def temp_image_file():
    """Create a temporary image file for testing."""
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
        # Create a simple image
        image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        cv2.imwrite(f.name, image)
        
        yield f.name
        
        # Cleanup
        if os.path.exists(f.name):
            os.unlink(f.name)

@pytest.fixture
async def mock_ai_service():
    """Mock AI service for testing."""
    original_process_frame = ai_service.process_frame
    original_process_video_frames = ai_service.process_video_frames
    
    # Mock the methods
    ai_service.process_frame = AsyncMock(return_value=(np.zeros((100, 100, 3), dtype=np.uint8), 50.0))
    ai_service.process_video_frames = AsyncMock(return_value=[np.zeros((100, 100, 3), dtype=np.uint8)] * 5)
    
    yield ai_service
    
    # Restore original methods
    ai_service.process_frame = original_process_frame
    ai_service.process_video_frames = original_process_video_frames

@pytest.fixture
def mock_websocket():
    """Mock WebSocket for testing."""
    websocket = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.send_text = AsyncMock()
    websocket.send_bytes = AsyncMock()
    websocket.receive_text = AsyncMock()
    websocket.receive_bytes = AsyncMock()
    websocket.close = AsyncMock()
    
    return websocket

@pytest.fixture
def sample_hair_tryOn_result():
    """Sample hair try-on result for testing."""
    from app.models.hair_tryOn import HairTryOnResult, ProcessingType, ProcessingStatus
    from datetime import datetime
    
    return HairTryOnResult(
        id="test_result_id",
        user_id="test_user_id",
        type=ProcessingType.VIDEO,
        status=ProcessingStatus.COMPLETED,
        original_media_url="/uploads/test_video.mp4",
        style_image_url="/uploads/test_style.jpg",
        color_image_url=None,
        result_media_url="/uploads/test_result.mp4",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

@pytest.fixture(autouse=True)
async def setup_test_environment():
    """Set up test environment before each test."""
    # Initialize services if needed
    if not database_service.db:
        await database_service.initialize()
    
    yield
    
    # Cleanup after each test
    # Any cleanup code can go here