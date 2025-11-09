"""
Post-Processor for ML model outputs.

Handles processing of raw model predictions into API response format,
including confidence filtering, result formatting, and highlighted image generation.
"""

import logging
import uuid
import time
from typing import Dict, Any, List, Optional
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import cv2

from app.ml.exceptions import PostprocessingError, ValidationError
from app.ml.logging_utils import MLLogger

logger = logging.getLogger(__name__)


class PostProcessor:
    """
    Post-processes model outputs into API response format.
    
    Handles confidence thresholding, result formatting, and visualization
    of detected skin issues through highlighted images.
    """
    
    # Issue type mappings with descriptions and severity levels
    ISSUE_METADATA = {
        "acne": {
            "name": "Acne",
            "description": "Inflammatory skin condition characterized by pimples, blackheads, and whiteheads",
            "causes": [
                "Excess oil production",
                "Clogged hair follicles",
                "Bacteria",
                "Hormonal changes",
                "Diet and stress"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "dark_spots": {
            "name": "Dark Spots",
            "description": "Hyperpigmentation or age spots appearing as darker patches on the skin",
            "causes": [
                "Sun exposure",
                "Aging",
                "Hormonal changes",
                "Post-inflammatory hyperpigmentation",
                "Melasma"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "wrinkles": {
            "name": "Wrinkles",
            "description": "Fine lines and creases in the skin due to aging and environmental factors",
            "causes": [
                "Natural aging process",
                "Sun exposure",
                "Smoking",
                "Repeated facial expressions",
                "Dehydration"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "redness": {
            "name": "Redness",
            "description": "Skin redness or inflammation that may indicate irritation or sensitivity",
            "causes": [
                "Rosacea",
                "Allergic reactions",
                "Skin irritation",
                "Sun damage",
                "Eczema or dermatitis"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "dryness": {
            "name": "Dryness",
            "description": "Lack of moisture in the skin leading to flaking and rough texture",
            "causes": [
                "Low humidity",
                "Hot showers",
                "Harsh soaps",
                "Aging",
                "Medical conditions"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "oiliness": {
            "name": "Oiliness",
            "description": "Excess sebum production leading to shiny, greasy skin",
            "causes": [
                "Overactive sebaceous glands",
                "Hormonal changes",
                "Genetics",
                "Humid climate",
                "Stress"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "enlarged_pores": {
            "name": "Enlarged Pores",
            "description": "Visible, dilated pores that appear larger than normal",
            "causes": [
                "Excess oil production",
                "Aging and loss of skin elasticity",
                "Sun damage",
                "Genetics",
                "Clogged pores"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        },
        "uneven_tone": {
            "name": "Uneven Skin Tone",
            "description": "Irregular skin coloration with patches of different tones",
            "causes": [
                "Sun exposure",
                "Hyperpigmentation",
                "Scarring",
                "Hormonal changes",
                "Aging"
            ],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        }
    }
    
    def __init__(self, confidence_threshold: float = 0.7, output_dir: str = "./uploads"):
        """
        Initialize post-processor with configuration.
        
        Args:
            confidence_threshold: Minimum confidence score to include predictions (0.0-1.0)
            output_dir: Directory to save highlighted images
        """
        self.confidence_threshold = confidence_threshold
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize structured logger
        self._logger = MLLogger("PostProcessor")
        
        self._logger.log_operation_complete(
            "initialization",
            0.0,
            confidence_threshold=confidence_threshold,
            output_dir=str(output_dir)
        )
    
    def process_predictions(
        self,
        predictions: Dict[str, Any],
        original_image: Image.Image,
        analysis_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process raw model predictions into API response format.
        
        Converts model outputs into structured SkinIssue objects with metadata,
        filters low-confidence predictions, and generates highlighted images.
        
        Args:
            predictions: Raw predictions from ModelManager containing:
                - skin_type: str
                - skin_type_confidence: float
                - issues: Dict[str, float]
                - confidence_scores: Dict[str, float]
            original_image: Original PIL Image for visualization
            analysis_id: Optional analysis ID for file naming
            
        Returns:
            Dictionary containing:
                - skin_type: str
                - issues: List[Dict] - Formatted SkinIssue objects
                - highlighted_images: Dict[str, str] - Paths to highlighted images
                - metadata: Dict - Processing metadata
                
        Raises:
            PostprocessingError: If post-processing fails
        """
        if analysis_id is None:
            analysis_id = str(uuid.uuid4())
        
        start_time = time.time()
        
        try:
            self._logger.log_operation_start(
                "process_predictions",
                analysis_id=analysis_id,
                skin_type=predictions.get("skin_type"),
                num_raw_issues=len(predictions.get("issues", {}))
            )
            
            # Extract predictions
            skin_type = predictions.get("skin_type", "unknown")
            raw_issues = predictions.get("issues", {})
            
            # Filter low-confidence issues
            filtered_issues = self.filter_low_confidence(raw_issues, self.confidence_threshold)
            
            # Format issues into SkinIssue objects
            formatted_issues = []
            highlighted_images = {}
            
            for issue_type, confidence in filtered_issues.items():
                # Create SkinIssue object
                issue = self._create_skin_issue(issue_type, confidence, analysis_id)
                
                # Generate highlighted image for this issue
                try:
                    highlighted_path = self.generate_highlighted_image(
                        original_image,
                        issue_type,
                        confidence,
                        analysis_id
                    )
                    issue["highlighted_image_url"] = highlighted_path
                    highlighted_images[issue_type] = highlighted_path
                    self._logger.log_metric(
                        "highlighted_image_generated",
                        1,
                        issue_type=issue_type
                    )
                except Exception as e:
                    self._logger.log_warning(
                        f"Failed to generate highlighted image for {issue_type}",
                        error=str(e)
                    )
                    issue["highlighted_image_url"] = None
                
                formatted_issues.append(issue)
            
            # Sort issues by confidence (highest first)
            formatted_issues.sort(key=lambda x: x["confidence"], reverse=True)
            
            result = {
                "skin_type": skin_type,
                "issues": formatted_issues,
                "highlighted_images": highlighted_images,
                "metadata": {
                    "total_issues_detected": len(formatted_issues),
                    "confidence_threshold": self.confidence_threshold,
                    "analysis_id": analysis_id,
                    "skin_type_confidence": predictions.get("skin_type_confidence", 0.0)
                }
            }
            
            duration = time.time() - start_time
            self._logger.log_operation_complete(
                "process_predictions",
                duration,
                analysis_id=analysis_id,
                num_issues=len(formatted_issues),
                num_highlighted=len(highlighted_images)
            )
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self._logger.log_error("process_predictions", e, duration=duration)
            raise PostprocessingError(
                "Failed to process predictions",
                original_exception=e
            )
    
    def filter_low_confidence(
        self,
        issues: Dict[str, float],
        threshold: Optional[float] = None
    ) -> Dict[str, float]:
        """
        Filter out predictions below confidence threshold.
        
        Args:
            issues: Dictionary mapping issue names to confidence scores
            threshold: Optional custom threshold (uses instance threshold if None)
            
        Returns:
            Filtered dictionary with only high-confidence predictions
        """
        if threshold is None:
            threshold = self.confidence_threshold
        
        filtered = {
            issue: confidence
            for issue, confidence in issues.items()
            if confidence >= threshold
        }
        
        logger.debug(f"Filtered {len(issues)} issues to {len(filtered)} above threshold {threshold}")
        
        return filtered
    
    def _create_skin_issue(
        self,
        issue_type: str,
        confidence: float,
        analysis_id: str
    ) -> Dict[str, Any]:
        """
        Create a formatted SkinIssue object from raw prediction.
        
        Args:
            issue_type: Type of skin issue (e.g., "acne", "dark_spots")
            confidence: Confidence score (0.0-1.0)
            analysis_id: Analysis ID for unique issue identification
            
        Returns:
            Dictionary representing a SkinIssue object
        """
        # Get metadata for this issue type
        metadata = self.ISSUE_METADATA.get(issue_type, {
            "name": issue_type.replace("_", " ").title(),
            "description": f"Detected {issue_type.replace('_', ' ')}",
            "causes": ["Unknown"],
            "severity_thresholds": {"low": 0.7, "medium": 0.8, "high": 0.9}
        })
        
        # Determine severity based on confidence
        severity = self._calculate_severity(confidence, metadata["severity_thresholds"])
        
        # Create unique issue ID
        issue_id = f"{analysis_id}_{issue_type}"
        
        return {
            "id": issue_id,
            "name": metadata["name"],
            "description": metadata["description"],
            "severity": severity,
            "causes": metadata["causes"],
            "confidence": round(confidence, 3),
            "highlighted_image_url": None  # Will be set later
        }
    
    def _calculate_severity(
        self,
        confidence: float,
        thresholds: Dict[str, float]
    ) -> str:
        """
        Calculate severity level based on confidence score.
        
        Args:
            confidence: Confidence score (0.0-1.0)
            thresholds: Dictionary with severity thresholds
            
        Returns:
            Severity level: "low", "medium", or "high"
        """
        if confidence >= thresholds.get("high", 0.9):
            return "high"
        elif confidence >= thresholds.get("medium", 0.8):
            return "medium"
        else:
            return "low"
    
    def generate_highlighted_image(
        self,
        image: Image.Image,
        issue_type: str,
        confidence: float,
        analysis_id: str,
        attention_map: Optional[np.ndarray] = None
    ) -> str:
        """
        Generate highlighted image showing detected issue areas.
        
        Creates a visualization overlay on the original image to highlight
        areas where the skin issue was detected. If no attention map is provided,
        generates a generic highlight based on the issue type.
        
        Args:
            image: Original PIL Image
            issue_type: Type of skin issue to highlight
            confidence: Confidence score for the detection
            analysis_id: Analysis ID for file naming
            attention_map: Optional attention/heatmap from model (H, W) array
            
        Returns:
            Path to the saved highlighted image
        """
        # Create a copy of the image
        highlighted = image.copy()
        
        if attention_map is not None:
            # Use provided attention map
            highlighted = self._apply_attention_map(highlighted, attention_map, issue_type)
        else:
            # Generate generic highlight overlay
            highlighted = self._apply_generic_highlight(highlighted, issue_type, confidence)
        
        # Save highlighted image
        filename = f"highlighted_{issue_type}_{analysis_id}.png"
        output_path = self.output_dir / filename
        
        highlighted.save(output_path, format="PNG")
        logger.debug(f"Saved highlighted image: {output_path}")
        
        return str(output_path)
    
    def _apply_attention_map(
        self,
        image: Image.Image,
        attention_map: np.ndarray,
        issue_type: str
    ) -> Image.Image:
        """
        Apply attention/heatmap overlay to image.
        
        Args:
            image: PIL Image
            attention_map: Attention map array (H, W) with values 0-1
            issue_type: Type of issue for color selection
            
        Returns:
            Image with attention map overlay
        """
        # Convert image to numpy array
        img_array = np.array(image)
        
        # Resize attention map to match image dimensions
        attention_resized = cv2.resize(
            attention_map,
            (img_array.shape[1], img_array.shape[0]),
            interpolation=cv2.INTER_LINEAR
        )
        
        # Normalize attention map to 0-255
        attention_normalized = (attention_resized * 255).astype(np.uint8)
        
        # Apply colormap (red for issues)
        heatmap = cv2.applyColorMap(attention_normalized, cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        
        # Blend with original image
        alpha = 0.4  # Transparency
        blended = cv2.addWeighted(img_array, 1 - alpha, heatmap, alpha, 0)
        
        return Image.fromarray(blended)
    
    def _apply_generic_highlight(
        self,
        image: Image.Image,
        issue_type: str,
        confidence: float
    ) -> Image.Image:
        """
        Apply generic highlight overlay when no attention map is available.
        
        Creates a subtle overlay with issue-specific color and adds
        a label indicating the detected issue.
        
        Args:
            image: PIL Image
            issue_type: Type of issue
            confidence: Confidence score
            
        Returns:
            Image with generic highlight overlay
        """
        # Create a semi-transparent overlay
        overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Define colors for different issue types
        issue_colors = {
            "acne": (255, 100, 100, 80),  # Red
            "dark_spots": (139, 69, 19, 80),  # Brown
            "wrinkles": (255, 215, 0, 60),  # Gold
            "redness": (255, 0, 0, 70),  # Bright red
            "dryness": (173, 216, 230, 70),  # Light blue
            "oiliness": (255, 255, 0, 70),  # Yellow
            "enlarged_pores": (255, 165, 0, 70),  # Orange
            "uneven_tone": (218, 165, 32, 70)  # Goldenrod
        }
        
        color = issue_colors.get(issue_type, (255, 255, 255, 80))
        
        # Add a subtle border highlight
        border_width = 10
        draw.rectangle(
            [(0, 0), (image.size[0], image.size[1])],
            outline=color[:3] + (150,),
            width=border_width
        )
        
        # Add label at the top
        label_text = f"{issue_type.replace('_', ' ').title()} ({confidence:.1%})"
        label_height = 40
        draw.rectangle(
            [(0, 0), (image.size[0], label_height)],
            fill=(0, 0, 0, 180)
        )
        
        # Note: For production, use ImageFont for better text rendering
        # For now, we'll use default font
        text_position = (10, 10)
        draw.text(text_position, label_text, fill=(255, 255, 255, 255))
        
        # Convert original image to RGBA
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # Composite overlay onto image
        highlighted = Image.alpha_composite(image, overlay)
        
        # Convert back to RGB
        return highlighted.convert('RGB')
    
    def batch_process_predictions(
        self,
        batch_predictions: List[Dict[str, Any]],
        batch_images: List[Image.Image],
        analysis_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Process multiple predictions in batch.
        
        Args:
            batch_predictions: List of prediction dictionaries
            batch_images: List of original images
            analysis_ids: Optional list of analysis IDs
            
        Returns:
            List of processed results
        """
        if analysis_ids is None:
            analysis_ids = [str(uuid.uuid4()) for _ in batch_predictions]
        
        results = []
        for pred, img, aid in zip(batch_predictions, batch_images, analysis_ids):
            result = self.process_predictions(pred, img, aid)
            results.append(result)
        
        logger.info(f"Batch processed {len(results)} predictions")
        
        return results
    
    def get_issue_statistics(self, processed_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics across multiple processed results.
        
        Args:
            processed_results: List of processed prediction results
            
        Returns:
            Dictionary with aggregated statistics
        """
        total_analyses = len(processed_results)
        issue_counts = {}
        skin_type_counts = {}
        avg_confidence_by_issue = {}
        
        for result in processed_results:
            # Count skin types
            skin_type = result.get("skin_type", "unknown")
            skin_type_counts[skin_type] = skin_type_counts.get(skin_type, 0) + 1
            
            # Count issues and track confidence
            for issue in result.get("issues", []):
                issue_name = issue["name"]
                issue_counts[issue_name] = issue_counts.get(issue_name, 0) + 1
                
                if issue_name not in avg_confidence_by_issue:
                    avg_confidence_by_issue[issue_name] = []
                avg_confidence_by_issue[issue_name].append(issue["confidence"])
        
        # Calculate average confidence
        for issue_name in avg_confidence_by_issue:
            confidences = avg_confidence_by_issue[issue_name]
            avg_confidence_by_issue[issue_name] = sum(confidences) / len(confidences)
        
        return {
            "total_analyses": total_analyses,
            "skin_type_distribution": skin_type_counts,
            "issue_frequency": issue_counts,
            "average_confidence_by_issue": avg_confidence_by_issue
        }
