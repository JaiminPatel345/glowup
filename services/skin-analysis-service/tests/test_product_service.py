import pytest
from app.services.product_service import ProductService
from app.models.skin_analysis import ProductInfo


class TestProductService:
    """Unit tests for ProductService"""
    
    @pytest.fixture
    async def product_service(self, test_db):
        service = ProductService(test_db)
        # Initialize with test data
        await service._initialize_product_database()
        return service
    
    @pytest.mark.unit
    async def test_get_recommendations(self, product_service):
        """Test getting product recommendations"""
        recommendations = await product_service.get_recommendations("acne_001")
        
        assert recommendations is not None
        assert recommendations.issue_id == "acne_001"
        assert isinstance(recommendations.all_products, list)
        assert isinstance(recommendations.ayurvedic_products, list)
        assert isinstance(recommendations.non_ayurvedic_products, list)
        
        # Verify products are properly categorized
        for product in recommendations.ayurvedic_products:
            assert product.is_ayurvedic is True
        
        for product in recommendations.non_ayurvedic_products:
            assert product.is_ayurvedic is False
    
    @pytest.mark.unit
    async def test_get_recommendations_with_category_filter(self, product_service):
        """Test getting recommendations with category filter"""
        # Test ayurvedic filter
        ayurvedic_recs = await product_service.get_recommendations("acne_001", "ayurvedic")
        assert ayurvedic_recs is not None
        
        # Test non-ayurvedic filter
        non_ayurvedic_recs = await product_service.get_recommendations("acne_001", "non-ayurvedic")
        assert non_ayurvedic_recs is not None
    
    @pytest.mark.unit
    async def test_search_products(self, product_service):
        """Test product search functionality"""
        # Search by name
        results = await product_service.search_products("neem")
        assert isinstance(results, list)
        
        # Search with filters
        filters = {"is_ayurvedic": True, "max_price": 1000.0}
        filtered_results = await product_service.search_products("face", filters)
        assert isinstance(filtered_results, list)
        
        # Verify filters are applied
        for product in filtered_results:
            assert product.is_ayurvedic is True
            assert product.price <= 1000.0
    
    @pytest.mark.unit
    async def test_get_product_by_id(self, product_service):
        """Test getting product by ID"""
        # This should return None for non-existent product
        product = await product_service.get_product_by_id("non_existent_id")
        assert product is None
        
        # Test with existing product (after seeding)
        products = await product_service.get_trending_products(limit=1)
        if products:
            existing_product = await product_service.get_product_by_id(products[0].id)
            assert existing_product is not None
            assert existing_product.id == products[0].id
    
    @pytest.mark.unit
    async def test_get_trending_products(self, product_service):
        """Test getting trending products"""
        # Get all trending products
        all_trending = await product_service.get_trending_products()
        assert isinstance(all_trending, list)
        
        # Get ayurvedic trending products
        ayurvedic_trending = await product_service.get_trending_products("ayurvedic")
        assert isinstance(ayurvedic_trending, list)
        for product in ayurvedic_trending:
            assert product.is_ayurvedic is True
        
        # Get non-ayurvedic trending products
        non_ayurvedic_trending = await product_service.get_trending_products("non-ayurvedic")
        assert isinstance(non_ayurvedic_trending, list)
        for product in non_ayurvedic_trending:
            assert product.is_ayurvedic is False
    
    @pytest.mark.unit
    async def test_cache_recommendations(self, product_service):
        """Test recommendation caching"""
        # Get recommendations (should cache them)
        recommendations1 = await product_service.get_recommendations("acne_001")
        
        # Get same recommendations again (should use cache)
        recommendations2 = await product_service.get_recommendations("acne_001")
        
        assert recommendations1 is not None
        assert recommendations2 is not None
        assert recommendations1.issue_id == recommendations2.issue_id
    
    @pytest.mark.unit
    async def test_clear_cache(self, product_service):
        """Test cache clearing"""
        # Get recommendations to populate cache
        await product_service.get_recommendations("acne_001")
        
        # Clear cache for specific issue
        result = await product_service.clear_cache("acne_001")
        assert result is True
        
        # Clear all cache
        result = await product_service.clear_cache()
        assert result is True
    
    @pytest.mark.unit
    async def test_get_recommendation_stats(self, product_service):
        """Test getting recommendation statistics"""
        stats = await product_service.get_recommendation_stats()
        
        assert isinstance(stats, dict)
        assert "total_products" in stats
        assert "ayurvedic_products" in stats
        assert "non_ayurvedic_products" in stats
        assert "cached_recommendations" in stats
        assert "average_rating" in stats
        
        # Verify data types
        assert isinstance(stats["total_products"], int)
        assert isinstance(stats["ayurvedic_products"], int)
        assert isinstance(stats["non_ayurvedic_products"], int)
        assert isinstance(stats["average_rating"], (int, float))
    
    @pytest.mark.unit
    async def test_add_product(self, product_service):
        """Test adding a new product"""
        new_product = ProductInfo(
            id="test_new_product",
            name="Test Product",
            brand="Test Brand",
            price=500.0,
            rating=4.0,
            image_url="https://test.com/image.jpg",
            is_ayurvedic=True,
            ingredients=["Test Ingredient"]
        )
        
        result = await product_service.add_product(new_product)
        assert result is True
    
    @pytest.mark.unit
    async def test_update_product_ratings(self, product_service):
        """Test updating product ratings"""
        result = await product_service.update_product_ratings("test_product_id", 4.5)
        assert result is True
    
    @pytest.mark.unit
    async def test_invalidate_cache(self, product_service):
        """Test cache invalidation"""
        # Populate cache
        await product_service.get_recommendations("acne_001")
        
        # Invalidate specific issue cache
        await product_service.invalidate_cache("acne_001")
        
        # Invalidate all cache
        await product_service.invalidate_cache()
    
    @pytest.mark.unit
    def test_generate_cache_key(self, product_service):
        """Test cache key generation"""
        key1 = product_service._generate_cache_key("acne_001", "ayurvedic")
        key2 = product_service._generate_cache_key("acne_001", "ayurvedic")
        key3 = product_service._generate_cache_key("acne_001", "all")
        
        # Same inputs should generate same key
        assert key1 == key2
        
        # Different inputs should generate different keys
        assert key1 != key3
        
        # Keys should be strings
        assert isinstance(key1, str)
        assert len(key1) > 0