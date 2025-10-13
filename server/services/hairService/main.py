"""
Main Pipeline Orchestrator
Complete workflow: Capture -> Preprocess -> Process with HairGAN -> Enhance FPS -> Output
"""

import os
import sys
import time
import shutil
from pathlib import Path

# Import all modules
from camera_capture import CameraCapture
from video_preprocessor import VideoPreprocessor
from hair_gan_processor import HairGANProcessor, SimpleHairProcessor
from fps_enhancer import FPSEnhancer
from config import Config


class VideoPipeline:
    def __init__(self, config=None):
        """
        Initialize video processing pipeline
        
        Args:
            config: Configuration class (uses default Config if None)
        """
        self.config = config if config is not None else Config
        self.paths = None
        self.stats = {
            'capture_time': 0,
            'preprocess_time': 0,
            'process_time': 0,
            'enhance_time': 0,
            'total_time': 0
        }
        
    def setup(self, output_dir=None):
        """
        Setup pipeline and create directories
        
        Args:
            output_dir: Base output directory (uses config default if None)
        """
        print("\n" + "="*60)
        print("VIDEO PROCESSING PIPELINE - SETUP")
        print("="*60 + "\n")
        
        # Create output directories
        self.config.create_output_directories(output_dir)
        self.paths = self.config.get_output_paths(output_dir)
        
        # Print configuration
        if self.config.VERBOSE:
            self.config.print_config()
    
    def step1_capture_video(self):
        """
        Step 1: Capture video from camera
        
        Returns:
            str: Path to captured video
        """
        print("\n" + "="*60)
        print("STEP 1: CAPTURING VIDEO")
        print("="*60 + "\n")
        
        start_time = time.time()
        
        try:
            capture = CameraCapture(
                max_duration=self.config.CAMERA_MAX_DURATION,
                output_path=self.paths['captured_video']
            )
            
            video_path = capture.capture_video()
            
            self.stats['capture_time'] = time.time() - start_time
            print(f"\n✓ Capture completed in {self.stats['capture_time']:.2f}s")
            
            return video_path
            
        except Exception as e:
            print(f"\n✗ Capture failed: {e}")
            raise
    
    def step2_preprocess_video(self, video_path):
        """
        Step 2: Extract and preprocess frames
        
        Args:
            video_path: Path to input video
            
        Returns:
            dict: Preprocessing information
        """
        print("\n" + "="*60)
        print("STEP 2: PREPROCESSING VIDEO")
        print("="*60 + "\n")
        
        start_time = time.time()
        
        try:
            preprocessor = VideoPreprocessor(
                target_fps=self.config.PREPROCESS_TARGET_FPS,
                resize_width=self.config.PREPROCESS_RESIZE_WIDTH
            )
            
            info = preprocessor.extract_frames(
                video_path,
                self.paths['preprocessed_frames']
            )
            
            self.stats['preprocess_time'] = time.time() - start_time
            print(f"\n✓ Preprocessing completed in {self.stats['preprocess_time']:.2f}s")
            
            return info
            
        except Exception as e:
            print(f"\n✗ Preprocessing failed: {e}")
            raise
    
    def step3_process_with_hairgan(self, frames_dir):
        """
        Step 3: Process frames with HairFastGAN
        
        Args:
            frames_dir: Directory containing preprocessed frames
            
        Returns:
            str: Path to processed frames directory
        """
        print("\n" + "="*60)
        print("STEP 3: PROCESSING WITH HAIRFASTGAN")
        print("="*60 + "\n")
        
        start_time = time.time()
        
        try:
            # Try to use HairGANProcessor
            try:
                processor = HairGANProcessor(device=self.config.HAIRGAN_DEVICE)
                # processor.load_model(self.config.HAIRGAN_MODEL_PATH)  # Uncomment when model available
                
                processor.process_frames_batch(
                    frames_dir,
                    self.paths['processed_frames'],
                    reference_hair_path=self.config.REFERENCE_HAIR_IMAGE,
                    batch_size=self.config.HAIRGAN_BATCH_SIZE
                )
                
            except Exception as e:
                print(f"HairGAN processor not available: {e}")
                print("Using simple processor as fallback...")
                
                SimpleHairProcessor.process_frames_directory(
                    frames_dir,
                    self.paths['processed_frames']
                )
            
            self.stats['process_time'] = time.time() - start_time
            print(f"\n✓ Processing completed in {self.stats['process_time']:.2f}s")
            
            return self.paths['processed_frames']
            
        except Exception as e:
            print(f"\n✗ Processing failed: {e}")
            raise
    
    def step4_enhance_fps(self, frames_dir):
        """
        Step 4: Enhance FPS through frame interpolation
        
        Args:
            frames_dir: Directory containing processed frames
            
        Returns:
            dict: Enhancement results
        """
        print("\n" + "="*60)
        print("STEP 4: ENHANCING FPS")
        print("="*60 + "\n")
        
        start_time = time.time()
        
        try:
            enhancer = FPSEnhancer(
                interpolation_method=self.config.FPS_INTERPOLATION_METHOD
            )
            
            results = enhancer.enhance_fps(
                frames_dir,
                self.paths['enhanced_frames'],
                target_multiplier=self.config.FPS_MULTIPLIER
            )
            
            # Create final video
            enhancer.create_smooth_video(
                self.paths['enhanced_frames'],
                self.paths['final_video'],
                fps=self.config.OUTPUT_FPS
            )
            
            self.stats['enhance_time'] = time.time() - start_time
            print(f"\n✓ FPS enhancement completed in {self.stats['enhance_time']:.2f}s")
            
            return results
            
        except Exception as e:
            print(f"\n✗ FPS enhancement failed: {e}")
            raise
    
    def cleanup_intermediate_files(self):
        """
        Clean up intermediate frames if configured
        """
        if self.config.CLEANUP_INTERMEDIATE:
            print("\nCleaning up intermediate files...")
            
            dirs_to_remove = [
                self.paths['preprocessed_frames'],
                self.paths['processed_frames'],
                self.paths['enhanced_frames']
            ]
            
            for dir_path in dirs_to_remove:
                if os.path.exists(dir_path):
                    shutil.rmtree(dir_path)
                    print(f"  Removed: {dir_path}")
    
    def print_summary(self):
        """
        Print pipeline execution summary
        """
        print("\n" + "="*60)
        print("PIPELINE EXECUTION SUMMARY")
        print("="*60)
        
        print(f"\nStep 1 - Capture:      {self.stats['capture_time']:.2f}s")
        print(f"Step 2 - Preprocess:   {self.stats['preprocess_time']:.2f}s")
        print(f"Step 3 - HairGAN:      {self.stats['process_time']:.2f}s")
        print(f"Step 4 - Enhance FPS:  {self.stats['enhance_time']:.2f}s")
        print(f"\nTotal Time:            {self.stats['total_time']:.2f}s")
        
        print(f"\nFinal Output:          {self.paths['final_video']}")
        print("\n" + "="*60 + "\n")
    
    def run(self, output_dir=None):
        """
        Run complete pipeline
        
        Args:
            output_dir: Base output directory
            
        Returns:
            str: Path to final video
        """
        total_start = time.time()
        
        try:
            # Setup
            self.setup(output_dir)
            
            # Step 1: Capture video
            video_path = self.step1_capture_video()
            
            # Step 2: Preprocess video
            preprocess_info = self.step2_preprocess_video(video_path)
            
            # Step 3: Process with HairGAN
            processed_dir = self.step3_process_with_hairgan(
                preprocess_info['output_dir']
            )
            
            # Step 4: Enhance FPS
            enhance_results = self.step4_enhance_fps(processed_dir)
            
            # Calculate total time
            self.stats['total_time'] = time.time() - total_start
            
            # Print summary
            self.print_summary()
            
            # Cleanup if configured
            self.cleanup_intermediate_files()
            
            print("✓ Pipeline completed successfully!")
            return self.paths['final_video']
            
        except Exception as e:
            print(f"\n✗ Pipeline failed: {e}")
            raise


def run_pipeline(output_dir="output", config_class=None):
    """
    Simple function to run the complete pipeline
    
    Args:
        output_dir: Output directory
        config_class: Configuration class to use
        
    Returns:
        str: Path to final video
    """
    config = config_class if config_class is not None else Config
    pipeline = VideoPipeline(config)
    return pipeline.run(output_dir)


def run_pipeline_custom(**kwargs):
    """
    Run pipeline with custom configuration
    
    Args:
        **kwargs: Configuration parameters to override
        
    Returns:
        str: Path to final video
    """
    # Create custom config class
    class CustomConfig(Config):
        pass
    
    # Apply custom parameters
    for key, value in kwargs.items():
        if hasattr(CustomConfig, key.upper()):
            setattr(CustomConfig, key.upper(), value)
    
    pipeline = VideoPipeline(CustomConfig)
    return pipeline.run()


if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════╗
║     VIDEO PROCESSING PIPELINE WITH HAIRFASTGAN             ║
║                                                            ║
║  Capture -> Preprocess -> HairGAN -> Enhance FPS          ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    try:
        # Run the complete pipeline
        final_video = run_pipeline(output_dir="output")
        
        print(f"\n🎉 Success! Your processed video is ready:")
        print(f"   {final_video}")
        
    except KeyboardInterrupt:
        print("\n\nPipeline interrupted by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Pipeline failed with error:")
        print(f"   {e}")
        sys.exit(1)
