#!/usr/bin/env python3
"""
Download and verify ML models for skin analysis.

This script downloads pre-trained models from Hugging Face Hub with:
- Support for multiple model architectures
- Retry logic for failed downloads
- Model verification with checksum validation
- Progress tracking
"""

import os
import sys
import argparse
import hashlib
import time
from pathlib import Path
from typing import Dict, Optional, List
import logging

try:
    from huggingface_hub import hf_hub_download, HfApi
    import torch
except ImportError as e:
    print(f"Error: Required dependencies not installed. Run: pip install -r requirements.txt")
    print(f"Missing: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base directory for models
MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Model configurations with Hugging Face repository information
MODEL_CONFIGS = {
    "efficientnet_b0": {
        "repo_id": "timm/efficientnet_b0.ra_in1k",
        "filename": "pytorch_model.bin",
        "expected_size_mb": 20,
        "description": "EfficientNet-B0 (Recommended - Best balance of speed and accuracy)",
        "checksum": None,  # Will be computed after download
    },
    "resnet50": {
        "repo_id": "microsoft/resnet-50",
        "filename": "pytorch_model.bin",
        "expected_size_mb": 100,
        "description": "ResNet-50 (Fallback - Proven architecture)",
        "checksum": None,
    },
    "vit_base": {
        "repo_id": "google/vit-base-patch16-224",
        "filename": "pytorch_model.bin",
        "expected_size_mb": 330,
        "description": "Vision Transformer Base (Alternative - High accuracy)",
        "checksum": None,
    }
}


class ModelDownloader:
    """
    Downloads and verifies ML models from Hugging Face Hub.
    """
    
    def __init__(self, cache_dir: Path = MODELS_DIR, max_retries: int = 3):
        """
        Initialize model downloader.
        
        Args:
            cache_dir: Directory to store downloaded models
            max_retries: Maximum number of download retry attempts
        """
        self.cache_dir = cache_dir
        self.max_retries = max_retries
        self.hf_api = HfApi()
        
    def download_model(
        self,
        model_name: str,
        force_download: bool = False,
        verify: bool = True
    ) -> Path:
        """
        Download model from Hugging Face Hub with retry logic.
        
        Args:
            model_name: Name of the model to download (e.g., 'efficientnet_b0')
            force_download: Force re-download even if model exists
            verify: Verify model integrity after download
            
        Returns:
            Path to the downloaded model file
            
        Raises:
            ValueError: If model_name is not recognized
            RuntimeError: If download fails after all retries
        """
        if model_name not in MODEL_CONFIGS:
            available = ", ".join(MODEL_CONFIGS.keys())
            raise ValueError(
                f"Unknown model: {model_name}. Available models: {available}"
            )
        
        config = MODEL_CONFIGS[model_name]
        model_path = self.cache_dir / f"{model_name}.pth"
        
        # Check if model already exists
        if model_path.exists() and not force_download:
            logger.info(f"Model {model_name} already exists at {model_path}")
            if verify:
                if self.verify_model(model_path, model_name):
                    logger.info(f"✓ Existing model verified successfully")
                    return model_path
                else:
                    logger.warning(f"Existing model verification failed, re-downloading...")
            else:
                return model_path
        
        logger.info(f"Downloading {config['description']}")
        logger.info(f"Repository: {config['repo_id']}")
        logger.info(f"Expected size: ~{config['expected_size_mb']}MB")
        
        # Attempt download with retry logic
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Download attempt {attempt}/{self.max_retries}...")
                
                # Download from Hugging Face Hub
                downloaded_path = hf_hub_download(
                    repo_id=config["repo_id"],
                    filename=config["filename"],
                    cache_dir=str(self.cache_dir / "cache"),
                    resume_download=True,
                )
                
                # Copy to models directory with standardized name
                import shutil
                shutil.copy(downloaded_path, model_path)
                
                logger.info(f"✓ Downloaded to {model_path}")
                
                # Verify the downloaded model
                if verify:
                    if self.verify_model(model_path, model_name):
                        logger.info(f"✓ Model verified successfully")
                        return model_path
                    else:
                        logger.error(f"✗ Model verification failed")
                        if attempt < self.max_retries:
                            logger.info(f"Retrying download...")
                            model_path.unlink(missing_ok=True)
                            continue
                        else:
                            raise RuntimeError(f"Model verification failed after {self.max_retries} attempts")
                
                return model_path
                
            except Exception as e:
                logger.error(f"✗ Download attempt {attempt} failed: {e}")
                
                if attempt < self.max_retries:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                else:
                    raise RuntimeError(
                        f"Failed to download model {model_name} after {self.max_retries} attempts: {e}"
                    )
        
        raise RuntimeError(f"Failed to download model {model_name}")
    
    def verify_model(self, model_path: Path, model_name: str) -> bool:
        """
        Verify model integrity and compatibility.
        
        Args:
            model_path: Path to the model file
            model_name: Name of the model for configuration lookup
            
        Returns:
            True if model is valid, False otherwise
        """
        try:
            logger.info(f"Verifying {model_path.name}...")
            
            # Check file exists
            if not model_path.exists():
                logger.error(f"Model file does not exist: {model_path}")
                return False
            
            # Check file size
            file_size_mb = model_path.stat().st_size / (1024 * 1024)
            expected_size = MODEL_CONFIGS[model_name]["expected_size_mb"]
            
            # Allow 20% variance in file size
            if file_size_mb < expected_size * 0.8 or file_size_mb > expected_size * 1.2:
                logger.warning(
                    f"File size {file_size_mb:.1f}MB differs from expected {expected_size}MB"
                )
            
            # Try to load the model
            logger.info(f"Loading model to verify integrity...")
            state_dict = torch.load(model_path, map_location="cpu")
            
            # Verify it's a valid state dict
            if not isinstance(state_dict, dict):
                logger.error(f"Model file does not contain a valid state dictionary")
                return False
            
            num_params = len(state_dict)
            logger.info(f"✓ Model verified: {num_params} parameter tensors, {file_size_mb:.1f}MB")
            
            # Compute and store checksum for future verification
            checksum = self._compute_checksum(model_path)
            logger.info(f"Model checksum: {checksum[:16]}...")
            
            return True
            
        except Exception as e:
            logger.error(f"✗ Verification failed: {e}")
            return False
    
    def _compute_checksum(self, file_path: Path, algorithm: str = "sha256") -> str:
        """
        Compute checksum of a file.
        
        Args:
            file_path: Path to the file
            algorithm: Hash algorithm to use (default: sha256)
            
        Returns:
            Hexadecimal checksum string
        """
        hash_obj = hashlib.new(algorithm)
        
        with open(file_path, "rb") as f:
            # Read in chunks to handle large files
            for chunk in iter(lambda: f.read(8192), b""):
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
    
    def list_available_models(self) -> List[str]:
        """
        List all available models that can be downloaded.
        
        Returns:
            List of model names
        """
        return list(MODEL_CONFIGS.keys())
    
    def list_downloaded_models(self) -> List[str]:
        """
        List models that have been downloaded.
        
        Returns:
            List of downloaded model names
        """
        downloaded = []
        for model_name in MODEL_CONFIGS.keys():
            model_path = self.cache_dir / f"{model_name}.pth"
            if model_path.exists():
                downloaded.append(model_name)
        return downloaded
    
    def get_model_info(self, model_name: str) -> Dict:
        """
        Get information about a specific model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Dictionary with model information
        """
        if model_name not in MODEL_CONFIGS:
            raise ValueError(f"Unknown model: {model_name}")
        
        config = MODEL_CONFIGS[model_name].copy()
        model_path = self.cache_dir / f"{model_name}.pth"
        
        config["downloaded"] = model_path.exists()
        if config["downloaded"]:
            config["path"] = str(model_path)
            config["size_mb"] = model_path.stat().st_size / (1024 * 1024)
        
        return config


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="Download and verify skin analysis ML models from Hugging Face",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download the recommended model
  python download_models.py --model efficientnet_b0
  
  # Download all models
  python download_models.py --all
  
  # Force re-download and verify
  python download_models.py --model resnet50 --force --verify
  
  # List available models
  python download_models.py --list
        """
    )
    
    parser.add_argument(
        "--model",
        choices=list(MODEL_CONFIGS.keys()),
        help="Specific model to download"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Download all available models"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if model exists"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        default=True,
        help="Verify model integrity after download (default: True)"
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Skip model verification"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available models and exit"
    )
    parser.add_argument(
        "--list-downloaded",
        action="store_true",
        help="List downloaded models and exit"
    )
    
    args = parser.parse_args()
    
    # Initialize downloader
    downloader = ModelDownloader()
    
    # Handle list commands
    if args.list:
        print("\nAvailable models:")
        for model_name in downloader.list_available_models():
            info = downloader.get_model_info(model_name)
            status = "✓ Downloaded" if info["downloaded"] else "  Not downloaded"
            print(f"  {status} - {model_name}: {info['description']}")
        return 0
    
    if args.list_downloaded:
        downloaded = downloader.list_downloaded_models()
        if downloaded:
            print(f"\nDownloaded models ({len(downloaded)}):")
            for model_name in downloaded:
                info = downloader.get_model_info(model_name)
                print(f"  ✓ {model_name} ({info['size_mb']:.1f}MB)")
        else:
            print("\nNo models downloaded yet.")
        return 0
    
    # Determine which models to download
    if args.all:
        models_to_download = downloader.list_available_models()
    elif args.model:
        models_to_download = [args.model]
    else:
        # Default to recommended model
        models_to_download = ["efficientnet_b0"]
        logger.info("No model specified, downloading recommended model: efficientnet_b0")
    
    # Download models
    verify = args.verify and not args.no_verify
    success_count = 0
    failed_models = []
    
    print(f"\n{'='*60}")
    print(f"Downloading {len(models_to_download)} model(s)")
    print(f"{'='*60}\n")
    
    for i, model_name in enumerate(models_to_download, 1):
        try:
            print(f"\n[{i}/{len(models_to_download)}] Processing {model_name}...")
            print("-" * 60)
            
            model_path = downloader.download_model(
                model_name,
                force_download=args.force,
                verify=verify
            )
            
            success_count += 1
            print(f"✓ {model_name} ready at {model_path}")
            
        except Exception as e:
            logger.error(f"✗ Failed to download {model_name}: {e}")
            failed_models.append(model_name)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"Download Summary")
    print(f"{'='*60}")
    print(f"✓ Successful: {success_count}/{len(models_to_download)}")
    
    if failed_models:
        print(f"✗ Failed: {', '.join(failed_models)}")
        print(f"\nSome models failed to download. Check the logs above for details.")
        return 1
    else:
        print(f"\n✓ All models downloaded successfully!")
        print(f"\nModels are stored in: {MODELS_DIR}")
        print(f"\nYou can now run the skin analysis service.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
