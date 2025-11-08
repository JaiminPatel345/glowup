from fastapi import UploadFile, HTTPException
import aiofiles
import os
import uuid
from PIL import Image
import cv2
import numpy as np
from typing import Tuple
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class ImageService:
    """Service for handling image upload, validation, and preprocessing"""
    
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_types = settings.ALLOWED_IMAGE_TYPES
        
        # Ensure upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def validate_image(self, image: UploadFile) -> None:
        """Validate uploaded image file"""
        
        # Check file size
        if hasattr(image, 'size') and image.size > self.max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
            )
        
        # Check content type
        if image.content_type not in self.allowed_types:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type. Allowed types: {', '.join(self.allowed_types)}"
            )
        
        # Read file content to validate it's a valid image
        try:
            content = await image.read()
            await image.seek(0)  # Reset file pointer
            
            # Check actual file size
            if len(content) > self.max_file_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
                )
            
            # Validate image can be opened
            image_pil = Image.open(image.file)
            image_pil.verify()
            await image.seek(0)  # Reset file pointer again
            
        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Invalid image file or corrupted data"
            )
    
    async def save_and_process_image(self, image: UploadFile) -> str:
        """Save uploaded image and perform basic preprocessing"""
        
        # Generate unique filename
        file_extension = os.path.splitext(image.filename)[1] if image.filename else '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        try:
            # Save uploaded file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await image.read()
                await f.write(content)
            
            # Process image for analysis
            processed_path = await self.preprocess_image(file_path)
            
            # Remove original if different from processed
            if processed_path != file_path:
                os.remove(file_path)
            
            return processed_path
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            logger.error(f"Failed to save and process image: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to process image")
    
    async def preprocess_image(self, image_path: str) -> str:
        """Preprocess image for optimal AI model input"""
        
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not load image")
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Resize image to standard size (512x512 for most skin analysis models)
            target_size = (512, 512)
            image_resized = cv2.resize(image_rgb, target_size, interpolation=cv2.INTER_LANCZOS4)
            
            # Normalize image quality
            image_normalized = self._normalize_image_quality(image_resized)
            
            # Save processed image
            processed_filename = f"processed_{os.path.basename(image_path)}"
            processed_path = os.path.join(self.upload_dir, processed_filename)
            
            # Convert back to BGR for saving with OpenCV
            image_bgr = cv2.cvtColor(image_normalized, cv2.COLOR_RGB2BGR)
            cv2.imwrite(processed_path, image_bgr)
            
            return processed_path
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Image preprocessing failed")
    
    def _normalize_image_quality(self, image: np.ndarray) -> np.ndarray:
        """Normalize image brightness and contrast"""
        
        # Convert to LAB color space for better brightness adjustment
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_channel = clahe.apply(l_channel)
        
        # Merge channels and convert back to RGB
        lab = cv2.merge([l_channel, a_channel, b_channel])
        enhanced_image = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        
        return enhanced_image
    
    def calculate_image_quality_score(self, image_path: str) -> float:
        """Calculate image quality score (0.0 to 1.0)"""
        
        try:
            image = cv2.imread(image_path)
            if image is None:
                return 0.0
            
            # Convert to grayscale for quality analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Calculate sharpness using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate brightness
            brightness = np.mean(gray)
            
            # Calculate contrast
            contrast = gray.std()
            
            # Normalize scores (these thresholds may need tuning)
            sharpness_score = min(laplacian_var / 1000.0, 1.0)  # Normalize to 0-1
            brightness_score = 1.0 - abs(brightness - 128) / 128.0  # Optimal around 128
            contrast_score = min(contrast / 64.0, 1.0)  # Normalize to 0-1
            
            # Weighted average
            quality_score = (sharpness_score * 0.4 + brightness_score * 0.3 + contrast_score * 0.3)
            
            return max(0.0, min(1.0, quality_score))
            
        except Exception as e:
            logger.error(f"Quality score calculation failed: {str(e)}")
            return 0.5  # Return neutral score on error
    
    async def cleanup_file(self, file_path: str) -> None:
        """Clean up temporary files"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up file: {file_path}")
        except Exception as e:
            logger.error(f"Failed to cleanup file {file_path}: {str(e)}")
    
    def get_image_dimensions(self, image_path: str) -> Tuple[int, int]:
        """Get image dimensions (width, height)"""
        try:
            with Image.open(image_path) as img:
                return img.size
        except Exception as e:
            logger.error(f"Failed to get image dimensions: {str(e)}")
            return (0, 0)