#!/usr/bin/env python3
"""
GlowUp Hair Service - Real-time video processing service
Provides hair analysis and processing capabilities via gRPC streaming
"""

import asyncio
import grpc
import logging
import signal
import sys
import time
from concurrent import futures
from typing import Optional

import video_processing_pb2
import video_processing_pb2_grpc
from hair_processor import HairProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VideoProcessingService(video_processing_pb2_grpc.VideoProcessingServiceServicer):
    """gRPC service implementation for video processing"""
    
    def __init__(self):
        self.hair_processor = HairProcessor()
        self.active_sessions = {}
        logger.info("VideoProcessingService initialized")

    async def ProcessVideoStream(self, request_iterator, context):
        """
        Bidirectional streaming RPC for real-time video processing
        """
        session_id = None
        frame_count = 0
        start_time = time.time()
        
        try:
            async for frame_request in request_iterator:
                if not session_id:
                    session_id = frame_request.session_id
                    self.active_sessions[session_id] = {
                        'start_time': start_time,
                        'frame_count': 0
                    }
                    logger.info(f"New video stream session started: {session_id}")
                
                frame_count += 1
                self.active_sessions[session_id]['frame_count'] = frame_count
                
                # Process the frame
                processed_frame = await self._process_frame(frame_request)
                
                # Yield the processed frame
                yield processed_frame
                
                # Log performance stats every 30 frames
                if frame_count % 30 == 0:
                    elapsed = time.time() - start_time
                    fps = frame_count / elapsed if elapsed > 0 else 0
                    logger.info(f"Session {session_id}: {frame_count} frames, {fps:.2f} FPS")
                    
        except grpc.RpcError as e:
            logger.error(f"gRPC error in session {session_id}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in session {session_id}: {e}")
        finally:
            if session_id and session_id in self.active_sessions:
                elapsed = time.time() - self.active_sessions[session_id]['start_time']
                total_frames = self.active_sessions[session_id]['frame_count']
                avg_fps = total_frames / elapsed if elapsed > 0 else 0
                logger.info(f"Session {session_id} ended: {total_frames} frames in {elapsed:.2f}s (avg {avg_fps:.2f} FPS)")
                del self.active_sessions[session_id]

    async def _process_frame(self, frame_request):
        """Process a single video frame"""
        try:
            # Process the frame using hair processor
            processed_data = await self.hair_processor.process_frame(
                frame_data=frame_request.frame_data,
                format=frame_request.format,
                metadata=frame_request.metadata
            )
            
            # Create response frame
            response_frame = video_processing_pb2.VideoFrame(
                session_id=frame_request.session_id,
                frame_data=processed_data['frame_data'],
                format=processed_data['format'],
                timestamp=int(time.time() * 1000),  # Current timestamp
                width=processed_data.get('width', frame_request.width),
                height=processed_data.get('height', frame_request.height),
                metadata=video_processing_pb2.FrameMetadata(
                    camera_facing=frame_request.metadata.camera_facing,
                    quality=frame_request.metadata.quality,
                    extra=processed_data.get('extra_metadata', {})
                )
            )
            
            return response_frame
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            # Return original frame on error
            return frame_request

    def HealthCheck(self, request, context):
        """Health check implementation"""
        try:
            return video_processing_pb2.HealthCheckResponse(
                status=video_processing_pb2.HealthCheckResponse.SERVING,
                message="Hair service is healthy"
            )
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return video_processing_pb2.HealthCheckResponse(
                status=video_processing_pb2.HealthCheckResponse.NOT_SERVING,
                message=f"Service error: {str(e)}"
            )

class GrpcServer:
    """gRPC server wrapper with graceful shutdown"""
    
    def __init__(self, port: int = 50051, max_workers: int = 10):
        self.port = port
        self.max_workers = max_workers
        self.server: Optional[grpc.aio.Server] = None
        self.hair_processor = None
        
    async def start(self):
        """Start the gRPC server"""
        self.server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=self.max_workers))
        
        # Add service
        video_service = VideoProcessingService()
        self.hair_processor = video_service.hair_processor
        video_processing_pb2_grpc.add_VideoProcessingServiceServicer_to_server(
            video_service, self.server
        )
        
        # Configure server options for performance
        options = [
            ('grpc.keepalive_time_ms', 30000),
            ('grpc.keepalive_timeout_ms', 5000),
            ('grpc.keepalive_permit_without_calls', True),
            ('grpc.http2.max_pings_without_data', 0),
            ('grpc.http2.min_time_between_pings_ms', 10000),
            ('grpc.http2.min_ping_interval_without_data_ms', 300000),
            ('grpc.max_send_message_length', 10 * 1024 * 1024),  # 10MB
            ('grpc.max_receive_message_length', 10 * 1024 * 1024),  # 10MB
        ]
        
        for option in options:
            self.server.add_generic_rpc_handlers((
                grpc.method_handlers_generic_handler('', {}),
            ))
        
        # Bind port
        listen_addr = f'[::]:{self.port}'
        self.server.add_insecure_port(listen_addr)
        
        # Start server
        await self.server.start()
        logger.info(f"Hair service gRPC server started on port {self.port}")
        
        try:
            await self.server.wait_for_termination()
        except KeyboardInterrupt:
            logger.info("Received KeyboardInterrupt in server.start()")
            await self.stop()
        except Exception as e:
            logger.error(f"Server error: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """Stop the gRPC server gracefully"""
        logger.info("Stopping gRPC server...")
        
        # Cleanup hair processor
        if self.hair_processor:
            try:
                self.hair_processor.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up hair processor: {e}")
        
        if self.server:
            try:
                await self.server.stop(grace=2)
                logger.info("gRPC server stopped")
            except Exception as e:
                logger.error(f"Error stopping server: {e}")

async def main():
    """Main application entry point"""
    server = None
    try:
        server = GrpcServer(port=50051)
        await server.start()
    except KeyboardInterrupt:
        logger.info("Received KeyboardInterrupt, shutting down...")
        if server:
            await server.stop()
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        if server:
            await server.stop()
        sys.exit(1)

if __name__ == '__main__':
    try:
        # Run the async main function
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Application terminated by user")
        sys.exit(0)
