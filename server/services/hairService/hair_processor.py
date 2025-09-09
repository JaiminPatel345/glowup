"""
Hair Processor Module - Core ML processing for hair analysis with face anonymization
"""

import asyncio
import base64
import io
import logging
import time
from typing import Dict, Any, Optional

import cv2
import numpy as np
from PIL import Image
import mediapipe as mp

logger = logging.getLogger(__name__)

class HairProcessor:
    """
    Hair processing engine for real-time video analysis with face anonymization
    """
    
    def __init__(self):
        """Initialize the hair processor with MediaPipe face detection"""
        self.processing_count = 0
        
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0,  # 0 for short-range (2 meters), 1 for full-range (5 meters)
            min_detection_confidence=0.5
        )
        
        logger.info("HairProcessor initialized with MediaPipe face anonymization")
    
    async def process_frame(self, frame_data: str, format: str, metadata: Any) -> Dict[str, Any]:
        """
        Process a single video frame for hair analysis with face anonymization
        
        Args:
            frame_data: Base64 encoded image data
            format: Image format (jpeg, png, etc.)
            metadata: Frame metadata
            
        Returns:
            Dictionary containing processed frame data
        """
        start_time = time.time()
        self.processing_count += 1
        
        try:
            # Process the frame with face anonymization
            processed_data = await self._face_anonymization_processing(frame_data, format, metadata)
            
            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Log processing stats every 50 frames
            if self.processing_count % 50 == 0:
                logger.info(f"Processed frame #{self.processing_count} in {processing_time:.2f}ms")
            
            return processed_data
            
        except Exception as e:
            logger.error(f"Error processing frame #{self.processing_count}: {e}")
            # Return original frame on error
            return {
                'frame_data': frame_data,
                'format': format,
                'width': 0,
                'height': 0,
                'extra_metadata': {'error': str(e)}
            }
    
    async def _face_anonymization_processing(self, frame_data: str, format: str, metadata: Any) -> Dict[str, Any]:
        """
        Face anonymization processing using MediaPipe
        """
        
        # Decode base64 image
        image_data = self._decode_base64_image(frame_data)
        
        if image_data is None:
            raise ValueError("Failed to decode image data")
        
        # Convert PIL Image to OpenCV format
        cv_image = cv2.cvtColor(np.array(image_data), cv2.COLOR_RGB2BGR)
        height, width = cv_image.shape[:2]
        
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe Face Detection
        results = self.face_detection.process(rgb_image)
        
        # Apply face anonymization (blur faces)
        if results.detections:
            for detection in results.detections:
                bboxC = detection.location_data.relative_bounding_box
                ih, iw, _ = rgb_image.shape
                
                # Calculate bounding box coordinates
                x = int(bboxC.xmin * iw)
                y = int(bboxC.ymin * ih)
                w = int(bboxC.width * iw)
                h = int(bboxC.height * ih)
                
                # Ensure coordinates are within image bounds
                x = max(0, x)
                y = max(0, y)
                w = min(w, iw - x)
                h = min(h, ih - y)
                
                # Extract face region
                face_region = rgb_image[y:y+h, x:x+w]
                
                if face_region.size > 0:
                    # Apply Gaussian blur to anonymize face
                    blurred_face = cv2.GaussianBlur(face_region, (99, 99), 30)
                    
                    # Replace face region with blurred version
                    rgb_image[y:y+h, x:x+w] = blurred_face
        
        # Convert back to BGR for OpenCV
        processed_image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
        
        # Convert back to PIL Image
        processed_pil = Image.fromarray(cv2.cvtColor(processed_image, cv2.COLOR_BGR2RGB))
        
        # Encode back to base64
        processed_base64 = self._encode_image_to_base64(processed_pil, format)
        
        return {
            'frame_data': processed_base64,
            'format': format,
            'width': width,
            'height': height,
            'extra_metadata': {
                'processing_type': 'face_anonymization',
                'faces_detected': len(results.detections) if results.detections else 0,
                'confidence': 0.8,
                'processing_time_ms': 0  # Will be calculated by caller
            }
        }
    
    def _decode_base64_image(self, base64_string: str) -> Optional[Image.Image]:
        """Decode base64 string to PIL Image"""
        try:
            # Remove data URL prefix if present
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            return image
            
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None
    
    def _encode_image_to_base64(self, image: Image.Image, format: str = 'JPEG') -> str:
        """Encode PIL Image to base64 string"""
        try:
            buffer = io.BytesIO()
            
            # Use JPEG for better compression, PNG for transparency
            img_format = 'JPEG' if format.lower() in ['jpg', 'jpeg'] else 'PNG'
            
            # Optimize JPEG quality for real-time processing
            if img_format == 'JPEG':
                image.save(buffer, format=img_format, quality=85, optimize=True)
            else:
                image.save(buffer, format=img_format, optimize=True)
            
            # Encode to base64
            buffer.seek(0)
            base64_string = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return base64_string
            
        except Exception as e:
            logger.error(f"Failed to encode image to base64: {e}")
            raise
    
    def cleanup(self):
        """Cleanup MediaPipe resources"""
        if hasattr(self, 'face_detection'):
            self.face_detection.close()
            logger.info("MediaPipe face detection resources cleaned up")
