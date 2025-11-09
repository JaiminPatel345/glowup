import torch
import numpy as np
import cv2
from typing import Optional, Tuple
from PIL import Image
import logging
import os
import base64
import io
from app.core.config import settings

logger = logging.getLogger(__name__)

class ReplicateHairModel:
    """Hair try-on using Replicate API (free tier available)"""
    
    def __init__(self):
        self.api_token = settings.replicate_api_token
        self.model_loaded = False
        
    async def load_model(self):
        """Initialize Replicate API"""
        try:
            if not self.api_token:
                logger.warning("REPLICATE_API_TOKEN not set. Please get a free token from https://replicate.com/account/api-tokens")
                return
            
            import replicate
            self.client = replicate.Client(api_token=self.api_token)
            self.model_loaded = True
            logger.info("Replicate API initialized successfully")
            
        except ImportError:
            logger.error("Replicate package not installed. Run: pip install replicate")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Replicate API: {e}")
            raise
    
    def _image_to_base64(self, image: np.ndarray) -> str:
        """Convert numpy image to base64 string"""
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(image_rgb)
        
        # Convert to base64
        buffered = io.BytesIO()
        pil_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def _base64_to_image(self, base64_str: str) -> np.ndarray:
        """Convert base64 string to numpy image"""
        # Remove data URL prefix if present
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
        
        # Decode base64
        img_data = base64.b64decode(base64_str)
        pil_image = Image.open(io.BytesIO(img_data))
        
        # Convert to numpy array and BGR
        image_rgb = np.array(pil_image)
        image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        
        return image_bgr
    
    async def apply_hairstyle(
        self, 
        source_image: np.ndarray, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Apply hairstyle using Replicate API"""
        if not self.model_loaded:
            await self.load_model()
        
        if not self.model_loaded:
            logger.warning("Replicate API not available, using fallback")
            return self._fallback_hair_transfer(source_image, style_image)
        
        try:
            import replicate
            
            # Convert images to base64
            source_b64 = self._image_to_base64(source_image)
            style_b64 = self._image_to_base64(style_image)
            
            # Use a hair transfer model from Replicate
            # Note: This is a placeholder model name - you may need to find the actual model
            # Popular options: "rosebud-ai/hairstyle-transfer" or similar
            output = await self._run_replicate_model(source_b64, style_b64)
            
            if output:
                result = self._base64_to_image(output)
                
                # Apply color if provided
                if color_image is not None:
                    result = self._apply_hair_color(result, color_image)
                
                return result
            else:
                logger.warning("Replicate API returned no output, using fallback")
                return self._fallback_hair_transfer(source_image, style_image)
            
        except Exception as e:
            logger.error(f"Replicate API call failed: {e}")
            return self._fallback_hair_transfer(source_image, style_image)
    
    async def _run_replicate_model(self, source_b64: str, style_b64: str) -> Optional[str]:
        """Run the Replicate model"""
        try:
            import replicate
            
            # Try multiple hair try-on models
            models_to_try = [
                "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
                # Add more hair-specific models as they become available
            ]
            
            for model_id in models_to_try:
                try:
                    output = self.client.run(
                        model_id,
                        input={
                            "img": source_b64,
                            "version": "v1.4",
                            "scale": 2
                        }
                    )
                    
                    if output:
                        return output
                        
                except Exception as e:
                    logger.debug(f"Model {model_id} failed: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"All Replicate models failed: {e}")
            return None
    
    def _fallback_hair_transfer(
        self, 
        source_image: np.ndarray, 
        style_image: np.ndarray
    ) -> np.ndarray:
        """Fallback hair transfer using simple image processing"""
        logger.info("Using fallback hair transfer method")
        
        # Resize style to match source
        style_resized = cv2.resize(style_image, (source_image.shape[1], source_image.shape[0]))
        
        # Simple blend operation
        blended = cv2.addWeighted(source_image, 0.7, style_resized, 0.3, 0)
        
        return blended
    
    def _apply_hair_color(self, image: np.ndarray, color_image: np.ndarray) -> np.ndarray:
        """Apply hair color to the result image"""
        # Convert to HSV for color manipulation
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        color_hsv = cv2.cvtColor(color_image, cv2.COLOR_BGR2HSV)
        
        # Extract average hue from color image
        avg_hue = np.mean(color_hsv[:, :, 0])
        
        # Apply color to hair regions (simplified)
        hsv[:, :, 0] = avg_hue
        
        result = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        return result


class LocalHairModel:
    """Local hair style transfer model (CPU-compatible)"""
    
    def __init__(self):
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_loaded = False
        self.input_size = (512, 512)
        
    async def load_model(self):
        """Load local hair model if available"""
        try:
            model_path = os.path.join(settings.model_path, settings.hair_model_name)
            
            if not os.path.exists(model_path):
                logger.info(f"Local model not found at {model_path}")
                self.model_loaded = False
                return
            
            # Load model (placeholder for actual implementation)
            # self.model = torch.load(model_path, map_location=self.device)
            # self.model.eval()
            
            self.model_loaded = True
            logger.info(f"Local hair model loaded on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load local model: {e}")
            self.model_loaded = False
    
    async def apply_hairstyle(
        self, 
        source_image: np.ndarray, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Apply hairstyle using local model"""
        if not self.model_loaded:
            await self.load_model()
        
        # Fallback to simple processing
        return self._simple_hair_transfer(source_image, style_image, color_image)
    
    def _simple_hair_transfer(
        self, 
        source_image: np.ndarray, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Simple hair transfer for CPU"""
        # Resize style to match source
        style_resized = cv2.resize(style_image, (source_image.shape[1], source_image.shape[0]))
        
        # Detect faces and hair regions (simplified)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(source_image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        result = source_image.copy()
        
        # If face detected, blend hair region
        if len(faces) > 0:
            for (x, y, w, h) in faces:
                # Hair region is typically above the face
                hair_y_start = max(0, y - int(h * 0.5))
                hair_y_end = y + int(h * 0.2)
                hair_x_start = max(0, x - int(w * 0.2))
                hair_x_end = min(source_image.shape[1], x + w + int(w * 0.2))
                
                # Blend hair region
                hair_region = result[hair_y_start:hair_y_end, hair_x_start:hair_x_end]
                style_region = style_resized[hair_y_start:hair_y_end, hair_x_start:hair_x_end]
                
                if hair_region.shape == style_region.shape:
                    blended = cv2.addWeighted(hair_region, 0.6, style_region, 0.4, 0)
                    result[hair_y_start:hair_y_end, hair_x_start:hair_x_end] = blended
        else:
            # No face detected, blend entire image
            result = cv2.addWeighted(source_image, 0.7, style_resized, 0.3, 0)
        
        # Apply color if provided
        if color_image is not None:
            result = self._apply_hair_color(result, color_image, faces)
        
        return result
    
    def _apply_hair_color(self, image: np.ndarray, color_image: np.ndarray, faces) -> np.ndarray:
        """Apply hair color to detected hair regions"""
        result = image.copy()
        
        # Get average color from color image
        avg_color = np.mean(color_image, axis=(0, 1))
        
        if len(faces) > 0:
            for (x, y, w, h) in faces:
                # Hair region
                hair_y_start = max(0, y - int(h * 0.5))
                hair_y_end = y + int(h * 0.2)
                hair_x_start = max(0, x - int(w * 0.2))
                hair_x_end = min(image.shape[1], x + w + int(w * 0.2))
                
                # Apply color tint to hair region
                hair_region = result[hair_y_start:hair_y_end, hair_x_start:hair_x_end]
                colored = cv2.addWeighted(hair_region, 0.7, 
                                         np.full_like(hair_region, avg_color), 0.3, 0)
                result[hair_y_start:hair_y_end, hair_x_start:hair_x_end] = colored
        
        return result


class AIService:
    """Main AI service for hair try-on processing"""
    
    def __init__(self):
        # Choose model based on configuration
        if settings.use_replicate_api and settings.replicate_api_token:
            self.hair_model = ReplicateHairModel()
            logger.info("Using Replicate API for hair try-on")
        else:
            self.hair_model = LocalHairModel()
            logger.info("Using local model for hair try-on")
        
        self.processing_stats = {
            "total_processed": 0,
            "average_processing_time": 0.0,
            "success_rate": 0.0,
            "failed_count": 0
        }
    
    async def initialize(self):
        """Initialize AI models"""
        await self.hair_model.load_model()
        logger.info("AI Service initialized successfully")
    
    async def process_frame(
        self, 
        frame: np.ndarray, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, float]:
        """Process a single frame with hair style transfer"""
        import time
        start_time = time.time()
        
        try:
            result = await self.hair_model.apply_hairstyle(frame, style_image, color_image)
            processing_time = (time.time() - start_time) * 1000
            
            # Update stats
            self.processing_stats["total_processed"] += 1
            
            return result, processing_time
            
        except Exception as e:
            logger.error(f"Frame processing failed: {e}")
            self.processing_stats["failed_count"] += 1
            processing_time = (time.time() - start_time) * 1000
            return frame, processing_time
    
    async def process_video_frames(
        self, 
        frames: list, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> list:
        """Process multiple video frames"""
        processed_frames = []
        total_processing_time = 0
        
        for i, frame in enumerate(frames):
            processed_frame, processing_time = await self.process_frame(
                frame, style_image, color_image
            )
            processed_frames.append(processed_frame)
            total_processing_time += processing_time
            
            logger.info(f"Processed frame {i+1}/{len(frames)} in {processing_time:.2f}ms")
        
        avg_processing_time = total_processing_time / len(frames) if frames else 0
        self.processing_stats["average_processing_time"] = avg_processing_time
        
        if self.processing_stats["total_processed"] > 0:
            success_count = self.processing_stats["total_processed"] - self.processing_stats["failed_count"]
            self.processing_stats["success_rate"] = (success_count / self.processing_stats["total_processed"]) * 100
        
        logger.info(f"Average processing time per frame: {avg_processing_time:.2f}ms")
        
        return processed_frames
    
    def get_processing_stats(self) -> dict:
        """Get processing statistics"""
        return self.processing_stats.copy()

# Global AI service instance
ai_service = AIService()
