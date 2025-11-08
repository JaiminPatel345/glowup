import pytest
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
import tempfile
from PIL import Image
import numpy as np

from app.services.skin_analysis_service import SkinAnalysisService
from app.services.ai_service import AIService
from app.services.image_service import ImageService
from app.core.config import settings


class TestPerformance:
    """Performance tests to ensure 5-second response time requirement"""
    
    @pytest.fixture
    def ai_service(self):
        return AIService()
    
    @pytest.fixture
    def image_service(self, override_settings):
        return ImageService()
    
    @pytest.fixture
    async def analysis_service(self, test_db):
        return SkinAnalysisService(test_db)
    
    @pytest.mark.performance
    async def test_skin_analysis_response_time(self, analysis_service, temp_image_file):
        """Test that skin analysis completes within 5 seconds"""
        start_time = time.time()
        
        result = await analysis_service.analyze_skin("perf_test_user", temp_image_file)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should complete within 5 seconds as per requirement
        assert processing_time <= settings.MAX_ANALYSIS_TIME
        assert result is not None
        
        print(f"Skin analysis completed in {processing_time:.2f} seconds")
    
    @pytest.mark.performance
    async def test_ai_model_inference_time(self, ai_service, temp_image_file):
        """Test AI model inference time"""
        start_time = time.time()
        
        result = await ai_service.analyze_skin_image(temp_image_file)
        
        end_time = time.time()
        inference_time = end_time - start_time
        
        # AI inference should be fast (most of the 5-second budget)
        assert inference_time <= 4.0  # Leave 1 second for other operations
        assert result is not None
        
        print(f"AI inference completed in {inference_time:.2f} seconds")
    
    @pytest.mark.performance
    async def test_image_preprocessing_time(self, image_service, temp_image_file):
        """Test image preprocessing performance"""
        start_time = time.time()
        
        processed_path = await image_service.preprocess_image(temp_image_file)
        
        end_time = time.time()
        preprocessing_time = end_time - start_time
        
        # Image preprocessing should be very fast
        assert preprocessing_time <= 1.0  # Should complete within 1 second
        assert processed_path is not None
        
        print(f"Image preprocessing completed in {preprocessing_time:.2f} seconds")
        
        # Cleanup
        import os
        if os.path.exists(processed_path):
            os.unlink(processed_path)
    
    @pytest.mark.performance
    async def test_concurrent_analysis_performance(self, analysis_service):
        """Test performance under concurrent load"""
        # Create multiple test images
        test_images = []
        for i in range(5):
            # Create a simple test image
            image = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                pil_image = Image.fromarray(image)
                pil_image.save(tmp_file.name, 'JPEG')
                test_images.append(tmp_file.name)
        
        try:
            # Run concurrent analyses
            start_time = time.time()
            
            tasks = []
            for i, image_path in enumerate(test_images):
                task = analysis_service.analyze_skin(f"concurrent_user_{i}", image_path)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # All analyses should complete
            successful_results = [r for r in results if not isinstance(r, Exception)]
            assert len(successful_results) > 0
            
            # Average time per analysis should still be reasonable
            avg_time_per_analysis = total_time / len(test_images)
            assert avg_time_per_analysis <= settings.MAX_ANALYSIS_TIME * 1.5  # Allow some overhead
            
            print(f"Concurrent analysis: {len(test_images)} analyses in {total_time:.2f} seconds")
            print(f"Average time per analysis: {avg_time_per_analysis:.2f} seconds")
            
        finally:
            # Cleanup test images
            import os
            for image_path in test_images:
                if os.path.exists(image_path):
                    os.unlink(image_path)
    
    @pytest.mark.performance
    async def test_memory_usage_during_analysis(self, analysis_service, temp_image_file):
        """Test memory usage during analysis"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        
        # Measure initial memory
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform analysis
        result = await analysis_service.analyze_skin("memory_test_user", temp_image_file)
        
        # Measure final memory
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 500MB for a single analysis)
        assert memory_increase <= 500
        assert result is not None
        
        print(f"Memory usage: {initial_memory:.1f}MB -> {final_memory:.1f}MB (increase: {memory_increase:.1f}MB)")
    
    @pytest.mark.performance
    async def test_database_operation_performance(self, analysis_service, temp_image_file):
        """Test database operation performance"""
        # Create an analysis
        start_time = time.time()
        result = await analysis_service.analyze_skin("db_perf_user", temp_image_file)
        create_time = time.time() - start_time
        
        analysis_id = str(result.id)
        
        # Test retrieval performance
        start_time = time.time()
        retrieved = await analysis_service.get_analysis_by_id(analysis_id)
        retrieval_time = time.time() - start_time
        
        # Test history retrieval performance
        start_time = time.time()
        history = await analysis_service.get_user_history("db_perf_user")
        history_time = time.time() - start_time
        
        # Database operations should be fast
        assert create_time <= 5.0  # Analysis creation (includes AI processing)
        assert retrieval_time <= 0.5  # Single document retrieval
        assert history_time <= 1.0  # History query
        
        assert retrieved is not None
        assert len(history) > 0
        
        print(f"DB Performance - Create: {create_time:.2f}s, Retrieve: {retrieval_time:.2f}s, History: {history_time:.2f}s")
    
    @pytest.mark.performance
    async def test_image_quality_calculation_performance(self, image_service):
        """Test image quality calculation performance"""
        # Create test images of different sizes
        sizes = [(256, 256), (512, 512), (1024, 1024)]
        
        for width, height in sizes:
            # Create test image
            image = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                pil_image = Image.fromarray(image)
                pil_image.save(tmp_file.name, 'JPEG')
                
                try:
                    start_time = time.time()
                    quality_score = image_service.calculate_image_quality_score(tmp_file.name)
                    calculation_time = time.time() - start_time
                    
                    # Quality calculation should be fast regardless of image size
                    assert calculation_time <= 0.5  # Should complete within 0.5 seconds
                    assert 0.0 <= quality_score <= 1.0
                    
                    print(f"Quality calculation for {width}x{height}: {calculation_time:.3f}s (score: {quality_score:.2f})")
                    
                finally:
                    import os
                    if os.path.exists(tmp_file.name):
                        os.unlink(tmp_file.name)
    
    @pytest.mark.performance
    @pytest.mark.slow
    async def test_sustained_load_performance(self, analysis_service):
        """Test performance under sustained load (marked as slow test)"""
        # This test simulates sustained usage over time
        num_analyses = 10
        results = []
        
        for i in range(num_analyses):
            # Create a test image
            image = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                pil_image = Image.fromarray(image)
                pil_image.save(tmp_file.name, 'JPEG')
                
                try:
                    start_time = time.time()
                    result = await analysis_service.analyze_skin(f"sustained_user_{i}", tmp_file.name)
                    analysis_time = time.time() - start_time
                    
                    results.append(analysis_time)
                    
                    # Each analysis should still meet the time requirement
                    assert analysis_time <= settings.MAX_ANALYSIS_TIME
                    assert result is not None
                    
                finally:
                    import os
                    if os.path.exists(tmp_file.name):
                        os.unlink(tmp_file.name)
        
        # Calculate statistics
        avg_time = sum(results) / len(results)
        max_time = max(results)
        min_time = min(results)
        
        print(f"Sustained load results:")
        print(f"  Average time: {avg_time:.2f}s")
        print(f"  Max time: {max_time:.2f}s")
        print(f"  Min time: {min_time:.2f}s")
        
        # Performance should remain consistent
        assert avg_time <= settings.MAX_ANALYSIS_TIME
        assert max_time <= settings.MAX_ANALYSIS_TIME * 1.2  # Allow 20% variance