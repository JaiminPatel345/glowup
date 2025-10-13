"""
Quick Start Example
Simple examples showing how to use the video processing pipeline
"""

from camera_capture import capture_video_simple
from video_preprocessor import preprocess_video
from hair_gan_processor import process_video_frames
from fps_enhancer import enhance_video_fps
from main import run_pipeline, run_pipeline_custom
from config import Config, FastProcessingConfig, HighQualityConfig


def example1_complete_pipeline():
    """
    Example 1: Run the complete pipeline with default settings
    """
    print("\n" + "="*60)
    print("EXAMPLE 1: Complete Pipeline (Default Settings)")
    print("="*60)
    
    final_video = run_pipeline(output_dir="output_example1")
    print(f"\nFinal video saved to: {final_video}")


def example2_fast_processing():
    """
    Example 2: Fast processing configuration
    """
    print("\n" + "="*60)
    print("EXAMPLE 2: Fast Processing Mode")
    print("="*60)
    
    final_video = run_pipeline(
        output_dir="output_fast",
        config_class=FastProcessingConfig
    )
    print(f"\nFinal video saved to: {final_video}")


def example3_high_quality():
    """
    Example 3: High quality output
    """
    print("\n" + "="*60)
    print("EXAMPLE 3: High Quality Mode")
    print("="*60)
    
    final_video = run_pipeline(
        output_dir="output_hq",
        config_class=HighQualityConfig
    )
    print(f"\nFinal video saved to: {final_video}")


def example4_custom_settings():
    """
    Example 4: Custom settings on the fly
    """
    print("\n" + "="*60)
    print("EXAMPLE 4: Custom Settings")
    print("="*60)
    
    final_video = run_pipeline_custom(
        camera_max_duration=5,  # 5 second capture
        preprocess_target_fps=3,  # Very low FPS for processing
        fps_multiplier=3,  # Triple the FPS
        output_fps=30
    )
    print(f"\nFinal video saved to: {final_video}")


def example5_step_by_step():
    """
    Example 5: Step-by-step manual control
    """
    print("\n" + "="*60)
    print("EXAMPLE 5: Step-by-Step Manual Control")
    print("="*60)
    
    # Step 1: Capture video
    print("\n[Step 1] Capturing video...")
    video_path = capture_video_simple(
        max_duration=10,
        output_path="manual_capture.mp4"
    )
    
    # Step 2: Preprocess
    print("\n[Step 2] Preprocessing video...")
    preprocess_info = preprocess_video(
        video_path,
        output_dir="manual_frames",
        target_fps=5,
        resize_width=512
    )
    
    # Step 3: Process with HairGAN
    print("\n[Step 3] Processing with HairGAN...")
    process_video_frames(
        input_dir="manual_frames",
        output_dir="manual_processed"
    )
    
    # Step 4: Enhance FPS
    print("\n[Step 4] Enhancing FPS...")
    results = enhance_video_fps(
        frames_dir="manual_processed",
        output_dir="manual_enhanced",
        multiplier=2,
        method='optical_flow',
        output_video="manual_final.mp4",
        fps=30
    )
    
    print(f"\nFinal video saved to: manual_final.mp4")


def example6_process_existing_video():
    """
    Example 6: Process an existing video (no camera capture)
    """
    print("\n" + "="*60)
    print("EXAMPLE 6: Process Existing Video")
    print("="*60)
    
    existing_video = "test_capture.mp4"  # Replace with your video path
    
    # Preprocess
    print("\nPreprocessing existing video...")
    preprocess_info = preprocess_video(
        existing_video,
        output_dir="existing_frames",
        target_fps=5,
        resize_width=512
    )
    
    # Process
    print("\nProcessing frames...")
    process_video_frames(
        input_dir="existing_frames",
        output_dir="existing_processed"
    )
    
    # Enhance FPS
    print("\nEnhancing FPS...")
    results = enhance_video_fps(
        frames_dir="existing_processed",
        output_dir="existing_enhanced",
        multiplier=2,
        method='optical_flow',
        output_video="existing_final.mp4",
        fps=30
    )
    
    print(f"\nProcessed video saved to: existing_final.mp4")


def example7_custom_config_class():
    """
    Example 7: Create and use custom configuration class
    """
    print("\n" + "="*60)
    print("EXAMPLE 7: Custom Configuration Class")
    print("="*60)
    
    # Define custom configuration
    class MyCustomConfig(Config):
        CAMERA_MAX_DURATION = 8
        PREPROCESS_TARGET_FPS = 4
        PREPROCESS_RESIZE_WIDTH = 640
        FPS_MULTIPLIER = 2
        FPS_INTERPOLATION_METHOD = 'linear'
        OUTPUT_FPS = 24
        CLEANUP_INTERMEDIATE = True  # Clean up intermediate files
    
    # Run with custom config
    final_video = run_pipeline(
        output_dir="output_custom",
        config_class=MyCustomConfig
    )
    print(f"\nFinal video saved to: {final_video}")


def example8_only_capture():
    """
    Example 8: Only capture video, no processing
    """
    print("\n" + "="*60)
    print("EXAMPLE 8: Only Capture Video")
    print("="*60)
    
    video_path = capture_video_simple(
        max_duration=10,
        output_path="captured_only.mp4"
    )
    print(f"\nVideo captured to: {video_path}")


def example9_different_interpolation_methods():
    """
    Example 9: Compare different FPS interpolation methods
    """
    print("\n" + "="*60)
    print("EXAMPLE 9: Compare Interpolation Methods")
    print("="*60)
    
    input_frames = "test_processed"  # Replace with your frames directory
    
    methods = ['optical_flow', 'linear', 'duplicate']
    
    for method in methods:
        print(f"\nTesting {method} interpolation...")
        
        output_dir = f"enhanced_{method}"
        output_video = f"output_{method}.mp4"
        
        results = enhance_video_fps(
            frames_dir=input_frames,
            output_dir=output_dir,
            multiplier=2,
            method=method,
            output_video=output_video,
            fps=30
        )
        
        print(f"Saved to: {output_video}")


def print_menu():
    """Print example menu"""
    print("\n" + "="*60)
    print("VIDEO PROCESSING PIPELINE - EXAMPLES")
    print("="*60)
    print("\n1. Complete Pipeline (Default Settings)")
    print("2. Fast Processing Mode")
    print("3. High Quality Mode")
    print("4. Custom Settings")
    print("5. Step-by-Step Manual Control")
    print("6. Process Existing Video")
    print("7. Custom Configuration Class")
    print("8. Only Capture Video")
    print("9. Compare Interpolation Methods")
    print("\n0. Exit")
    print("="*60)


if __name__ == "__main__":
    # Interactive menu
    examples = {
        '1': example1_complete_pipeline,
        '2': example2_fast_processing,
        '3': example3_high_quality,
        '4': example4_custom_settings,
        '5': example5_step_by_step,
        '6': example6_process_existing_video,
        '7': example7_custom_config_class,
        '8': example8_only_capture,
        '9': example9_different_interpolation_methods,
    }
    
    while True:
        print_menu()
        choice = input("\nSelect an example (0-9): ").strip()
        
        if choice == '0':
            print("\nExiting. Goodbye!")
            break
        
        if choice in examples:
            try:
                examples[choice]()
                input("\n\nPress Enter to continue...")
            except KeyboardInterrupt:
                print("\n\nExample interrupted by user.")
                input("Press Enter to return to menu...")
            except Exception as e:
                print(f"\n\nError: {e}")
                input("Press Enter to return to menu...")
        else:
            print("\nInvalid choice. Please select 0-9.")
