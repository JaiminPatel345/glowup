#!/usr/bin/env python3
"""
Hair Processor - Real-time face anonymization using MediaPipe and OpenCV
"""

import asyncio
import base64
import cv2
import logging
import numpy as np
import time
from io import BytesIO
from PIL import Image
from typing import Dict, Any, Optional

from utils import blur_image

logger = logging.getLogger(__name__)

class HairProcessor:
    """Hair processing service using MediaPipe for face anonymization"""
    
    def __init__(self):
        """Initialize the hair processor"""
        logger.info("HairProcessor initialized with MediaPipe face anonymization")
        
    async def process_frame(self, frame_data: str, format: str = 'jpeg', metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a video frame with face anonymization
        
        Args:
            frame_data: Base64 encoded frame data
            format: Image format (jpeg, png, etc.)
            metadata: Additional frame metadata
            
        Returns:
            Dict containing processed frame data
        """
        try:
            start_time = time.time()
            
            # Decode base64 image
            img_data = self._decode_base64_image(frame_data)
            if img_data is None:
                logger.error("Failed to decode base64 image")
                return self._create_error_response(frame_data, format)
            
            # Process with face blur
            processed_img = blur_image(img_data, model_selection=1)
            
            # Encode back to base64
            processed_frame_data = self._encode_image_to_base64(processed_img, format)
            if processed_frame_data is None:
                logger.error("Failed to encode processed image")
                return self._create_error_response(frame_data, format)
            
            processing_time = time.time() - start_time
            logger.debug(f"Frame processed in {processing_time:.3f}s")
            
            return {
                'frame_data': processed_frame_data,
                'format': format,
                'width': processed_img.shape[1],
                'height': processed_img.shape[0],
                'extra_metadata': {
                    'processing_time': processing_time,
                    'faces_detected': True,  # Could be enhanced to return actual count
                    'processor': 'face_blur'
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            return self._create_error_response(frame_data, format)
    
    def _decode_base64_image(self, frame_data: str) -> Optional[np.ndarray]:
        """Decode base64 string to OpenCV image"""
        try:
            # Remove data URL prefix if present
            if frame_data.startswith('data:image'):
                frame_data = frame_data.split(',')[1]
            
            # Decode base64
            img_bytes = base64.b64decode(frame_data)
            
            # Convert to numpy array
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            
            # Decode with OpenCV
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            
            return img
            
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None
    
    def _encode_image_to_base64(self, img: np.ndarray, format: str = 'jpeg') -> Optional[str]:
        """Encode OpenCV image to base64 string"""
        try:
            # Encode image
            if format.lower() in ['jpg', 'jpeg']:
                _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            elif format.lower() == 'png':
                _, buffer = cv2.imencode('.png', img)
            else:
                _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            # Convert to base64
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return img_base64
            
        except Exception as e:
            logger.error(f"Failed to encode image to base64: {e}")
            return None
    
    def _create_error_response(self, original_frame_data: str, format: str) -> Dict[str, Any]:
        """Create error response with original frame"""
        return {
            'frame_data': original_frame_data,
            'format': format,
            'width': 0,
            'height': 0,
            'extra_metadata': {
                'processing_time': 0,
                'error': True,
                'processor': 'face_blur'
            }
        }
    
    def cleanup(self):
        """Cleanup resources"""
        logger.info("HairProcessor cleanup completed")
