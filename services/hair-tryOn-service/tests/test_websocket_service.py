import pytest
import asyncio
import json
import base64
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.websocket_service import (
    ConnectionManager, 
    RealtimeProcessor, 
    WebSocketService,
    websocket_service
)
from app.models.hair_tryOn import FrameProcessingResult

class TestConnectionManager:
    """Unit tests for ConnectionManager"""
    
    @pytest.mark.unit
    async def test_connect_success(self, mock_websocket):
        """Test successful WebSocket connection"""
        manager = ConnectionManager()
        session_id = "test_session"
        user_id = "test_user"
        
        result = await manager.connect(mock_websocket, session_id, user_id)
        
        assert result is True
        assert session_id in manager.active_connections
        assert session_id in manager.connection_metadata
        assert session_id in manager.processing_queue
        mock_websocket.accept.assert_called_once()
    
    @pytest.mark.unit
    async def test_connect_max_connections_exceeded(self, mock_websocket):
        """Test connection rejection when max connections exceeded"""
        manager = ConnectionManager()
        manager.max_connections = 1
        
        # First connection should succeed
        result1 = await manager.connect(mock_websocket, "session1", "user1")
        assert result1 is True
        
        # Second connection should fail
        mock_websocket2 = AsyncMock()
        result2 = await manager.connect(mock_websocket2, "session2", "user2")
        assert result2 is False
        mock_websocket2.close.assert_called_once()
    
    @pytest.mark.unit
    def test_disconnect(self, mock_websocket):
        """Test WebSocket disconnection"""
        manager = ConnectionManager()
        session_id = "test_session"
        
        # Manually add connection
        manager.active_connections[session_id] = mock_websocket
        manager.connection_metadata[session_id] = {}
        manager.processing_queue[session_id] = asyncio.Queue()
        
        manager.disconnect(session_id)
        
        assert session_id not in manager.active_connections
        assert session_id not in manager.connection_metadata
        assert session_id not in manager.processing_queue
    
    @pytest.mark.unit
    async def test_send_message_success(self, mock_websocket):
        """Test successful message sending"""
        manager = ConnectionManager()
        session_id = "test_session"
        
        manager.active_connections[session_id] = mock_websocket
        manager.connection_metadata[session_id] = {"last_activity": 0}
        
        message = {"type": "test", "data": "test_data"}
        await manager.send_message(session_id, message)
        
        mock_websocket.send_text.assert_called_once_with(json.dumps(message))
    
    @pytest.mark.unit
    async def test_send_message_connection_error(self, mock_websocket):
        """Test message sending with connection error"""
        manager = ConnectionManager()
        session_id = "test_session"
        
        manager.active_connections[session_id] = mock_websocket
        manager.connection_metadata[session_id] = {"last_activity": 0}
        
        # Mock websocket to raise exception
        mock_websocket.send_text.side_effect = Exception("Connection lost")
        
        message = {"type": "test", "data": "test_data"}
        await manager.send_message(session_id, message)
        
        # Connection should be removed after error
        assert session_id not in manager.active_connections
    
    @pytest.mark.unit
    async def test_broadcast_message(self):
        """Test message broadcasting"""
        manager = ConnectionManager()
        
        # Add multiple connections
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        manager.active_connections["session1"] = mock_ws1
        manager.active_connections["session2"] = mock_ws2
        
        message = {"type": "broadcast", "data": "test"}
        await manager.broadcast_message(message)
        
        mock_ws1.send_text.assert_called_once_with(json.dumps(message))
        mock_ws2.send_text.assert_called_once_with(json.dumps(message))
    
    @pytest.mark.unit
    def test_get_connection_stats(self):
        """Test getting connection statistics"""
        manager = ConnectionManager()
        
        # Add some mock metadata
        manager.connection_metadata["session1"] = {
            "frames_processed": 10,
            "total_processing_time": 500.0
        }
        manager.connection_metadata["session2"] = {
            "frames_processed": 5,
            "total_processing_time": 250.0
        }
        
        stats = manager.get_connection_stats()
        
        assert stats["active_connections"] == 2
        assert stats["total_frames_processed"] == 15
        assert stats["average_processing_time_ms"] == 50.0

class TestRealtimeProcessor:
    """Unit tests for RealtimeProcessor"""
    
    @pytest.mark.unit
    async def test_process_single_frame_success(self, sample_image):
        """Test successful single frame processing"""
        manager = ConnectionManager()
        processor = RealtimeProcessor(manager)
        
        session_id = "test_session"
        manager.connection_metadata[session_id] = {
            "style_image": sample_image,
            "color_image": None
        }
        
        # Create frame data
        _, encoded = cv2.imencode('.jpg', sample_image)
        frame_data = {
            "frame_id": "test_frame",
            "frame_data": base64.b64encode(encoded.tobytes()).decode()
        }
        
        with patch('app.services.websocket_service.ai_service') as mock_ai:
            mock_ai.process_frame = AsyncMock(return_value=(sample_image, 50.0))
            
            result = await processor._process_single_frame(session_id, frame_data)
            
            assert result is not None
            assert isinstance(result, FrameProcessingResult)
            assert result.frame_id == "test_frame"
            assert result.processing_time > 0
    
    @pytest.mark.unit
    async def test_process_single_frame_no_style_image(self, sample_image):
        """Test frame processing without style image"""
        manager = ConnectionManager()
        processor = RealtimeProcessor(manager)
        
        session_id = "test_session"
        manager.connection_metadata[session_id] = {
            "style_image": None,
            "color_image": None
        }
        
        frame_data = {"frame_id": "test_frame", "frame_data": "fake_data"}
        
        result = await processor._process_single_frame(session_id, frame_data)
        
        assert result is None
    
    @pytest.mark.unit
    async def test_process_single_frame_decode_error(self):
        """Test frame processing with decode error"""
        manager = ConnectionManager()
        processor = RealtimeProcessor(manager)
        
        session_id = "test_session"
        manager.connection_metadata[session_id] = {
            "style_image": np.zeros((100, 100, 3), dtype=np.uint8),
            "color_image": None
        }
        
        frame_data = {"frame_id": "test_frame", "frame_data": "invalid_base64"}
        
        result = await processor._process_single_frame(session_id, frame_data)
        
        assert result is None
    
    @pytest.mark.unit
    def test_calculate_quality_score(self, sample_image):
        """Test quality score calculation"""
        manager = ConnectionManager()
        processor = RealtimeProcessor(manager)
        
        score = processor._calculate_quality_score(sample_image)
        
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

class TestWebSocketService:
    """Unit tests for WebSocketService"""
    
    @pytest.mark.unit
    async def test_start_service(self):
        """Test WebSocket service startup"""
        service = WebSocketService()
        
        await service.start_service()
        
        assert service.cleanup_task is not None
        assert not service.cleanup_task.done()
        
        # Cleanup
        await service.stop_service()
    
    @pytest.mark.unit
    async def test_stop_service(self):
        """Test WebSocket service shutdown"""
        service = WebSocketService()
        
        # Start service first
        await service.start_service()
        
        # Add a mock connection
        service.connection_manager.active_connections["test"] = AsyncMock()
        
        await service.stop_service()
        
        assert service.cleanup_task.cancelled()
        assert len(service.connection_manager.active_connections) == 0
    
    @pytest.mark.unit
    async def test_process_message_set_style_image(self, sample_image):
        """Test processing set style image message"""
        service = WebSocketService()
        session_id = "test_session"
        
        service.connection_manager.connection_metadata[session_id] = {}
        
        # Create image data
        _, encoded = cv2.imencode('.jpg', sample_image)
        image_data = base64.b64encode(encoded.tobytes()).decode()
        
        message = {
            "type": "set_style_image",
            "data": {"image_data": image_data}
        }
        
        with patch.object(service.connection_manager, 'send_message', new_callable=AsyncMock) as mock_send:
            await service._process_message(session_id, message)
            
            mock_send.assert_called_once()
            # Check that style image was set
            assert "style_image" in service.connection_manager.connection_metadata[session_id]
    
    @pytest.mark.unit
    async def test_process_message_ping(self):
        """Test processing ping message"""
        service = WebSocketService()
        session_id = "test_session"
        
        message = {"type": "ping"}
        
        with patch.object(service.connection_manager, 'send_message', new_callable=AsyncMock) as mock_send:
            await service._process_message(session_id, message)
            
            mock_send.assert_called_once_with(session_id, {"type": "pong"})
    
    @pytest.mark.unit
    async def test_process_message_unknown_type(self):
        """Test processing unknown message type"""
        service = WebSocketService()
        session_id = "test_session"
        
        message = {"type": "unknown_type"}
        
        with patch.object(service.connection_manager, 'send_message', new_callable=AsyncMock) as mock_send:
            await service._process_message(session_id, message)
            
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0]
            assert call_args[0] == session_id
            assert "error" in call_args[1]["type"]
    
    @pytest.mark.unit
    async def test_handle_process_frame(self):
        """Test handling process frame message"""
        service = WebSocketService()
        session_id = "test_session"
        
        # Setup queue
        service.connection_manager.processing_queue[session_id] = asyncio.Queue(maxsize=10)
        
        frame_data = {"frame_id": "test", "frame_data": "test_data"}
        
        await service._handle_process_frame(session_id, frame_data)
        
        # Check that frame was added to queue
        queue = service.connection_manager.processing_queue[session_id]
        assert not queue.empty()
    
    @pytest.mark.unit
    async def test_handle_process_frame_queue_full(self):
        """Test handling process frame when queue is full"""
        service = WebSocketService()
        session_id = "test_session"
        
        # Setup full queue
        queue = asyncio.Queue(maxsize=1)
        queue.put_nowait("existing_frame")
        service.connection_manager.processing_queue[session_id] = queue
        
        frame_data = {"frame_id": "test", "frame_data": "test_data"}
        
        await service._handle_process_frame(session_id, frame_data)
        
        # Queue should still have one item (the new one)
        assert queue.qsize() == 1

@pytest.mark.websocket
class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality"""
    
    @pytest.mark.integration
    async def test_full_websocket_workflow(self, mock_websocket, sample_image):
        """Test complete WebSocket workflow"""
        session_id = "integration_test"
        user_id = "test_user"
        
        # Mock the websocket to return messages
        messages = [
            json.dumps({"type": "ping"}),
            json.dumps({
                "type": "set_style_image",
                "data": {
                    "image_data": base64.b64encode(cv2.imencode('.jpg', sample_image)[1].tobytes()).decode()
                }
            })
        ]
        
        mock_websocket.receive_text.side_effect = messages + [asyncio.CancelledError()]
        
        with patch('app.services.websocket_service.ai_service'):
            try:
                await websocket_service.handle_connection(mock_websocket, session_id, user_id)
            except asyncio.CancelledError:
                pass  # Expected when we cancel the connection
        
        # Verify connection was established and cleaned up
        assert session_id not in websocket_service.connection_manager.active_connections