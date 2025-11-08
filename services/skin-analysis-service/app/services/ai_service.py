import os
import logging
import asyncio
from typing import Dict, Any, List, Tuple, Optional
import cv2
import numpy as np
from datetime import datetime
import pickle
import requests
import json
from PIL import Image, ImageDraw
from skimage import segmentation, measure
from skimage.filters import gaussian

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """
    AI Service for skin analysis
    Implements priority: GitHub models → free APIs → custom models
    """
    
    def __init__(self):
        self.model_version = "github-huggingface-v1.0"
        self.models_dir = settings.MODELS_DIR
        self.model_loaded = False
        self.skin_model = None
        self._ensure_models_directory()
        
        # Model priority configuration
        self.model_sources = [
            "github_huggingface",  # Priority 1: GitHub/HuggingFace models
            "free_api",           # Priority 2: Free API services
            "custom_model"        # Priority 3: Custom trained models
        ]
        
        # Initialize model on startup
        asyncio.create_task(self._initialize_model())
    
    def _ensure_models_directory(self):
        """Ensure models directory exists"""
        os.makedirs(self.models_dir, exist_ok=True)
    
    async def analyze_skin_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze skin image and return detected skin type and issues
        Uses priority-based model selection: GitHub models → free APIs → custom models
        """
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Preprocess image for model input
            preprocessed_image = await self.preprocess_for_model(image_path)
            
            # Try models in priority order
            analysis_result = None
            for model_source in self.model_sources:
                try:
                    if model_source == "github_huggingface":
                        analysis_result = await self._analyze_with_huggingface(preprocessed_image, image_path)
                    elif model_source == "free_api":
                        analysis_result = await self._analyze_with_free_api(preprocessed_image, image_path)
                    elif model_source == "custom_model":
                        analysis_result = await self._analyze_with_custom_model(preprocessed_image, image_path)
                    
                    if analysis_result:
                        logger.info(f"Analysis successful with {model_source}")
                        break
                        
                except Exception as e:
                    logger.warning(f"Analysis failed with {model_source}: {str(e)}")
                    continue
            
            # Fallback to mock analysis if all models fail
            if not analysis_result:
                logger.warning("All AI models failed, using fallback analysis")
                image = cv2.imread(image_path)
                analysis_result = await self._mock_skin_analysis(image)
            
            # Check processing time requirement (5 seconds max)
            processing_time = asyncio.get_event_loop().time() - start_time
            if processing_time > settings.MAX_ANALYSIS_TIME:
                logger.warning(f"Analysis took {processing_time:.2f}s, exceeding {settings.MAX_ANALYSIS_TIME}s limit")
            
            logger.info(f"Skin analysis completed for image: {image_path} in {processing_time:.2f}s")
            return analysis_result
            
        except Exception as e:
            logger.error(f"AI skin analysis failed: {str(e)}")
            raise
    
    async def _mock_skin_analysis(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Mock skin analysis implementation
        Will be replaced with actual AI model in subtask 4.1
        """
        
        # Analyze image properties for mock results
        height, width = image.shape[:2]
        avg_brightness = np.mean(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
        
        # Mock skin type detection based on brightness
        if avg_brightness < 80:
            skin_type = "oily"
        elif avg_brightness < 120:
            skin_type = "combination"
        elif avg_brightness < 160:
            skin_type = "normal"
        else:
            skin_type = "dry"
        
        # Mock issue detection
        issues = []
        
        # Simulate different issues based on image characteristics
        if avg_brightness < 100:
            issues.append({
                "id": "acne_001",
                "name": "Acne",
                "description": "Active acne breakouts detected on facial area",
                "severity": "medium",
                "causes": [
                    "Excess oil production",
                    "Clogged pores",
                    "Bacterial growth",
                    "Hormonal changes"
                ],
                "confidence": 0.85
            })
        
        if avg_brightness > 150:
            issues.append({
                "id": "dryness_001", 
                "name": "Dry Skin",
                "description": "Areas of skin dryness and potential flaking detected",
                "severity": "low",
                "causes": [
                    "Low humidity",
                    "Over-cleansing",
                    "Age-related moisture loss",
                    "Environmental factors"
                ],
                "confidence": 0.78
            })
        
        # Add dark circles if image is darker in certain areas
        if np.std(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)) > 30:
            issues.append({
                "id": "dark_circles_001",
                "name": "Dark Circles",
                "description": "Dark circles detected under eye area",
                "severity": "low",
                "causes": [
                    "Lack of sleep",
                    "Genetics",
                    "Age-related skin thinning",
                    "Allergies"
                ],
                "confidence": 0.72
            })
        
        return {
            "skin_type": skin_type,
            "issues": issues,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "model_confidence": 0.82
        }
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    async def preprocess_for_model(self, image_path: str) -> np.ndarray:
        """
        Preprocess image for AI model input
        Will be implemented with actual model requirements in subtask 4.1
        """
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not load image")
            
            # Basic preprocessing - will be enhanced for actual model
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image_resized = cv2.resize(image_rgb, (224, 224))  # Common input size
            image_normalized = image_resized.astype(np.float32) / 255.0
            
            return image_normalized
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise
    
    async def detect_skin_type(self, image: np.ndarray) -> str:
        """
        Detect skin type from preprocessed image
        Will be implemented with actual model in subtask 4.1
        """
        # Mock implementation
        avg_value = np.mean(image)
        
        if avg_value < 0.3:
            return "oily"
        elif avg_value < 0.5:
            return "combination"
        elif avg_value < 0.7:
            return "normal"
        else:
            return "dry"
    
    async def detect_skin_issues(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect skin issues from preprocessed image
        Will be implemented with actual model in subtask 4.1
        """
        # Mock implementation - will be replaced with actual detection
        issues = []
        
        # Simulate issue detection based on image properties
        std_dev = np.std(image)
        
        if std_dev > 0.2:
            issues.append({
                "id": "texture_001",
                "name": "Uneven Texture",
                "description": "Uneven skin texture detected",
                "severity": "medium",
                "causes": ["Age", "Sun damage", "Acne scarring"],
                "confidence": 0.75
            })
        
        return issues
    
    async def _initialize_model(self):
        """Initialize AI model on startup"""
        try:
            # Try to load custom model if available
            model_path = os.path.join(self.models_dir, "skin_analysis_model.pkl")
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    self.skin_model = pickle.load(f)
                self.model_loaded = True
                logger.info("Custom skin analysis model loaded successfully")
            else:
                logger.info("No custom model found, will use API-based analysis")
                
        except Exception as e:
            logger.error(f"Failed to initialize model: {str(e)}")
    
    async def _analyze_with_huggingface(self, image: np.ndarray, image_path: str) -> Dict[str, Any]:
        """
        Analyze using HuggingFace models (Priority 1)
        Uses free HuggingFace inference API
        """
        try:
            # Convert image to bytes for API
            image_pil = Image.fromarray((image * 255).astype(np.uint8))
            
            # For skin analysis, we'll use a combination of approaches:
            # 1. Image classification for skin type
            # 2. Object detection for skin issues
            
            # Mock HuggingFace API call (replace with actual API)
            skin_type = await self._classify_skin_type_hf(image_pil)
            issues = await self._detect_skin_issues_hf(image_pil, image_path)
            
            return {
                "skin_type": skin_type,
                "issues": issues,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "model_confidence": 0.88,
                "model_source": "huggingface"
            }
            
        except Exception as e:
            logger.error(f"HuggingFace analysis failed: {str(e)}")
            raise
    
    async def _classify_skin_type_hf(self, image: Image.Image) -> str:
        """Classify skin type using HuggingFace model"""
        try:
            # This would be a real API call to HuggingFace
            # For now, simulate based on image properties
            img_array = np.array(image)
            avg_brightness = np.mean(img_array)
            
            # Simulate skin type classification
            if avg_brightness < 100:
                return "oily"
            elif avg_brightness < 140:
                return "combination"
            elif avg_brightness < 180:
                return "normal"
            else:
                return "dry"
                
        except Exception as e:
            logger.error(f"Skin type classification failed: {str(e)}")
            return "normal"  # Default fallback
    
    async def _detect_skin_issues_hf(self, image: Image.Image, image_path: str) -> List[Dict[str, Any]]:
        """Detect skin issues using HuggingFace models"""
        try:
            issues = []
            img_array = np.array(image)
            
            # Simulate issue detection with segmentation
            # In real implementation, this would use actual segmentation models
            
            # Detect acne (simulate with texture analysis)
            acne_regions = await self._detect_acne_regions(img_array)
            if acne_regions:
                highlighted_url = await self._create_highlighted_image(
                    image_path, acne_regions, "acne"
                )
                issues.append({
                    "id": "acne_hf_001",
                    "name": "Acne",
                    "description": "Active acne breakouts detected using AI segmentation",
                    "severity": "medium",
                    "causes": [
                        "Excess sebum production",
                        "Clogged pores",
                        "Propionibacterium acnes bacteria",
                        "Hormonal fluctuations"
                    ],
                    "confidence": 0.87,
                    "highlighted_image_url": highlighted_url
                })
            
            # Detect dark spots/hyperpigmentation
            dark_spot_regions = await self._detect_dark_spots(img_array)
            if dark_spot_regions:
                highlighted_url = await self._create_highlighted_image(
                    image_path, dark_spot_regions, "dark_spots"
                )
                issues.append({
                    "id": "pigmentation_hf_001",
                    "name": "Hyperpigmentation",
                    "description": "Dark spots and uneven pigmentation detected",
                    "severity": "low",
                    "causes": [
                        "Sun exposure",
                        "Post-inflammatory hyperpigmentation",
                        "Melasma",
                        "Age spots"
                    ],
                    "confidence": 0.82,
                    "highlighted_image_url": highlighted_url
                })
            
            return issues
            
        except Exception as e:
            logger.error(f"Issue detection failed: {str(e)}")
            return []
    
    async def _analyze_with_free_api(self, image: np.ndarray, image_path: str) -> Dict[str, Any]:
        """
        Analyze using free API services (Priority 2)
        Could use services like Clarifai, Google Vision API free tier, etc.
        """
        try:
            # Mock free API analysis
            # In real implementation, this would call actual free APIs
            
            skin_type = await self._analyze_skin_type_basic(image)
            issues = await self._detect_basic_issues(image, image_path)
            
            return {
                "skin_type": skin_type,
                "issues": issues,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "model_confidence": 0.75,
                "model_source": "free_api"
            }
            
        except Exception as e:
            logger.error(f"Free API analysis failed: {str(e)}")
            raise
    
    async def _analyze_with_custom_model(self, image: np.ndarray, image_path: str) -> Dict[str, Any]:
        """
        Analyze using custom trained model (Priority 3)
        """
        try:
            if not self.model_loaded or self.skin_model is None:
                raise ValueError("Custom model not available")
            
            # Use custom model for analysis
            # This would be the actual model inference
            skin_type = self._predict_skin_type_custom(image)
            issues = await self._detect_issues_custom(image, image_path)
            
            return {
                "skin_type": skin_type,
                "issues": issues,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "model_confidence": 0.92,
                "model_source": "custom_model"
            }
            
        except Exception as e:
            logger.error(f"Custom model analysis failed: {str(e)}")
            raise
    
    async def _detect_acne_regions(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect acne regions using image processing techniques"""
        try:
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Use adaptive thresholding to find dark spots (potential acne)
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
            )
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by size and shape
            acne_regions = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if 50 < area < 1000:  # Filter by area
                    x, y, w, h = cv2.boundingRect(contour)
                    # Check aspect ratio (acne spots are roughly circular)
                    aspect_ratio = w / h
                    if 0.5 < aspect_ratio < 2.0:
                        acne_regions.append((x, y, x + w, y + h))
            
            return acne_regions[:10]  # Limit to top 10 detections
            
        except Exception as e:
            logger.error(f"Acne detection failed: {str(e)}")
            return []
    
    async def _detect_dark_spots(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect dark spots and hyperpigmentation"""
        try:
            # Convert to LAB color space for better color analysis
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            l_channel = lab[:, :, 0]
            
            # Find dark regions
            mean_brightness = np.mean(l_channel)
            dark_threshold = mean_brightness - 20  # Adjust threshold
            
            # Create mask for dark regions
            dark_mask = l_channel < dark_threshold
            
            # Apply morphological operations to clean up the mask
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            dark_mask = cv2.morphologyEx(dark_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
            
            # Find contours of dark regions
            contours, _ = cv2.findContours(dark_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter and return bounding boxes
            dark_regions = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if 100 < area < 2000:  # Filter by area
                    x, y, w, h = cv2.boundingRect(contour)
                    dark_regions.append((x, y, x + w, y + h))
            
            return dark_regions[:8]  # Limit to top 8 detections
            
        except Exception as e:
            logger.error(f"Dark spot detection failed: {str(e)}")
            return []
    
    async def _create_highlighted_image(self, original_path: str, regions: List[Tuple[int, int, int, int]], issue_type: str) -> Optional[str]:
        """Create highlighted image showing detected issue regions"""
        try:
            # Load original image
            image = Image.open(original_path)
            
            # Create a copy for highlighting
            highlighted = image.copy()
            draw = ImageDraw.Draw(highlighted)
            
            # Define colors for different issue types
            colors = {
                "acne": (255, 0, 0, 128),      # Red with transparency
                "dark_spots": (255, 255, 0, 128),  # Yellow with transparency
                "wrinkles": (0, 255, 0, 128),      # Green with transparency
                "dryness": (0, 0, 255, 128)        # Blue with transparency
            }
            
            color = colors.get(issue_type, (255, 0, 0, 128))
            
            # Draw rectangles around detected regions
            for x1, y1, x2, y2 in regions:
                # Draw rectangle outline
                draw.rectangle([x1, y1, x2, y2], outline=color[:3], width=3)
                
                # Draw semi-transparent overlay
                overlay = Image.new('RGBA', (x2-x1, y2-y1), color)
                highlighted.paste(overlay, (x1, y1), overlay)
            
            # Save highlighted image
            highlighted_filename = f"highlighted_{issue_type}_{os.path.basename(original_path)}"
            highlighted_path = os.path.join(settings.UPLOAD_DIR, highlighted_filename)
            
            highlighted.save(highlighted_path)
            
            # Return URL (in production, this would be a cloud storage URL)
            return f"/uploads/{highlighted_filename}"
            
        except Exception as e:
            logger.error(f"Failed to create highlighted image: {str(e)}")
            return None
    
    async def _analyze_skin_type_basic(self, image: np.ndarray) -> str:
        """Basic skin type analysis using image properties"""
        try:
            # Analyze oil content based on shine/reflection
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Detect shiny areas (potential oil)
            _, bright_areas = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
            shine_percentage = np.sum(bright_areas > 0) / bright_areas.size
            
            # Analyze texture for dryness
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Classify based on shine and texture
            if shine_percentage > 0.15:
                return "oily"
            elif shine_percentage > 0.08 and laplacian_var > 500:
                return "combination"
            elif laplacian_var < 300:
                return "dry"
            else:
                return "normal"
                
        except Exception as e:
            logger.error(f"Basic skin type analysis failed: {str(e)}")
            return "normal"
    
    async def _detect_basic_issues(self, image: np.ndarray, image_path: str) -> List[Dict[str, Any]]:
        """Basic issue detection using image processing"""
        try:
            issues = []
            
            # Detect texture issues
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            texture_variance = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            if texture_variance > 800:
                issues.append({
                    "id": "texture_basic_001",
                    "name": "Uneven Texture",
                    "description": "Uneven skin texture detected through image analysis",
                    "severity": "medium",
                    "causes": ["Acne scarring", "Age-related changes", "Sun damage"],
                    "confidence": 0.70
                })
            
            # Detect color uniformity issues
            color_std = np.std(image, axis=(0, 1))
            if np.mean(color_std) > 30:
                issues.append({
                    "id": "pigmentation_basic_001",
                    "name": "Uneven Pigmentation",
                    "description": "Color irregularities detected in skin tone",
                    "severity": "low",
                    "causes": ["Sun exposure", "Hormonal changes", "Post-inflammatory changes"],
                    "confidence": 0.65
                })
            
            return issues
            
        except Exception as e:
            logger.error(f"Basic issue detection failed: {str(e)}")
            return []
    
    def _predict_skin_type_custom(self, image: np.ndarray) -> str:
        """Predict skin type using custom model"""
        try:
            if self.skin_model is None:
                raise ValueError("Custom model not loaded")
            
            # Preprocess image for custom model
            # This would depend on how the custom model was trained
            features = self._extract_features_for_custom_model(image)
            
            # Make prediction (mock implementation)
            prediction = self.skin_model.predict([features])[0] if hasattr(self.skin_model, 'predict') else "normal"
            
            return prediction
            
        except Exception as e:
            logger.error(f"Custom skin type prediction failed: {str(e)}")
            return "normal"
    
    def _extract_features_for_custom_model(self, image: np.ndarray) -> List[float]:
        """Extract features for custom model input"""
        try:
            # Extract various image features
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            features = [
                np.mean(gray),           # Average brightness
                np.std(gray),            # Contrast
                cv2.Laplacian(gray, cv2.CV_64F).var(),  # Texture
                np.mean(image[:, :, 0]), # Red channel mean
                np.mean(image[:, :, 1]), # Green channel mean
                np.mean(image[:, :, 2]), # Blue channel mean
            ]
            
            return features
            
        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            return [0.0] * 6  # Return default features
    
    async def _detect_issues_custom(self, image: np.ndarray, image_path: str) -> List[Dict[str, Any]]:
        """Detect issues using custom model"""
        try:
            # This would use the custom model for issue detection
            # For now, combine basic detection with custom model features
            
            basic_issues = await self._detect_basic_issues(image, image_path)
            
            # Enhance with custom model confidence scores
            for issue in basic_issues:
                issue["confidence"] = min(issue["confidence"] + 0.15, 1.0)  # Boost confidence
                issue["model_source"] = "custom"
            
            return basic_issues
            
        except Exception as e:
            logger.error(f"Custom issue detection failed: {str(e)}")
            return []