import asyncio
import json
import time
import uuid
from typing import Dict, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
from app.services.ai_service import ai_service
from app.models.hair_tryOn import WebSocketMessage, FrameProcessingResult
from app.core.config import settings
import logging
import numpy as np
import cv2
import base64

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time hair try-on"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, dict] = {}
        self.processing_queue: Dict[str, asyncio.Queue] = {}
        self.max_connections = settings.websocket_max_connections
        
    async def connect(self, websocket: WebSocket, session_id: str, user_id: str) -> bool:
        """Accept a new WebSocket connection"""
        if len(self.active_connections) >= self.max_connections:
            await websocket.close(code=1013, reason="Server overloaded")
            return False
        
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.connection_metadata[session_id] = {
            "user_id": user_id,
            "connected_at": time.time(),
            "frames_processed": 0,
            "total_processing_time": 0.0,
            "style_image": None,
            "color_image": None,
            "last_activity": time.time()
        }
        self.processing_queue[session_id] = asyncio.Queue(maxsize=10)
        
        logger.info(f"WebSocket connection established for session {session_id}")
        return True
    
    def disconnect(self, session_id: str):
        """Remove a WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.connection_metadata:
            del self.connection_metadata[session_id]
        if session_id in self.processing_queue:
            del self.processing_queue[session_id]
        
        logger.info(f"WebSocket connection closed for session {session_id}")
    
    async def send_message(self, session_id: str, message: dict):
        """Send message to a specific connection"""
        if session_id in self.active_connections:
            try:
                websocket = self.active_connections[session_id]
                await websocket.send_text(json.dumps(message))
                self.connection_metadata[session_id]["last_activity"] = time.time()
            except Exception as e:
                logger.error(f"Failed to send message to {session_id}: {e}")
                self.disconnect(session_id)
    
    async def broadcast_message(self, message: dict, exclude_session: Optional[str] = None):
        """Broadcast message to all connections"""
        disconnected_sessions = []
        
        for session_id, websocket in self.active_connections.items():
            if session_id == exclude_session:
                continue
                
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast to {session_id}: {e}")
                disconnected_sessions.append(session_id)
        
        # Clean up disconnected sessions
        for session_id in disconnected_sessions:
            self.disconnect(session_id)
    
    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        total_frames = sum(
            metadata["frames_processed"] 
            for metadata in self.connection_metadata.values()
        )
        
        avg_processing_time = 0
        if total_frames > 0:
            total_time = sum(
                metadata["total_processing_time"] 
                for metadata in self.connection_metadata.values()
            )
            avg_processing_time = total_time / total_frames
        
        return {
            "active_connections": len(self.active_connections),
            "total_frames_processed": total_frames,
            "average_processing_time_ms": avg_processing_time,
            "max_connections": self.max_connections
        }

class RealtimeProcessor:
    """Handles real-time frame processing"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.target_latency = settings.target_latency_ms / 1000.0  # Convert to seconds
        self.frame_drop_threshold = 0.3  # Drop frames if processing takes > 30% of target
        
    async def process_frame_stream(self, session_id: str):
        """Process frames from the queue for a session"""
        metadata = self.connection_manager.connection_metadata.get(session_id)
        if not metadata:
            return
        
        queue = self.connection_manager.processing_queue.get(session_id)
        if not queue:
            return
        
        while session_id in self.connection_manager.active_connections:
            try:
                # Wait for frame with timeout
                frame_data = await asyncio.wait_for(queue.get(), timeout=1.0)
                
                if frame_data is None:  # Shutdown signal
                    break
                
                # Process the frame
                result = await self._process_single_frame(session_id, frame_data)
                
                if result:
                    # Send result back to client
                    await self.connection_manager.send_message(session_id, {
                        "type": "frame_result",
                        "data": {
                            "frame_id": result.frame_id,
                            "frame_data": base64.b64encode(result.processed_frame_data).decode(),
                            "processing_time": result.processing_time,
                            "quality_score": result.quality_score
                        }
                    })
                
                # Update metadata
                metadata["frames_processed"] += 1
                metadata["total_processing_time"] += result.processing_time if result else 0
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Frame processing error for session {session_id}: {e}")
                await self.connection_manager.send_message(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Frame processing failed",
                        "retry_possible": True
                    }
                })
    
    async def _process_single_frame(self, session_id: str, frame_data: dict) -> Optional[FrameProcessingResult]:
        """Process a single frame"""
        start_time = time.time()
        
        try:
            metadata = self.connection_manager.connection_metadata[session_id]
            
            # Decode frame
            frame_bytes = base64.b64decode(frame_data["frame_data"])
            frame_array = np.frombuffer(frame_bytes, dtype=np.uint8)
            frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.error("Failed to decode frame")
                return None
            
            # Get style and color images
            style_image = metadata.get("style_image")
            color_image = metadata.get("color_image")
            
            if style_image is None:
                logger.warning("No style image set for session")
                return None
            
            # Process frame with AI
            processed_frame, ai_processing_time = await ai_service.process_frame(
                frame, style_image, color_image
            )
            
            # Encode result
            _, encoded_frame = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Check if we're meeting latency requirements
            if processing_time > self.target_latency * 1000:
                logger.warning(f"Processing time {processing_time:.2f}ms exceeds target {self.target_latency * 1000}ms")
            
            return FrameProcessingResult(
                frame_id=frame_data.get("frame_id", str(uuid.uuid4())),
                processed_frame_data=encoded_frame.tobytes(),
                processing_time=processing_time,
                quality_score=self._calculate_quality_score(processed_frame)
            )
            
        except Exception as e:
            logger.error(f"Frame processing failed: {e}")
            return None
    
    def _calculate_quality_score(self, frame: np.ndarray) -> float:
        """Calculate quality score for the processed frame"""
        # Simple quality metric based on image sharpness
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize to 0-1 range (higher is better)
        quality_score = min(laplacian_var / 1000.0, 1.0)
        return quality_score

class WebSocketService:
    """Main WebSocket service for real-time hair try-on"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.processor = RealtimeProcessor(self.connection_manager)
        self.cleanup_task = None
        
    async def start_service(self):
        """Start the WebSocket service"""
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_inactive_connections())
        logger.info("WebSocket service started")
    
    async def stop_service(self):
        """Stop the WebSocket service"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
        
        # Close all connections
        for session_id in list(self.connection_manager.active_connections.keys()):
            self.connection_manager.disconnect(session_id)
        
        logger.info("WebSocket service stopped")
    
    async def handle_connection(self, websocket: WebSocket, session_id: str, user_id: str):
        """Handle a new WebSocket connection"""
        connected = await self.connection_manager.connect(websocket, session_id, user_id)
        
        if not connected:
            return
        
        # Start frame processing task
        processing_task = asyncio.create_task(
            self.processor.process_frame_stream(session_id)
        )
        
        try:
            await self._handle_messages(websocket, session_id)
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for session {session_id}")
        except Exception as e:
            logger.error(f"WebSocket error for session {session_id}: {e}")
        finally:
            processing_task.cancel()
            self.connection_manager.disconnect(session_id)
    
    async def _handle_messages(self, websocket: WebSocket, session_id: str):
        """Handle incoming WebSocket messages"""
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                await self._process_message(session_id, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await self.connection_manager.send_message(session_id, {
                    "type": "error",
                    "data": {"message": "Invalid JSON format"}
                })
            except Exception as e:
                logger.error(f"Message handling error: {e}")
                await self.connection_manager.send_message(session_id, {
                    "type": "error",
                    "data": {"message": "Message processing failed"}
                })
    
    async def _process_message(self, session_id: str, message: dict):
        """Process incoming message"""
        message_type = message.get("type")
        data = message.get("data", {})
        
        if message_type == "set_style_image":
            await self._handle_set_style_image(session_id, data)
        elif message_type == "set_color_image":
            await self._handle_set_color_image(session_id, data)
        elif message_type == "process_frame":
            await self._handle_process_frame(session_id, data)
        elif message_type == "ping":
            await self.connection_manager.send_message(session_id, {"type": "pong"})
        else:
            await self.connection_manager.send_message(session_id, {
                "type": "error",
                "data": {"message": f"Unknown message type: {message_type}"}
            })
    
    async def _handle_set_style_image(self, session_id: str, data: dict):
        """Handle style image setting"""
        try:
            image_data = base64.b64decode(data["image_data"])
            image_array = np.frombuffer(image_data, dtype=np.uint8)
            style_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if style_image is not None:
                self.connection_manager.connection_metadata[session_id]["style_image"] = style_image
                await self.connection_manager.send_message(session_id, {
                    "type": "style_image_set",
                    "data": {"success": True}
                })
            else:
                raise ValueError("Failed to decode style image")
                
        except Exception as e:
            await self.connection_manager.send_message(session_id, {
                "type": "error",
                "data": {"message": f"Failed to set style image: {str(e)}"}
            })
    
    async def _handle_set_color_image(self, session_id: str, data: dict):
        """Handle color image setting"""
        try:
            image_data = base64.b64decode(data["image_data"])
            image_array = np.frombuffer(image_data, dtype=np.uint8)
            color_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if color_image is not None:
                self.connection_manager.connection_metadata[session_id]["color_image"] = color_image
                await self.connection_manager.send_message(session_id, {
                    "type": "color_image_set",
                    "data": {"success": True}
                })
            else:
                # Color image is optional, so this is not an error
                self.connection_manager.connection_metadata[session_id]["color_image"] = None
                await self.connection_manager.send_message(session_id, {
                    "type": "color_image_set",
                    "data": {"success": True, "message": "Color image cleared"}
                })
                
        except Exception as e:
            await self.connection_manager.send_message(session_id, {
                "type": "error",
                "data": {"message": f"Failed to set color image: {str(e)}"}
            })
    
    async def _handle_process_frame(self, session_id: str, data: dict):
        """Handle frame processing request"""
        try:
            queue = self.connection_manager.processing_queue.get(session_id)
            if queue:
                # Add frame to processing queue (non-blocking)
                try:
                    queue.put_nowait(data)
                except asyncio.QueueFull:
                    # Drop oldest frame if queue is full
                    try:
                        queue.get_nowait()
                        queue.put_nowait(data)
                    except asyncio.QueueEmpty:
                        pass
        except Exception as e:
            logger.error(f"Failed to queue frame for processing: {e}")
    
    async def _cleanup_inactive_connections(self):
        """Cleanup inactive connections periodically"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = time.time()
                inactive_sessions = []
                
                for session_id, metadata in self.connection_manager.connection_metadata.items():
                    if current_time - metadata["last_activity"] > settings.websocket_timeout:
                        inactive_sessions.append(session_id)
                
                for session_id in inactive_sessions:
                    logger.info(f"Cleaning up inactive session: {session_id}")
                    self.connection_manager.disconnect(session_id)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")

# Global WebSocket service instance
websocket_service = WebSocketService()