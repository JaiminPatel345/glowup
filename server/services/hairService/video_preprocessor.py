"""
Video Preprocessing Module
Extract frames, compress, and reduce FPS for HairFastGAN processing
"""

import cv2
import os
import numpy as np
from pathlib import Path


class VideoPreprocessor:
    def __init__(self, target_fps=5, resize_width=512):
        """
        Initialize video preprocessor
        
        Args:
            target_fps: Target FPS for processing (lower = faster processing)
            resize_width: Target width for frames (height auto-calculated)
        """
        self.target_fps = target_fps
        self.resize_width = resize_width
        
    def extract_frames(self, video_path, output_dir="frames"):
        """
        Extract frames from video at target FPS
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save extracted frames
            
        Returns:
            dict: Information about extracted frames
        """
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise Exception(f"Could not open video: {video_path}")
        
        # Get video properties
        original_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Original video: {width}x{height} @ {original_fps}fps")
        print(f"Total frames: {total_frames}")
        
        # Calculate frame skip interval
        frame_interval = int(original_fps / self.target_fps)
        if frame_interval < 1:
            frame_interval = 1
        
        # Calculate target dimensions maintaining aspect ratio
        aspect_ratio = height / width
        target_height = int(self.resize_width * aspect_ratio)
        target_size = (self.resize_width, target_height)
        
        print(f"Target: {target_size[0]}x{target_size[1]} @ {self.target_fps}fps")
        print(f"Extracting every {frame_interval} frame(s)")
        
        extracted_frames = []
        frame_count = 0
        saved_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                # Extract frame at intervals
                if frame_count % frame_interval == 0:
                    # Resize frame
                    resized_frame = cv2.resize(frame, target_size, 
                                              interpolation=cv2.INTER_AREA)
                    
                    # Save frame
                    frame_filename = f"frame_{saved_count:05d}.jpg"
                    frame_path = os.path.join(output_dir, frame_filename)
                    cv2.imwrite(frame_path, resized_frame, 
                               [cv2.IMWRITE_JPEG_QUALITY, 95])
                    
                    extracted_frames.append(frame_path)
                    saved_count += 1
                
                frame_count += 1
                
        finally:
            cap.release()
        
        print(f"Extracted {saved_count} frames to: {output_dir}")
        
        return {
            'frames': extracted_frames,
            'count': saved_count,
            'fps': self.target_fps,
            'size': target_size,
            'output_dir': output_dir
        }
    
    def load_frames(self, frames_dir):
        """
        Load frames from directory
        
        Args:
            frames_dir: Directory containing frame images
            
        Returns:
            list: List of frame file paths
        """
        frames = []
        for filename in sorted(os.listdir(frames_dir)):
            if filename.endswith(('.jpg', '.jpeg', '.png')):
                frames.append(os.path.join(frames_dir, filename))
        
        return frames
    
    def create_video_from_frames(self, frames_dir, output_path, fps=None):
        """
        Create video from frames directory
        
        Args:
            frames_dir: Directory containing frames
            output_path: Path for output video
            fps: FPS for output video (uses target_fps if None)
            
        Returns:
            str: Path to output video
        """
        if fps is None:
            fps = self.target_fps
        
        # Get list of frames
        frames = self.load_frames(frames_dir)
        
        if not frames:
            raise Exception(f"No frames found in {frames_dir}")
        
        # Read first frame to get dimensions
        first_frame = cv2.imread(frames[0])
        height, width = first_frame.shape[:2]
        
        print(f"Creating video from {len(frames)} frames")
        print(f"Output: {width}x{height} @ {fps}fps")
        
        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Write frames
        for frame_path in frames:
            frame = cv2.imread(frame_path)
            out.write(frame)
        
        out.release()
        
        print(f"Video saved to: {output_path}")
        return output_path
    
    def compress_frames(self, frames_dir, quality=85):
        """
        Compress existing frames to reduce size
        
        Args:
            frames_dir: Directory containing frames
            quality: JPEG quality (1-100)
        """
        frames = self.load_frames(frames_dir)
        
        print(f"Compressing {len(frames)} frames with quality={quality}")
        
        for frame_path in frames:
            img = cv2.imread(frame_path)
            cv2.imwrite(frame_path, img, 
                       [cv2.IMWRITE_JPEG_QUALITY, quality])
        
        print("Compression complete")


def preprocess_video(video_path, output_dir="preprocessed_frames", 
                     target_fps=5, resize_width=512):
    """
    Simple function to preprocess video
    
    Args:
        video_path: Path to input video
        output_dir: Directory for output frames
        target_fps: Target FPS for extraction
        resize_width: Target width for frames
        
    Returns:
        dict: Information about preprocessing
    """
    preprocessor = VideoPreprocessor(target_fps=target_fps, 
                                    resize_width=resize_width)
    return preprocessor.extract_frames(video_path, output_dir)


if __name__ == "__main__":
    # Test preprocessing
    test_video = "test_capture.mp4"
    
    if os.path.exists(test_video):
        info = preprocess_video(test_video, output_dir="test_frames", 
                                target_fps=5, resize_width=512)
        print(f"\nPreprocessing complete: {info}")
    else:
        print(f"Test video not found: {test_video}")
