"""
Camera Capture Module
Captures video from webcam with automatic 10-second limit
"""

import cv2
import time
import numpy as np
from datetime import datetime


class CameraCapture:
    def __init__(self, max_duration=10, output_path="captured_video.mp4"):
        """
        Initialize camera capture settings
        
        Args:
            max_duration: Maximum recording duration in seconds (default: 10)
            output_path: Path to save the captured video
        """
        self.max_duration = max_duration
        self.output_path = output_path
        self.fps = 30
        self.resolution = (640, 480)
        
    def capture_video(self):
        """
        Capture video from webcam with automatic timeout
        
        Returns:
            str: Path to the saved video file
        """
        # Initialize camera
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            raise Exception("Could not open camera")
        
        # Set camera properties
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
        cap.set(cv2.CAP_PROP_FPS, self.fps)
        
        # Get actual resolution (might differ from requested)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        # Define codec and create VideoWriter
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.output_path, fourcc, actual_fps, (width, height))
        
        print(f"Recording started... (Max {self.max_duration}s)")
        print(f"Resolution: {width}x{height} @ {actual_fps}fps")
        print("Press 'q' to stop recording early")
        
        start_time = time.time()
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                
                if not ret:
                    print("Failed to grab frame")
                    break
                
                # Write frame to output
                out.write(frame)
                frame_count += 1
                
                # Calculate elapsed time
                elapsed_time = time.time() - start_time
                remaining_time = self.max_duration - elapsed_time
                
                # Display frame with timer
                display_frame = frame.copy()
                timer_text = f"Recording: {elapsed_time:.1f}s / {self.max_duration}s"
                cv2.putText(display_frame, timer_text, (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                cv2.imshow('Camera Recording', display_frame)
                
                # Check for exit conditions
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("Recording stopped by user")
                    break
                
                if elapsed_time >= self.max_duration:
                    print("Maximum recording time reached")
                    break
                    
        finally:
            # Release resources
            cap.release()
            out.release()
            cv2.destroyAllWindows()
            
        actual_duration = time.time() - start_time
        print(f"\nRecording completed!")
        print(f"Duration: {actual_duration:.2f}s")
        print(f"Frames captured: {frame_count}")
        print(f"Video saved to: {self.output_path}")
        
        return self.output_path


def capture_video_simple(max_duration=10, output_path="captured_video.mp4"):
    """
    Simple function to capture video from webcam
    
    Args:
        max_duration: Maximum recording duration in seconds
        output_path: Path to save the captured video
        
    Returns:
        str: Path to the saved video file
    """
    capture = CameraCapture(max_duration=max_duration, output_path=output_path)
    return capture.capture_video()


if __name__ == "__main__":
    # Test the camera capture
    output_file = capture_video_simple(max_duration=10, output_path="test_capture.mp4")
    print(f"\nVideo saved successfully: {output_file}")
