"""
Utility Functions
Helper functions for video and image operations
"""

import cv2
import os
import numpy as np
from pathlib import Path


def get_video_info(video_path):
    """
    Get information about a video file
    
    Args:
        video_path: Path to video file
        
    Returns:
        dict: Video information
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")
    
    info = {
        'path': video_path,
        'fps': cap.get(cv2.CAP_PROP_FPS),
        'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        'duration': 0,
        'size_mb': 0
    }
    
    # Calculate duration
    if info['fps'] > 0:
        info['duration'] = info['frame_count'] / info['fps']
    
    # Get file size
    if os.path.exists(video_path):
        info['size_mb'] = os.path.getsize(video_path) / (1024 * 1024)
    
    cap.release()
    
    return info


def print_video_info(video_path):
    """
    Print video information in a readable format
    
    Args:
        video_path: Path to video file
    """
    info = get_video_info(video_path)
    
    print("\n" + "="*50)
    print(f"Video Information: {Path(video_path).name}")
    print("="*50)
    print(f"Resolution:   {info['width']}x{info['height']}")
    print(f"FPS:          {info['fps']:.2f}")
    print(f"Frame Count:  {info['frame_count']}")
    print(f"Duration:     {info['duration']:.2f} seconds")
    print(f"File Size:    {info['size_mb']:.2f} MB")
    print("="*50 + "\n")


def compare_videos(video1_path, video2_path):
    """
    Compare two videos side by side
    
    Args:
        video1_path: Path to first video
        video2_path: Path to second video
    """
    cap1 = cv2.VideoCapture(video1_path)
    cap2 = cv2.VideoCapture(video2_path)
    
    if not cap1.isOpened() or not cap2.isOpened():
        raise Exception("Could not open one or both videos")
    
    print("\nComparing videos (press 'q' to quit)...")
    print(f"Video 1: {Path(video1_path).name}")
    print(f"Video 2: {Path(video2_path).name}")
    
    while True:
        ret1, frame1 = cap1.read()
        ret2, frame2 = cap2.read()
        
        if not ret1 or not ret2:
            break
        
        # Resize frames to same height for comparison
        h1, w1 = frame1.shape[:2]
        h2, w2 = frame2.shape[:2]
        
        if h1 != h2:
            frame2 = cv2.resize(frame2, (int(w2 * h1 / h2), h1))
        
        # Concatenate frames side by side
        comparison = np.hstack((frame1, frame2))
        
        # Add labels
        cv2.putText(comparison, "Original", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(comparison, "Processed", (w1 + 10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        cv2.imshow('Video Comparison', comparison)
        
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break
    
    cap1.release()
    cap2.release()
    cv2.destroyAllWindows()


def extract_single_frame(video_path, frame_number, output_path):
    """
    Extract a single frame from video
    
    Args:
        video_path: Path to video file
        frame_number: Frame number to extract
        output_path: Path to save frame image
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")
    
    # Set frame position
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    
    ret, frame = cap.read()
    
    if ret:
        cv2.imwrite(output_path, frame)
        print(f"Frame {frame_number} saved to: {output_path}")
    else:
        print(f"Could not extract frame {frame_number}")
    
    cap.release()


def create_thumbnail(video_path, output_path, time_seconds=1.0):
    """
    Create a thumbnail from video at specified time
    
    Args:
        video_path: Path to video file
        output_path: Path to save thumbnail
        time_seconds: Time in seconds to capture thumbnail
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise Exception(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_number = int(fps * time_seconds)
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    
    if ret:
        # Resize to thumbnail size
        height, width = frame.shape[:2]
        max_width = 320
        
        if width > max_width:
            scale = max_width / width
            new_width = max_width
            new_height = int(height * scale)
            frame = cv2.resize(frame, (new_width, new_height))
        
        cv2.imwrite(output_path, frame)
        print(f"Thumbnail saved to: {output_path}")
    else:
        print("Could not create thumbnail")
    
    cap.release()


def count_frames_in_directory(frames_dir):
    """
    Count number of image frames in directory
    
    Args:
        frames_dir: Directory containing frames
        
    Returns:
        int: Number of frames
    """
    extensions = ('.jpg', '.jpeg', '.png', '.bmp')
    count = sum(1 for f in os.listdir(frames_dir) 
                if f.lower().endswith(extensions))
    return count


def calculate_processing_metrics(original_video, processed_video):
    """
    Calculate metrics comparing original and processed videos
    
    Args:
        original_video: Path to original video
        processed_video: Path to processed video
        
    Returns:
        dict: Comparison metrics
    """
    info_orig = get_video_info(original_video)
    info_proc = get_video_info(processed_video)
    
    metrics = {
        'original': info_orig,
        'processed': info_proc,
        'fps_increase': info_proc['fps'] / info_orig['fps'] if info_orig['fps'] > 0 else 0,
        'size_change_mb': info_proc['size_mb'] - info_orig['size_mb'],
        'size_ratio': info_proc['size_mb'] / info_orig['size_mb'] if info_orig['size_mb'] > 0 else 0
    }
    
    return metrics


def print_processing_metrics(original_video, processed_video):
    """
    Print comparison metrics between original and processed videos
    
    Args:
        original_video: Path to original video
        processed_video: Path to processed video
    """
    metrics = calculate_processing_metrics(original_video, processed_video)
    
    print("\n" + "="*60)
    print("PROCESSING METRICS")
    print("="*60)
    
    print("\nOriginal Video:")
    print(f"  Resolution: {metrics['original']['width']}x{metrics['original']['height']}")
    print(f"  FPS: {metrics['original']['fps']:.2f}")
    print(f"  Duration: {metrics['original']['duration']:.2f}s")
    print(f"  Size: {metrics['original']['size_mb']:.2f} MB")
    
    print("\nProcessed Video:")
    print(f"  Resolution: {metrics['processed']['width']}x{metrics['processed']['height']}")
    print(f"  FPS: {metrics['processed']['fps']:.2f}")
    print(f"  Duration: {metrics['processed']['duration']:.2f}s")
    print(f"  Size: {metrics['processed']['size_mb']:.2f} MB")
    
    print("\nChanges:")
    print(f"  FPS Increase: {metrics['fps_increase']:.2f}x")
    print(f"  Size Change: {metrics['size_change_mb']:+.2f} MB ({metrics['size_ratio']:.2f}x)")
    
    print("="*60 + "\n")


def verify_camera_available():
    """
    Check if camera is available
    
    Returns:
        bool: True if camera is available
    """
    cap = cv2.VideoCapture(0)
    available = cap.isOpened()
    cap.release()
    
    if available:
        print("✓ Camera is available")
    else:
        print("✗ Camera is not available")
    
    return available


def list_available_cameras():
    """
    List all available cameras
    
    Returns:
        list: List of available camera indices
    """
    available = []
    
    for i in range(10):  # Check first 10 indices
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            available.append(i)
            cap.release()
    
    print(f"Available cameras: {available}")
    return available


def clean_directory(directory_path, extensions=('.jpg', '.jpeg', '.png')):
    """
    Clean all files with specified extensions from directory
    
    Args:
        directory_path: Directory to clean
        extensions: Tuple of file extensions to remove
    """
    if not os.path.exists(directory_path):
        print(f"Directory does not exist: {directory_path}")
        return
    
    count = 0
    for filename in os.listdir(directory_path):
        if filename.lower().endswith(extensions):
            file_path = os.path.join(directory_path, filename)
            os.remove(file_path)
            count += 1
    
    print(f"Removed {count} files from {directory_path}")


def estimate_processing_time(video_path, config):
    """
    Estimate processing time based on video and configuration
    
    Args:
        video_path: Path to video file
        config: Configuration class
        
    Returns:
        dict: Time estimates
    """
    info = get_video_info(video_path)
    
    # Calculate number of frames at target FPS
    target_frames = info['duration'] * config.PREPROCESS_TARGET_FPS
    
    # Rough estimates (adjust based on hardware)
    estimates = {
        'capture': 0,  # Already captured
        'preprocess': target_frames * 0.05,  # ~0.05s per frame
        'hairgan': target_frames * 0.5,  # ~0.5s per frame (depends on model)
        'enhance': target_frames * config.FPS_MULTIPLIER * 0.1,  # ~0.1s per frame
    }
    
    estimates['total'] = sum(estimates.values())
    
    return estimates


def print_time_estimate(video_path, config):
    """
    Print estimated processing time
    
    Args:
        video_path: Path to video file
        config: Configuration class
    """
    estimates = estimate_processing_time(video_path, config)
    
    print("\n" + "="*50)
    print("ESTIMATED PROCESSING TIME")
    print("="*50)
    print(f"Preprocessing:  {estimates['preprocess']:.1f}s")
    print(f"HairGAN:        {estimates['hairgan']:.1f}s")
    print(f"FPS Enhance:    {estimates['enhance']:.1f}s")
    print(f"\nTotal:          {estimates['total']:.1f}s ({estimates['total']/60:.1f} minutes)")
    print("="*50 + "\n")
    print("Note: Actual time may vary based on hardware and settings")


if __name__ == "__main__":
    # Test utilities
    print("\nVideo Processing Utilities\n")
    
    # Check camera
    print("Checking camera availability...")
    verify_camera_available()
    list_available_cameras()
    
    # Test with existing video if available
    test_video = "test_capture.mp4"
    if os.path.exists(test_video):
        print(f"\nAnalyzing test video: {test_video}")
        print_video_info(test_video)
