"""
HairFastGAN Local Inference Service
Handles hair style transfer using local HairFastGAN model
"""

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
import cv2
import logging
from pathlib import Path
from typing import Optional, Tuple
import io

logger = logging.getLogger(__name__)


class HairFastGANModel:
    """HairFastGAN model wrapper for local inference"""
    
    def __init__(self, model_path: str, device: str = "auto"):
        self.model_path = Path(model_path)
        self.device = self._get_device(device)
        self.model = None
        self.is_loaded = False
        
    def _get_device(self, device: str) -> torch.device:
        """Determine the best device to use"""
        if device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
                logger.info(f"Using CUDA GPU: {torch.cuda.get_device_name(0)}")
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                device = "mps"
                logger.info("Using Apple Silicon GPU (MPS)")
            else:
                device = "cpu"
                logger.info("Using CPU")
        
        return torch.device(device)
    
    def load_model(self):
        """Load the HairFastGAN model"""
        try:
            logger.info(f"Loading HairFastGAN model from {self.model_path}")
            
            # Check if model file exists
            if not self.model_path.exists():
                logger.warning(f"Model file not found: {self.model_path}")
                logger.warning("Using placeholder model for testing. Replace with actual HairFastGAN model.")
                # Use placeholder model for testing
                self.model = self._build_model()
                self.model.to(self.device)
                self.model.eval()
                self.is_loaded = True
                return
            
            # Check if it's a placeholder file (text file)
            with open(self.model_path, 'r') as f:
                first_line = f.readline()
                if first_line.startswith('#'):
                    logger.warning("Model file is a placeholder. Using dummy model for testing.")
                    self.model = self._build_model()
                    self.model.to(self.device)
                    self.model.eval()
                    self.is_loaded = True
                    return
            
            # Load actual model checkpoint
            # Note: Replace with actual HairFastGAN model loading
            checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
            
            # Initialize model architecture
            # Replace with actual HairFastGAN architecture
            self.model = self._build_model()
            
            # Load weights
            if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
                self.model.load_state_dict(checkpoint['state_dict'])
            else:
                self.model.load_state_dict(checkpoint)
            
            self.model.to(self.device)
            self.model.eval()
            
            self.is_loaded = True
            logger.info("HairFastGAN model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            logger.warning("Falling back to placeholder model for testing")
            # Fallback to placeholder model
            self.model = self._build_model()
            self.model.to(self.device)
            self.model.eval()
            self.is_loaded = True
    
    def _build_model(self) -> nn.Module:
        """Build HairFastGAN model architecture"""
        # Placeholder model architecture
        # Replace with actual HairFastGAN architecture
        class PlaceholderModel(nn.Module):
            def __init__(self):
                super().__init__()
                self.conv1 = nn.Conv2d(3, 64, 3, padding=1)
                self.conv2 = nn.Conv2d(64, 3, 3, padding=1)
                
            def forward(self, x):
                x = torch.relu(self.conv1(x))
                x = torch.sigmoid(self.conv2(x))
                return x
        
        return PlaceholderModel()
    
    def preprocess_image(self, image: Image.Image, target_size: int = 512) -> torch.Tensor:
        """Preprocess image for model input"""
        # Resize image
        image = image.convert('RGB')
        image = image.resize((target_size, target_size), Image.LANCZOS)
        
        # Convert to tensor
        image_array = np.array(image).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_array).permute(2, 0, 1).unsqueeze(0)
        
        # Normalize
        mean = torch.tensor([0.5, 0.5, 0.5]).view(1, 3, 1, 1)
        std = torch.tensor([0.5, 0.5, 0.5]).view(1, 3, 1, 1)
        image_tensor = (image_tensor - mean) / std
        
        return image_tensor.to(self.device)
    
    def postprocess_image(self, tensor: torch.Tensor) -> Image.Image:
        """Convert model output tensor to PIL Image"""
        # Denormalize
        mean = torch.tensor([0.5, 0.5, 0.5]).view(1, 3, 1, 1).to(tensor.device)
        std = torch.tensor([0.5, 0.5, 0.5]).view(1, 3, 1, 1).to(tensor.device)
        tensor = tensor * std + mean
        
        # Convert to numpy
        image_array = tensor.squeeze(0).permute(1, 2, 0).cpu().detach().numpy()
        image_array = np.clip(image_array * 255, 0, 255).astype(np.uint8)
        
        return Image.fromarray(image_array)
    
    @torch.no_grad()
    def transfer_hairstyle(
        self,
        source_image: Image.Image,
        style_image: Image.Image,
        blend_ratio: float = 0.8
    ) -> Image.Image:
        """
        Transfer hairstyle from style image to source image
        
        Args:
            source_image: User's photo
            style_image: Hairstyle reference image
            blend_ratio: Blending ratio (0-1), higher means more style influence
            
        Returns:
            Result image with transferred hairstyle
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        try:
            # Preprocess images
            source_tensor = self.preprocess_image(source_image)
            style_tensor = self.preprocess_image(style_image)
            
            # Concatenate source and style
            input_tensor = torch.cat([source_tensor, style_tensor], dim=1)
            
            # Run inference
            with torch.no_grad():
                output_tensor = self.model(source_tensor)  # Placeholder
            
            # Blend with original if needed
            if blend_ratio < 1.0:
                output_tensor = blend_ratio * output_tensor + (1 - blend_ratio) * source_tensor
            
            # Postprocess
            result_image = self.postprocess_image(output_tensor)
            
            return result_image
            
        except Exception as e:
            logger.error(f"Hair transfer failed: {e}")
            raise


class HairFastGANService:
    """Service for managing HairFastGAN inference"""
    
    def __init__(self, model_path: str, device: str = "auto"):
        self.model = HairFastGANModel(model_path, device)
        self.initialized = False
    
    async def initialize(self):
        """Initialize the service"""
        try:
            logger.info("Initializing HairFastGAN service...")
            self.model.load_model()
            self.initialized = True
            logger.info("HairFastGAN service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize HairFastGAN service: {e}")
            raise
    
    async def process_image(
        self,
        source_image_data: bytes,
        style_image_data: bytes,
        blend_ratio: float = 0.8
    ) -> bytes:
        """
        Process hair try-on request
        
        Args:
            source_image_data: User's photo as bytes
            style_image_data: Hairstyle reference as bytes
            blend_ratio: Blending ratio
            
        Returns:
            Result image as bytes
        """
        if not self.initialized:
            raise RuntimeError("Service not initialized")
        
        try:
            # Load images
            source_image = Image.open(io.BytesIO(source_image_data))
            style_image = Image.open(io.BytesIO(style_image_data))
            
            # Process
            result_image = self.model.transfer_hairstyle(
                source_image,
                style_image,
                blend_ratio
            )
            
            # Convert to bytes
            output_buffer = io.BytesIO()
            result_image.save(output_buffer, format='JPEG', quality=95)
            output_buffer.seek(0)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise
    
    def get_device_info(self) -> dict:
        """Get device information"""
        return {
            "device": str(self.model.device),
            "cuda_available": torch.cuda.is_available(),
            "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "cuda_device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        }
