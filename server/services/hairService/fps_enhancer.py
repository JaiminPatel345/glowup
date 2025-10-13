"""
FPS Enhancement Module
Interpolate frames to increase video FPS using various methods
"""

import cv2
import os
import numpy as np


class FPSEnhancer:
    def __init__(self, interpolation_method='optical_flow'):
        """
        Initialize FPS enhancer
        
        Args:
            interpolation_method: Method for interpolation 
                                 ('optical_flow', 'linear', 'duplicate')
        """
        self.interpolation_method = interpolation_method
        
    def interpolate_frames_optical_flow(self, frame1, frame2, num_intermediate=1):
        """
        Interpolate frames using optical flow
        
        Args:
            frame1: First frame (numpy array)
            frame2: Second frame (numpy array)
            num_intermediate: Number of frames to generate between frame1 and frame2
            
        Returns:
            list: Interpolated frames
        """
        # Convert to grayscale for optical flow
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Calculate dense optical flow
        flow = cv2.calcOpticalFlowFarneback(
            gray1, gray2, None,
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0
        )
        
        interpolated_frames = []
        
        for i in range(1, num_intermediate + 1):
            # Interpolation weight
            alpha = i / (num_intermediate + 1)
            
            # Scale flow by interpolation weight
            scaled_flow = flow * alpha
            
            # Create mesh grid
            h, w = frame1.shape[:2]
            x, y = np.meshgrid(np.arange(w), np.arange(h))
            
            # Apply flow to create warped coordinates
            map_x = (x - scaled_flow[..., 0]).astype(np.float32)
            map_y = (y - scaled_flow[..., 1]).astype(np.float32)
            
            # Warp frame1 towards frame2
            warped = cv2.remap(frame1, map_x, map_y, 
                              cv2.INTER_LINEAR, 
                              borderMode=cv2.BORDER_REPLICATE)
            
            # Blend warped frame with frame2
            interpolated = cv2.addWeighted(warped, 1 - alpha, frame2, alpha, 0)
            
            interpolated_frames.append(interpolated)
        
        return interpolated_frames
    
    def interpolate_frames_linear(self, frame1, frame2, num_intermediate=1):
        """
        Simple linear interpolation between frames
        
        Args:
            frame1: First frame
            frame2: Second frame
            num_intermediate: Number of intermediate frames
            
        Returns:
            list: Interpolated frames
        """
        interpolated_frames = []
        
        for i in range(1, num_intermediate + 1):
            alpha = i / (num_intermediate + 1)
            blended = cv2.addWeighted(frame1, 1 - alpha, frame2, alpha, 0)
            interpolated_frames.append(blended)
        
        return interpolated_frames
    
    def duplicate_frames(self, frame, num_duplicates=1):
        """
        Duplicate frames (simple FPS increase)
        
        Args:
            frame: Frame to duplicate
            num_duplicates: Number of duplicates to create
            
        Returns:
            list: Duplicated frames
        """
        return [frame.copy() for _ in range(num_duplicates)]
    
    def enhance_fps(self, frames_dir, output_dir, target_multiplier=2):
        """
        Enhance FPS of video frames
        
        Args:
            frames_dir: Directory containing input frames
            output_dir: Directory to save enhanced frames
            target_multiplier: FPS multiplier (2 = double FPS, 3 = triple, etc.)
            
        Returns:
            dict: Information about enhanced frames
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Load frame paths
        frame_files = sorted([f for f in os.listdir(frames_dir) 
                             if f.endswith(('.jpg', '.jpeg', '.png'))])
        
        if len(frame_files) < 2:
            raise Exception("Need at least 2 frames for interpolation")
        
        print(f"Enhancing FPS with method: {self.interpolation_method}")
        print(f"Input frames: {len(frame_files)}")
        print(f"FPS multiplier: {target_multiplier}x")
        
        # Number of intermediate frames to generate
        num_intermediate = target_multiplier - 1
        
        output_frames = []
        output_count = 0
        
        for i in range(len(frame_files)):
            # Load current frame
            frame_path = os.path.join(frames_dir, frame_files[i])
            frame = cv2.imread(frame_path)
            
            # Save current frame
            output_filename = f"enhanced_frame_{output_count:05d}.jpg"
            output_path = os.path.join(output_dir, output_filename)
            cv2.imwrite(output_path, frame)
            output_frames.append(output_path)
            output_count += 1
            
            # Generate intermediate frames (except after last frame)
            if i < len(frame_files) - 1:
                next_frame_path = os.path.join(frames_dir, frame_files[i + 1])
                next_frame = cv2.imread(next_frame_path)
                
                # Interpolate based on method
                if self.interpolation_method == 'optical_flow':
                    intermediate = self.interpolate_frames_optical_flow(
                        frame, next_frame, num_intermediate
                    )
                elif self.interpolation_method == 'linear':
                    intermediate = self.interpolate_frames_linear(
                        frame, next_frame, num_intermediate
                    )
                elif self.interpolation_method == 'duplicate':
                    intermediate = self.duplicate_frames(frame, num_intermediate)
                else:
                    # Default to linear
                    intermediate = self.interpolate_frames_linear(
                        frame, next_frame, num_intermediate
                    )
                
                # Save intermediate frames
                for interp_frame in intermediate:
                    output_filename = f"enhanced_frame_{output_count:05d}.jpg"
                    output_path = os.path.join(output_dir, output_filename)
                    cv2.imwrite(output_path, interp_frame)
                    output_frames.append(output_path)
                    output_count += 1
            
            if (i + 1) % 10 == 0 or i == len(frame_files) - 1:
                print(f"Processed {i + 1}/{len(frame_files)} frame pairs")
        
        print(f"FPS enhancement complete!")
        print(f"Output frames: {output_count}")
        print(f"Saved to: {output_dir}")
        
        return {
            'frames': output_frames,
            'count': output_count,
            'multiplier': target_multiplier,
            'output_dir': output_dir
        }
    
    def create_smooth_video(self, frames_dir, output_path, fps=30):
        """
        Create smooth video from enhanced frames
        
        Args:
            frames_dir: Directory containing enhanced frames
            output_path: Path for output video
            fps: FPS for output video
            
        Returns:
            str: Path to output video
        """
        # Get frame list
        frames = sorted([f for f in os.listdir(frames_dir) 
                        if f.endswith(('.jpg', '.jpeg', '.png'))])
        
        if not frames:
            raise Exception(f"No frames found in {frames_dir}")
        
        # Read first frame for dimensions
        first_frame = cv2.imread(os.path.join(frames_dir, frames[0]))
        height, width = first_frame.shape[:2]
        
        print(f"Creating smooth video from {len(frames)} frames")
        print(f"Output: {width}x{height} @ {fps}fps")
        
        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        for frame_file in frames:
            frame_path = os.path.join(frames_dir, frame_file)
            frame = cv2.imread(frame_path)
            out.write(frame)
        
        out.release()
        
        print(f"Smooth video saved to: {output_path}")
        return output_path


def enhance_video_fps(frames_dir, output_dir, multiplier=2, 
                     method='optical_flow', output_video=None, fps=30):
    """
    Simple function to enhance video FPS
    
    Args:
        frames_dir: Input frames directory
        output_dir: Output frames directory
        multiplier: FPS multiplier
        method: Interpolation method
        output_video: Optional path to create final video
        fps: FPS for output video
        
    Returns:
        dict: Enhancement results
    """
    enhancer = FPSEnhancer(interpolation_method=method)
    results = enhancer.enhance_fps(frames_dir, output_dir, multiplier)
    
    if output_video:
        video_path = enhancer.create_smooth_video(output_dir, output_video, fps)
        results['video'] = video_path
    
    return results


if __name__ == "__main__":
    # Test FPS enhancement
    test_input = "test_processed"
    test_output = "test_enhanced"
    
    if os.path.exists(test_input):
        results = enhance_video_fps(
            test_input, 
            test_output, 
            multiplier=2,
            method='optical_flow',
            output_video="enhanced_output.mp4",
            fps=30
        )
        print(f"\nEnhancement complete: {results}")
    else:
        print(f"Test frames directory not found: {test_input}")
