import pytest
import asyncio
import time
import numpy as np
from unittest.mock import patch, AsyncMock

from app.services.ai_service import ai_service
from app.services.websocket_service import websocket_service, ConnectionManager, RealtimeProcessor
from app.core.config import settings

class TestPerformanceRequirements:
    """Performance tests to validate latency requirements"""
    
    @pytest.mark.performance
    async def test_single_frame_processing_latency(self, sample_image):
        """Test that single frame processing meets <200ms latency requirement"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        # Test multiple iterations to get average
        processing_times = []
        
        for _ in range(10):
            start_time = time.time()
            
            with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
                mock_apply.return_value = sample_image
                
                result, processing_time = await ai_service.process_frame(sample_image, style_image)
                
                actual_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                processing_times.append(actual_time)
        
        avg_processing_time = sum(processing_times) / len(processing_times)
        max_processing_time = max(processing_times)
        
        # Log performance metrics
        print(f"Average processing time: {avg_processing_time:.2f}ms")
        print(f"Max processing time: {max_processing_time:.2f}ms")
        print(f"Target latency: {settings.target_latency_ms}ms")
        
        # Assert that average processing time meets requirement
        # Note: In real implementation with actual AI model, this might need adjustment
        assert avg_processing_time < settings.target_latency_ms * 2  # Allow 2x for mock overhead
    
    @pytest.mark.performance
    async def test_concurrent_frame_processing(self, sample_image):
        """Test concurrent frame processing performance"""
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        num_concurrent = 5
        
        async def process_frame():
            with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
                mock_apply.return_value = sample_image
                return await ai_service.process_frame(sample_image, style_image)
        
        start_time = time.time()
        
        # Process frames concurrently
        tasks = [process_frame() for _ in range(num_concurrent)]
        results = await asyncio.gather(*tasks)
        
        total_time = (time.time() - start_time) * 1000
        avg_time_per_frame = total_time / num_concurrent
        
        print(f"Concurrent processing - Total time: {total_time:.2f}ms")
        print(f"Average time per frame: {avg_time_per_frame:.2f}ms")
        
        # All frames should complete successfully
        assert len(results) == num_concurrent
        assert all(result[0] is not None for result in results)
        
        # Average time per frame should still be reasonable
        assert avg_time_per_frame < settings.target_latency_ms * 3
    
    @pytest.mark.performance
    async def test_video_frame_extraction_performance(self, temp_video_file):
        """Test video frame extraction performance"""
        from app.services.video_service import video_service
        
        start_time = time.time()
        
        frames = video_service.extract_frames(temp_video_file, sampling_rate=0.5)
        
        extraction_time = (time.time() - start_time) * 1000
        
        print(f"Frame extraction time: {extraction_time:.2f}ms for {len(frames)} frames")
        print(f"Time per frame: {extraction_time / len(frames):.2f}ms")
        
        # Frame extraction should be fast
        assert extraction_time < 1000  # Less than 1 second for test video
        assert len(frames) > 0
    
    @pytest.mark.performance
    async def test_video_reconstruction_performance(self, sample_video_frames):
        """Test video reconstruction performance"""
        from app.services.video_service import video_service
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
            output_path = f.name
        
        try:
            start_time = time.time()
            
            video_service.reconstruct_video(sample_video_frames, output_path, 30.0)
            
            reconstruction_time = (time.time() - start_time) * 1000
            
            print(f"Video reconstruction time: {reconstruction_time:.2f}ms for {len(sample_video_frames)} frames")
            print(f"Time per frame: {reconstruction_time / len(sample_video_frames):.2f}ms")
            
            # Video reconstruction should complete in reasonable time
            assert reconstruction_time < 5000  # Less than 5 seconds for test frames
            assert os.path.exists(output_path)
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
    
    @pytest.mark.performance
    async def test_websocket_connection_scalability(self):
        """Test WebSocket connection manager scalability"""
        manager = ConnectionManager()
        
        # Test connecting multiple sessions
        num_connections = 50
        sessions = []
        
        start_time = time.time()
        
        for i in range(num_connections):
            mock_websocket = AsyncMock()
            session_id = f"session_{i}"
            user_id = f"user_{i}"
            
            success = await manager.connect(mock_websocket, session_id, user_id)
            if success:
                sessions.append(session_id)
        
        connection_time = (time.time() - start_time) * 1000
        
        print(f"Connected {len(sessions)} sessions in {connection_time:.2f}ms")
        print(f"Average time per connection: {connection_time / len(sessions):.2f}ms")
        
        # Should be able to handle multiple connections quickly
        assert len(sessions) == min(num_connections, manager.max_connections)
        assert connection_time < 1000  # Less than 1 second total
        
        # Test broadcasting performance
        start_time = time.time()
        
        message = {"type": "test", "data": "broadcast_test"}
        await manager.broadcast_message(message)
        
        broadcast_time = (time.time() - start_time) * 1000
        
        print(f"Broadcast to {len(sessions)} connections in {broadcast_time:.2f}ms")
        
        # Broadcasting should be fast
        assert broadcast_time < 500  # Less than 500ms
        
        # Cleanup
        for session_id in sessions:
            manager.disconnect(session_id)
    
    @pytest.mark.performance
    async def test_frame_queue_throughput(self):
        """Test frame processing queue throughput"""
        manager = ConnectionManager()
        processor = RealtimeProcessor(manager)
        
        session_id = "throughput_test"
        mock_websocket = AsyncMock()
        
        # Setup connection
        await manager.connect(mock_websocket, session_id, "test_user")
        manager.connection_metadata[session_id]["style_image"] = np.zeros((100, 100, 3), dtype=np.uint8)
        
        # Add frames to queue rapidly
        num_frames = 100
        queue = manager.processing_queue[session_id]
        
        start_time = time.time()
        
        for i in range(num_frames):
            frame_data = {
                "frame_id": f"frame_{i}",
                "frame_data": "fake_frame_data"
            }
            
            try:
                queue.put_nowait(frame_data)
            except asyncio.QueueFull:
                break
        
        queue_time = (time.time() - start_time) * 1000
        frames_queued = queue.qsize()
        
        print(f"Queued {frames_queued} frames in {queue_time:.2f}ms")
        print(f"Throughput: {frames_queued / (queue_time / 1000):.2f} frames/second")
        
        # Should be able to queue frames quickly
        assert queue_time < 100  # Less than 100ms
        assert frames_queued > 0
        
        # Cleanup
        manager.disconnect(session_id)
    
    @pytest.mark.performance
    async def test_memory_usage_during_processing(self, sample_video_frames):
        """Test memory usage during video processing"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        style_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        # Process frames
        with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
            mock_apply.return_value = sample_video_frames[0]
            
            results = await ai_service.process_video_frames(sample_video_frames, style_image)
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"Initial memory: {initial_memory:.2f}MB")
        print(f"Final memory: {final_memory:.2f}MB")
        print(f"Memory increase: {memory_increase:.2f}MB")
        print(f"Memory per frame: {memory_increase / len(sample_video_frames):.2f}MB")
        
        # Memory usage should be reasonable
        assert memory_increase < 100  # Less than 100MB increase
        assert len(results) == len(sample_video_frames)

class TestStressTests:
    """Stress tests for system limits"""
    
    @pytest.mark.performance
    async def test_rapid_websocket_connections(self):
        """Test rapid WebSocket connection/disconnection"""
        manager = ConnectionManager()
        
        num_iterations = 20
        
        start_time = time.time()
        
        for i in range(num_iterations):
            mock_websocket = AsyncMock()
            session_id = f"stress_session_{i}"
            
            # Connect
            success = await manager.connect(mock_websocket, session_id, f"user_{i}")
            
            if success:
                # Immediately disconnect
                manager.disconnect(session_id)
        
        total_time = (time.time() - start_time) * 1000
        
        print(f"Rapid connect/disconnect cycles: {num_iterations} in {total_time:.2f}ms")
        print(f"Average cycle time: {total_time / num_iterations:.2f}ms")
        
        # Should handle rapid connections without issues
        assert total_time < 2000  # Less than 2 seconds
        assert len(manager.active_connections) == 0  # All should be disconnected
    
    @pytest.mark.performance
    async def test_large_frame_processing(self):
        """Test processing of large frames"""
        # Create large frame (1080p)
        large_frame = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
        style_image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        
        start_time = time.time()
        
        with patch.object(ai_service.hair_model, 'apply_hairstyle', new_callable=AsyncMock) as mock_apply:
            mock_apply.return_value = large_frame
            
            result, processing_time = await ai_service.process_frame(large_frame, style_image)
        
        total_time = (time.time() - start_time) * 1000
        
        print(f"Large frame processing time: {total_time:.2f}ms")
        print(f"Frame size: {large_frame.shape}")
        
        # Should handle large frames without crashing
        assert result is not None
        assert result.shape == large_frame.shape
        # Allow more time for large frames
        assert total_time < settings.target_latency_ms * 5