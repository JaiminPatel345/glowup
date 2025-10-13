"""
Configuration File
All configurable parameters for the video processing pipeline
"""

import os
from pathlib import Path


class Config:
    """Configuration for video processing pipeline"""
    
    # ===== Camera Capture Settings =====
    CAMERA_MAX_DURATION = 10  # Maximum recording duration in seconds
    CAMERA_FPS = 30  # Camera capture FPS
    CAMERA_RESOLUTION = (640, 480)  # Camera resolution (width, height)
    
    # ===== Video Preprocessing Settings =====
    PREPROCESS_TARGET_FPS = 5  # Target FPS for HairGAN processing (lower = faster)
    PREPROCESS_RESIZE_WIDTH = 512  # Resize width for frames
    PREPROCESS_JPEG_QUALITY = 95  # JPEG quality for saved frames
    
    # ===== HairFastGAN Settings =====
    HAIRGAN_MODEL_PATH = None  # Path to HairFastGAN model checkpoint
    HAIRGAN_DEVICE = 'cuda'  # Device: 'cuda' or 'cpu'
    HAIRGAN_BATCH_SIZE = 1  # Batch size for processing
    REFERENCE_HAIR_IMAGE = None  # Optional reference hair style image
    
    # ===== FPS Enhancement Settings =====
    FPS_MULTIPLIER = 2  # FPS multiplier (2 = double, 3 = triple, etc.)
    FPS_INTERPOLATION_METHOD = 'optical_flow'  # 'optical_flow', 'linear', or 'duplicate'
    OUTPUT_FPS = 30  # Final output video FPS
    
    # ===== Directory Settings =====
    BASE_OUTPUT_DIR = "output"
    CAPTURED_VIDEO_NAME = "captured_video.mp4"
    PREPROCESSED_FRAMES_DIR = "preprocessed_frames"
    PROCESSED_FRAMES_DIR = "processed_frames"
    ENHANCED_FRAMES_DIR = "enhanced_frames"
    FINAL_VIDEO_NAME = "final_output.mp4"
    
    # ===== Performance Settings =====
    CLEANUP_INTERMEDIATE = False  # Delete intermediate frames after processing
    VERBOSE = True  # Print detailed progress information
    
    @classmethod
    def get_output_paths(cls, base_dir=None):
        """
        Get all output paths
        
        Args:
            base_dir: Base directory for outputs (uses BASE_OUTPUT_DIR if None)
            
        Returns:
            dict: Dictionary of output paths
        """
        if base_dir is None:
            base_dir = cls.BASE_OUTPUT_DIR
        
        base_path = Path(base_dir)
        
        return {
            'base_dir': str(base_path),
            'captured_video': str(base_path / cls.CAPTURED_VIDEO_NAME),
            'preprocessed_frames': str(base_path / cls.PREPROCESSED_FRAMES_DIR),
            'processed_frames': str(base_path / cls.PROCESSED_FRAMES_DIR),
            'enhanced_frames': str(base_path / cls.ENHANCED_FRAMES_DIR),
            'final_video': str(base_path / cls.FINAL_VIDEO_NAME)
        }
    
    @classmethod
    def create_output_directories(cls, base_dir=None):
        """
        Create all necessary output directories
        
        Args:
            base_dir: Base directory for outputs
        """
        paths = cls.get_output_paths(base_dir)
        
        os.makedirs(paths['base_dir'], exist_ok=True)
        os.makedirs(paths['preprocessed_frames'], exist_ok=True)
        os.makedirs(paths['processed_frames'], exist_ok=True)
        os.makedirs(paths['enhanced_frames'], exist_ok=True)
        
        if cls.VERBOSE:
            print("Created output directories:")
            for key, path in paths.items():
                if key != 'base_dir':
                    print(f"  {key}: {path}")
    
    @classmethod
    def print_config(cls):
        """Print current configuration"""
        print("\n" + "="*60)
        print("VIDEO PROCESSING PIPELINE CONFIGURATION")
        print("="*60)
        
        print("\n[Camera Capture]")
        print(f"  Max Duration: {cls.CAMERA_MAX_DURATION}s")
        print(f"  FPS: {cls.CAMERA_FPS}")
        print(f"  Resolution: {cls.CAMERA_RESOLUTION[0]}x{cls.CAMERA_RESOLUTION[1]}")
        
        print("\n[Video Preprocessing]")
        print(f"  Target FPS: {cls.PREPROCESS_TARGET_FPS}")
        print(f"  Resize Width: {cls.PREPROCESS_RESIZE_WIDTH}px")
        print(f"  JPEG Quality: {cls.PREPROCESS_JPEG_QUALITY}")
        
        print("\n[HairFastGAN]")
        print(f"  Model Path: {cls.HAIRGAN_MODEL_PATH or 'Not specified'}")
        print(f"  Device: {cls.HAIRGAN_DEVICE}")
        print(f"  Batch Size: {cls.HAIRGAN_BATCH_SIZE}")
        print(f"  Reference Hair: {cls.REFERENCE_HAIR_IMAGE or 'None'}")
        
        print("\n[FPS Enhancement]")
        print(f"  Multiplier: {cls.FPS_MULTIPLIER}x")
        print(f"  Method: {cls.FPS_INTERPOLATION_METHOD}")
        print(f"  Output FPS: {cls.OUTPUT_FPS}")
        
        print("\n[Output]")
        print(f"  Base Directory: {cls.BASE_OUTPUT_DIR}")
        print(f"  Final Video: {cls.FINAL_VIDEO_NAME}")
        print(f"  Cleanup Intermediate: {cls.CLEANUP_INTERMEDIATE}")
        
        print("\n" + "="*60 + "\n")


# Create a default config instance
default_config = Config()


# Example: Custom configuration class
class FastProcessingConfig(Config):
    """Configuration optimized for fast processing"""
    PREPROCESS_TARGET_FPS = 3
    PREPROCESS_RESIZE_WIDTH = 256
    FPS_MULTIPLIER = 2
    FPS_INTERPOLATION_METHOD = 'linear'


class HighQualityConfig(Config):
    """Configuration optimized for high quality output"""
    PREPROCESS_TARGET_FPS = 10
    PREPROCESS_RESIZE_WIDTH = 1024
    PREPROCESS_JPEG_QUALITY = 98
    FPS_MULTIPLIER = 3
    FPS_INTERPOLATION_METHOD = 'optical_flow'
    OUTPUT_FPS = 60


if __name__ == "__main__":
    # Display default configuration
    Config.print_config()
    
    # Show output paths
    print("\nOutput Paths:")
    paths = Config.get_output_paths()
    for key, path in paths.items():
        print(f"  {key}: {path}")
