#!/usr/bin/env python3
"""
QUICK REFERENCE GUIDE
Copy-paste ready code snippets for common tasks
"""

# ============================================================================
# 1. RUN COMPLETE PIPELINE (SIMPLEST)
# ============================================================================
"""
python main.py
"""

# ============================================================================
# 2. RUN WITH CUSTOM DURATION
# ============================================================================
from main import run_pipeline_custom

final_video = run_pipeline_custom(
    camera_max_duration=5,  # 5 seconds instead of 10
    output_fps=30
)

# ============================================================================
# 3. FAST PROCESSING MODE
# ============================================================================
from config import FastProcessingConfig
from main import run_pipeline

run_pipeline(output_dir="output_fast", config_class=FastProcessingConfig)

# ============================================================================
# 4. HIGH QUALITY MODE
# ============================================================================
from config import HighQualityConfig
from main import run_pipeline

run_pipeline(output_dir="output_hq", config_class=HighQualityConfig)

# ============================================================================
# 5. ONLY CAPTURE VIDEO (NO PROCESSING)
# ============================================================================
from camera_capture import capture_video_simple

video_path = capture_video_simple(max_duration=10, output_path="my_video.mp4")

# ============================================================================
# 6. PROCESS EXISTING VIDEO (NO CAPTURE)
# ============================================================================
from video_preprocessor import preprocess_video
from hair_gan_processor import process_video_frames
from fps_enhancer import enhance_video_fps

# Step 1: Extract frames
info = preprocess_video("existing_video.mp4", "frames", target_fps=5)

# Step 2: Process with HairGAN
process_video_frames("frames", "processed")

# Step 3: Enhance FPS
enhance_video_fps("processed", "enhanced", multiplier=2, 
                  output_video="final.mp4", fps=30)

# ============================================================================
# 7. CUSTOM CONFIGURATION
# ============================================================================
from config import Config
from main import VideoPipeline

# Modify config
Config.CAMERA_MAX_DURATION = 8
Config.PREPROCESS_TARGET_FPS = 4
Config.FPS_MULTIPLIER = 3
Config.OUTPUT_FPS = 60

# Run pipeline
pipeline = VideoPipeline(Config)
pipeline.run(output_dir="custom_output")

# ============================================================================
# 8. CHECK CAMERA AVAILABILITY
# ============================================================================
from video_utils import verify_camera_available, list_available_cameras

verify_camera_available()
cameras = list_available_cameras()

# ============================================================================
# 9. GET VIDEO INFORMATION
# ============================================================================
from video_utils import print_video_info

print_video_info("my_video.mp4")

# ============================================================================
# 10. COMPARE TWO VIDEOS SIDE-BY-SIDE
# ============================================================================
from video_utils import compare_videos

compare_videos("original.mp4", "processed.mp4")

# ============================================================================
# 11. EXTRACT SINGLE FRAME
# ============================================================================
from video_utils import extract_single_frame

extract_single_frame("video.mp4", frame_number=50, output_path="frame.jpg")

# ============================================================================
# 12. CREATE THUMBNAIL
# ============================================================================
from video_utils import create_thumbnail

create_thumbnail("video.mp4", "thumbnail.jpg", time_seconds=2.0)

# ============================================================================
# 13. COMPARE PROCESSING METRICS
# ============================================================================
from video_utils import print_processing_metrics

print_processing_metrics("original.mp4", "processed.mp4")

# ============================================================================
# 14. DIFFERENT FPS INTERPOLATION METHODS
# ============================================================================
from fps_enhancer import enhance_video_fps

# Optical Flow (best quality)
enhance_video_fps("frames", "enhanced1", multiplier=2, method='optical_flow')

# Linear (fast)
enhance_video_fps("frames", "enhanced2", multiplier=2, method='linear')

# Duplicate (fastest)
enhance_video_fps("frames", "enhanced3", multiplier=2, method='duplicate')

# ============================================================================
# 15. STEP-BY-STEP WITH FULL CONTROL
# ============================================================================
from camera_capture import CameraCapture
from video_preprocessor import VideoPreprocessor
from hair_gan_processor import HairGANProcessor
from fps_enhancer import FPSEnhancer

# Step 1: Capture
capture = CameraCapture(max_duration=10, output_path="video.mp4")
video_path = capture.capture_video()

# Step 2: Preprocess
preprocessor = VideoPreprocessor(target_fps=5, resize_width=512)
info = preprocessor.extract_frames(video_path, "frames")

# Step 3: Process (using simple processor as fallback)
from hair_gan_processor import SimpleHairProcessor
SimpleHairProcessor.process_frames_directory("frames", "processed")

# Step 4: Enhance FPS
enhancer = FPSEnhancer(interpolation_method='optical_flow')
enhancer.enhance_fps("processed", "enhanced", target_multiplier=2)

# Step 5: Create final video
enhancer.create_smooth_video("enhanced", "final.mp4", fps=30)

# ============================================================================
# 16. CLEAN UP INTERMEDIATE FILES
# ============================================================================
from video_utils import clean_directory
import shutil

clean_directory("frames")
clean_directory("processed")
clean_directory("enhanced")

# Or remove entire directories
shutil.rmtree("frames")
shutil.rmtree("processed")
shutil.rmtree("enhanced")

# ============================================================================
# 17. ESTIMATE PROCESSING TIME
# ============================================================================
from video_utils import print_time_estimate
from config import Config

print_time_estimate("video.mp4", Config)

# ============================================================================
# 18. RUN INTERACTIVE EXAMPLES
# ============================================================================
"""
python examples.py
"""

# ============================================================================
# 19. CREATE CUSTOM CONFIG CLASS
# ============================================================================
from config import Config

class MyConfig(Config):
    CAMERA_MAX_DURATION = 7
    PREPROCESS_TARGET_FPS = 6
    PREPROCESS_RESIZE_WIDTH = 640
    FPS_MULTIPLIER = 2
    FPS_INTERPOLATION_METHOD = 'linear'
    OUTPUT_FPS = 24
    CLEANUP_INTERMEDIATE = True

from main import run_pipeline
run_pipeline(output_dir="my_output", config_class=MyConfig)

# ============================================================================
# 20. BATCH PROCESS MULTIPLE VIDEOS
# ============================================================================
from video_preprocessor import preprocess_video
from hair_gan_processor import process_video_frames
from fps_enhancer import enhance_video_fps
import os

video_files = ["video1.mp4", "video2.mp4", "video3.mp4"]

for i, video in enumerate(video_files):
    print(f"Processing {video} ({i+1}/{len(video_files)})")
    
    # Preprocess
    preprocess_video(video, f"frames_{i}", target_fps=5)
    
    # Process
    process_video_frames(f"frames_{i}", f"processed_{i}")
    
    # Enhance
    enhance_video_fps(f"processed_{i}", f"enhanced_{i}", 
                     multiplier=2, output_video=f"final_{i}.mp4", fps=30)

# ============================================================================
# COMMON CONFIGURATIONS
# ============================================================================

# Ultra Fast (for testing)
"""
PREPROCESS_TARGET_FPS = 3
PREPROCESS_RESIZE_WIDTH = 256
FPS_MULTIPLIER = 2
FPS_INTERPOLATION_METHOD = 'duplicate'
"""

# Balanced
"""
PREPROCESS_TARGET_FPS = 5
PREPROCESS_RESIZE_WIDTH = 512
FPS_MULTIPLIER = 2
FPS_INTERPOLATION_METHOD = 'linear'
"""

# High Quality
"""
PREPROCESS_TARGET_FPS = 10
PREPROCESS_RESIZE_WIDTH = 1024
FPS_MULTIPLIER = 3
FPS_INTERPOLATION_METHOD = 'optical_flow'
OUTPUT_FPS = 60
"""

# ============================================================================
# TROUBLESHOOTING SNIPPETS
# ============================================================================

# Check OpenCV version
import cv2
print(f"OpenCV version: {cv2.__version__}")

# Check CUDA availability
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")

# Check camera
from video_utils import verify_camera_available
verify_camera_available()

# Get video info
from video_utils import get_video_info
info = get_video_info("video.mp4")
print(info)

# Count frames in directory
from video_utils import count_frames_in_directory
count = count_frames_in_directory("frames")
print(f"Frame count: {count}")

print("\n✓ Quick Reference Guide loaded!")
print("Copy any snippet above to use in your code.")
