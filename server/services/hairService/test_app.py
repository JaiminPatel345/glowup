#!/usr/bin/env python3
"""
Simple test version of the hair service
"""

import asyncio
import grpc
import logging
import time
from concurrent import futures

import video_processing_pb2
import video_processing_pb2_grpc

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VideoProcessingService(video_processing_pb2_grpc.VideoProcessingServiceServicer):
    """Simple gRPC service for testing"""
    
    def __init__(self):
        logger.info("VideoProcessingService initialized")

    def ProcessVideoStream(self, request_iterator, context):
        """Echo back the same frames for testing"""
        try:
            for frame_request in request_iterator:
                logger.info(f"Received frame from session: {frame_request.session_id}")
                
                # Just echo back the same frame
                response_frame = video_processing_pb2.VideoFrame(
                    session_id=frame_request.session_id,
                    frame_data=frame_request.frame_data,
                    format=frame_request.format,
                    timestamp=int(time.time() * 1000),
                    width=frame_request.width,
                    height=frame_request.height,
                    metadata=frame_request.metadata
                )
                
                yield response_frame
                    
        except Exception as e:
            logger.error(f"Error in ProcessVideoStream: {e}")

    def HealthCheck(self, request, context):
        """Health check implementation"""
        return video_processing_pb2.HealthCheckResponse(
            status=video_processing_pb2.HealthCheckResponse.SERVING,
            message="Test service is healthy"
        )

def serve():
    """Start the gRPC server"""
    port = 50051
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    
    video_processing_pb2_grpc.add_VideoProcessingServiceServicer_to_server(
        VideoProcessingService(), server
    )
    
    listen_addr = f'[::]:{port}'
    server.add_insecure_port(listen_addr)
    server.start()
    
    logger.info(f"Test Hair service started on port {port}")
    
    # Setup signal handlers
    import signal
    
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, stopping server...")
        server.stop(0)
        import sys
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Stopping server...")
        server.stop(0)

if __name__ == '__main__':
    serve()
