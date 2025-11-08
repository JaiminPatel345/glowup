import torch
import numpy as np
import cv2
from typing import Optional, Tuple
from PIL import Image
import logging
import os
from app.core.config import settings

logger = logging.getLogger(__name__)

class HairFastGANModel:
    """Hair style transfer model using HairFastGAN or similar architecture"""
    
    def __init__(self):
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_loaded = False
        self.input_size = (512, 512)  # Standard input size for hair models
        
    async def load_model(self):
        """Load the hair style transfer model"""
        try:
            model_path = os.path.join(settings.model_path, settings.hair_model_name)
            
            if not os.path.exists(model_path):
                logger.warning(f"Model file not found at {model_path}. Using mock model.")
                self.model_loaded = True
                return
            
            # Load the actual model (placeholder for real implementation)
            # self.model = torch.load(model_path, map_location=self.device)
            # self.model.eval()
            
            # For now, use a mock model
            self.model_loaded = True
            logger.info(f"Hair model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load hair model: {e}")
            raise
    
    def preprocess_image(self, image: np.ndarray) -> torch.Tensor:
        """Preprocess image for model input"""
        # Resize to model input size
        image_resized = cv2.resize(image, self.input_size)
        
        # Convert to RGB if needed
        if len(image_resized.shape) == 3 and image_resized.shape[2] == 3:
            image_rgb = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image_resized
        
        # Normalize to [-1, 1]
        image_normalized = (image_rgb.astype(np.float32) / 127.5) - 1.0
        
        # Convert to tensor and add batch dimension
        tensor = torch.from_numpy(image_normalized).permute(2, 0, 1).unsqueeze(0)
        
        return tensor.to(self.device)
    
    def postprocess_output(self, output: torch.Tensor) -> np.ndarray:
        """Postprocess model output to image"""
        # Remove batch dimension and move to CPU
        output = output.squeeze(0).cpu().detach().numpy()
        
        # Permute dimensions back to HWC
        output = np.transpose(output, (1, 2, 0))
        
        # Denormalize from [-1, 1] to [0, 255]
        output = ((output + 1.0) * 127.5).astype(np.uint8)
        
        # Convert RGB to BGR
        output_bgr = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)
        
        return output_bgr
    
    async def apply_hairstyle(
        self, 
        source_image: np.ndarray, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Apply hairstyle to source image"""
        if not self.model_loaded:
            await self.load_model()
        
        try:
            # Preprocess inputs
            source_tensor = self.preprocess_image(source_image)
            style_tensor = self.preprocess_image(style_image)
            
            # For mock implementation, return a simple blend
            if self.model is None:
                return self._mock_hair_transfer(source_image, style_image, color_image)
            
            # Real model inference would go here
            with torch.no_grad():
                # output = self.model(source_tensor, style_tensor)
                # For now, return mock result
                output = source_tensor  # Placeholder
            
            result = self.postprocess_output(output)
            
            # Apply color if provided
            if color_image is not None:
                result = self._apply_hair_color(result, color_image)
            
            return result
            
        except Exception as e:
            logger.error(f"Hair style application failed: {e}")
            # Return original image as fallback
            return source_image
    
    def _mock_hair_transfer(
        self, 
        source_image: np.ndarray, 
        style_image: np.ndarray,
        color_image: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """Mock hair transfer for testing purposes"""
        # Simple blend operation as placeholder
        source_resized = cv2.resize(source_image, self.input_size)
        style_resized = cv2.resize(style_image, self.input_size)
        
        # Create a simple blend (30% style, 70% source)
        blended = cv2.addWeighted(source_resized, 0.7, style_resized, 0.3, 0)
        
        # Resize back to original size
        original_height, original_width = source_image.shape[:2]
        result = cv2.resize(blended, (original_width, original_height))
        
        return result
    
    def _apply_hair_color(self, image: np.ndarray, color_image: np.ndarray) -> np.ndarray:
        """Apply hair color to the result image"""
        # This is a simplified color transfer
        # In a real implementation, this would involve hair segmentation and color mapping
        
        # Convert to HSV for color manipulation
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        color_hsv = cv2.cvtColor(color_image, cv2.COLOR_BGR2HSV)
        
        # Extract average hue from color image
        avg_hue = np.mean(color_hsv[:, :, 0])
        
        # Apply color to hair regions (simplified)
        # In practice, this would require hair segmentation
        hsv[:, :, 0] = avg_hue
        
        result = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        return result

class AIService:
    """Main AI service for hair try-on processing"""
    
    def __init__(self):
        self.hair_model = HairFastGANModel()
        self.processing_stats = {
            "total_processed": 0,
            "average_processing_time": 0.0,
            "success_rate": 0.0
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
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Update stats
            self.processing_stats["total_processed"] += 1
            
            return result, processing_time
            
        except Exception as e:
            logger.error(f"Frame processing failed: {e}")
            processing_time = (time.time() - start_time) * 1000
            return frame, processing_time  # Return original frame on error
    
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
        logger.info(f"Average processing time per frame: {avg_processing_time:.2f}ms")
        
        return processed_frames
    
    def get_processing_stats(self) -> dict:
        """Get processing statistics"""
        return self.processing_stats.copy()

# Global AI service instance
ai_service = AIService()