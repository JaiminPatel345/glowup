"""
Image Preprocessor for ML model input preparation.

Handles image preprocessing including resizing, normalization, and tensor conversion.
"""

import logging
from typing import Tuple, List
import torch
from torchvision import transforms
from PIL import Image
import numpy as np

from app.ml.exceptions import PreprocessingError, ValidationError
from app.ml.logging_utils import MLLogger

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """
    Preprocesses images for ML model inference.
    
    Handles resizing, normalization, and tensor conversion using
    ImageNet statistics for transfer learning compatibility.
    """
    
    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        """
        Initialize preprocessor with target dimensions.
        
        Args:
            target_size: Target image dimensions (height, width)
        """
        self.target_size = target_size
        
        # ImageNet normalization statistics
        self.mean = [0.485, 0.456, 0.406]
        self.std = [0.229, 0.224, 0.225]
        
        # Define transformation pipeline
        self.transform = transforms.Compose([
            transforms.Resize(self.target_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.mean, std=self.std)
        ])
        
        # Initialize structured logger
        self._logger = MLLogger("ImagePreprocessor")
        
        self._logger.log_operation_complete(
            "initialization",
            0.0,
            target_size=target_size
        )
    
    def preprocess(self, image: Image.Image) -> torch.Tensor:
        """
        Preprocess image for model input.
        
        Steps:
        1. Resize to target_size
        2. Convert to tensor
        3. Normalize using ImageNet statistics
        4. Add batch dimension
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed tensor ready for inference with shape (1, 3, H, W)
            
        Raises:
            ValidationError: If image validation fails
            PreprocessingError: If preprocessing fails
        """
        import time
        start_time = time.time()
        
        try:
            # Validate image
            if not self.validate_image(image):
                raise ValueError("Invalid image format or quality")
            
            original_size = image.size
            self._logger.log_operation_start(
                "preprocessing",
                original_size=original_size,
                mode=image.mode
            )
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Apply transformations
            tensor = self.transform(image)
            
            # Add batch dimension
            tensor = tensor.unsqueeze(0)
            
            duration = time.time() - start_time
            self._logger.log_operation_complete(
                "preprocessing",
                duration,
                original_size=original_size,
                output_shape=tuple(tensor.shape)
            )
            
            return tensor
            
        except (ValidationError, ValueError):
            raise
        except Exception as e:
            duration = time.time() - start_time
            self._logger.log_error("preprocessing", e, duration=duration)
            raise PreprocessingError(
                "Failed to preprocess image",
                image_size=image.size if hasattr(image, 'size') else None,
                original_exception=e
            )
    
    def preprocess_batch(self, images: List[Image.Image]) -> torch.Tensor:
        """
        Preprocess multiple images in a batch.
        
        Args:
            images: List of PIL Image objects
            
        Returns:
            Batched tensor with shape (N, 3, H, W)
        """
        tensors = []
        
        for image in images:
            # Preprocess each image (without batch dimension)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            tensor = self.transform(image)
            tensors.append(tensor)
        
        # Stack into batch
        batch_tensor = torch.stack(tensors)
        
        return batch_tensor
    
    def validate_image(self, image: Image.Image) -> bool:
        """
        Validate image quality and format.
        
        Args:
            image: PIL Image object
            
        Returns:
            True if image is valid, False otherwise
        """
        try:
            # Check if image is valid
            if image is None:
                self._logger.log_warning("Image validation failed: Image is None")
                return False
            
            # Check image size
            width, height = image.size
            if width < 50 or height < 50:
                self._logger.log_warning(
                    "Image validation failed: Image too small",
                    width=width,
                    height=height,
                    min_size=50
                )
                return False
            
            # Check if image can be converted to RGB
            if image.mode not in ['RGB', 'RGBA', 'L']:
                self._logger.log_warning(
                    "Image validation failed: Unsupported mode",
                    mode=image.mode,
                    supported_modes=['RGB', 'RGBA', 'L']
                )
                return False
            
            self._logger.log_metric("image_validation_success", 1, width=width, height=height)
            return True
            
        except Exception as e:
            self._logger.log_error("image_validation", e)
            return False
    
    def denormalize(self, tensor: torch.Tensor) -> np.ndarray:
        """
        Denormalize tensor back to image format.
        
        Useful for visualization and debugging.
        
        Args:
            tensor: Normalized tensor
            
        Returns:
            Denormalized numpy array in range [0, 255]
        """
        # Remove batch dimension if present
        if tensor.dim() == 4:
            tensor = tensor.squeeze(0)
        
        # Denormalize
        for t, m, s in zip(tensor, self.mean, self.std):
            t.mul_(s).add_(m)
        
        # Convert to numpy and scale to [0, 255]
        image_array = tensor.permute(1, 2, 0).cpu().numpy()
        image_array = np.clip(image_array * 255, 0, 255).astype(np.uint8)
        
        return image_array
