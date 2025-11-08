from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta
from bson import ObjectId
import asyncio
import hashlib
import json

from app.models.skin_analysis import (
    ProductRecommendations, 
    ProductInfo, 
    ProductRecommendationDocument
)

logger = logging.getLogger(__name__)


class ProductService:
    """Service for managing product recommendations with caching and filtering"""
    
    def __init__(self, database):
        self.db = database
        self.recommendations_collection = self.db.product_recommendations
        self.products_collection = self.db.products
        self.cache_duration = timedelta(hours=24)  # Cache recommendations for 24 hours
        
        # Initialize product database
        asyncio.create_task(self._initialize_product_database())
    
    async def get_recommendations(self, issue_id: str, category: Optional[str] = None) -> Optional[ProductRecommendations]:
        """
        Get product recommendations for a specific skin issue
        Supports filtering by category: "all", "ayurvedic", "non-ayurvedic"
        """
        try:
            # Try to get from cache first
            cached_recommendations = await self._get_cached_recommendations(issue_id)
            
            if not cached_recommendations:
                # Generate new recommendations if not cached
                cached_recommendations = await self._generate_recommendations(issue_id)
                
                if cached_recommendations:
                    await self._cache_recommendations(cached_recommendations)
            
            if not cached_recommendations:
                return None
            
            # Filter products based on category
            return self._filter_recommendations(cached_recommendations, category)
            
        except Exception as e:
            logger.error(f"Failed to get recommendations for issue {issue_id}: {str(e)}")
            return None
    
    async def _get_cached_recommendations(self, issue_id: str) -> Optional[ProductRecommendationDocument]:
        """Get cached recommendations if they exist and are not expired"""
        try:
            cutoff_time = datetime.utcnow() - self.cache_duration
            
            result = await self.collection.find_one({
                "issue_id": issue_id,
                "last_updated": {"$gte": cutoff_time}
            })
            
            if result:
                return ProductRecommendationDocument(**result)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get cached recommendations: {str(e)}")
            return None
    
    async def _generate_recommendations(self, issue_id: str) -> Optional[ProductRecommendationDocument]:
        """
        Generate new product recommendations for an issue
        This is a mock implementation - will be enhanced with actual product database
        """
        try:
            # Mock product data based on issue type
            products = self._get_mock_products_for_issue(issue_id)
            
            if not products:
                return None
            
            recommendation_doc = ProductRecommendationDocument(
                issue_id=issue_id,
                products=products,
                last_updated=datetime.utcnow()
            )
            
            return recommendation_doc
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations for issue {issue_id}: {str(e)}")
            return None
    
    def _get_mock_products_for_issue(self, issue_id: str) -> List[ProductInfo]:
        """
        Generate mock product recommendations based on issue type
        Will be replaced with actual product database queries
        """
        
        # Mock product database
        mock_products = {
            "acne_001": [
                ProductInfo(
                    id="prod_001",
                    name="Neem Face Wash",
                    brand="Himalaya",
                    price=150.0,
                    rating=4.2,
                    image_url="https://example.com/neem-face-wash.jpg",
                    is_ayurvedic=True,
                    ingredients=["Neem", "Turmeric", "Aloe Vera"]
                ),
                ProductInfo(
                    id="prod_002",
                    name="Salicylic Acid Cleanser",
                    brand="CeraVe",
                    price=800.0,
                    rating=4.5,
                    image_url="https://example.com/salicylic-cleanser.jpg",
                    is_ayurvedic=False,
                    ingredients=["Salicylic Acid", "Ceramides", "Hyaluronic Acid"]
                ),
                ProductInfo(
                    id="prod_003",
                    name="Tea Tree Oil Serum",
                    brand="The Body Shop",
                    price=1200.0,
                    rating=4.0,
                    image_url="https://example.com/tea-tree-serum.jpg",
                    is_ayurvedic=False,
                    ingredients=["Tea Tree Oil", "Witch Hazel", "Glycerin"]
                )
            ],
            "dryness_001": [
                ProductInfo(
                    id="prod_004",
                    name="Aloe Vera Moisturizer",
                    brand="Patanjali",
                    price=120.0,
                    rating=4.1,
                    image_url="https://example.com/aloe-moisturizer.jpg",
                    is_ayurvedic=True,
                    ingredients=["Aloe Vera", "Coconut Oil", "Shea Butter"]
                ),
                ProductInfo(
                    id="prod_005",
                    name="Hyaluronic Acid Serum",
                    brand="The Ordinary",
                    price=600.0,
                    rating=4.6,
                    image_url="https://example.com/hyaluronic-serum.jpg",
                    is_ayurvedic=False,
                    ingredients=["Hyaluronic Acid", "Vitamin B5", "Aqua"]
                )
            ],
            "dark_circles_001": [
                ProductInfo(
                    id="prod_006",
                    name="Kumkumadi Eye Cream",
                    brand="Kama Ayurveda",
                    price=2500.0,
                    rating=4.3,
                    image_url="https://example.com/kumkumadi-eye-cream.jpg",
                    is_ayurvedic=True,
                    ingredients=["Saffron", "Lotus", "Sandalwood", "Almond Oil"]
                ),
                ProductInfo(
                    id="prod_007",
                    name="Caffeine Eye Serum",
                    brand="The INKEY List",
                    price=900.0,
                    rating=4.4,
                    image_url="https://example.com/caffeine-eye-serum.jpg",
                    is_ayurvedic=False,
                    ingredients=["Caffeine", "Peptides", "Hyaluronic Acid"]
                )
            ]
        }
        
        return mock_products.get(issue_id, [])
    
    async def _cache_recommendations(self, recommendation_doc: ProductRecommendationDocument) -> None:
        """Cache product recommendations in database"""
        try:
            # Remove existing cache for this issue
            await self.collection.delete_many({"issue_id": recommendation_doc.issue_id})
            
            # Insert new cache
            doc_dict = recommendation_doc.dict(by_alias=True)
            doc_dict.pop('id', None)  # Remove id to let MongoDB generate it
            
            await self.collection.insert_one(doc_dict)
            logger.info(f"Cached recommendations for issue {recommendation_doc.issue_id}")
            
        except Exception as e:
            logger.error(f"Failed to cache recommendations: {str(e)}")
    
    def _filter_recommendations(self, cached_doc: ProductRecommendationDocument, category: Optional[str]) -> ProductRecommendations:
        """Filter recommendations based on category"""
        
        all_products = cached_doc.products
        ayurvedic_products = [p for p in all_products if p.is_ayurvedic]
        non_ayurvedic_products = [p for p in all_products if not p.is_ayurvedic]
        
        # Apply category filter
        if category == "ayurvedic":
            filtered_products = ayurvedic_products
        elif category == "non-ayurvedic":
            filtered_products = non_ayurvedic_products
        else:  # "all" or None
            filtered_products = all_products
        
        return ProductRecommendations(
            issue_id=cached_doc.issue_id,
            all_products=filtered_products if category is None or category == "all" else all_products,
            ayurvedic_products=ayurvedic_products,
            non_ayurvedic_products=non_ayurvedic_products
        )
    
    async def add_product(self, product: ProductInfo) -> bool:
        """Add a new product to the database (for admin use)"""
        try:
            # This would insert into a products collection in a real implementation
            # For now, just log the action
            logger.info(f"Product add requested: {product.name} by {product.brand}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add product: {str(e)}")
            return False
    
    async def update_product_ratings(self, product_id: str, new_rating: float) -> bool:
        """Update product rating (for user feedback integration)"""
        try:
            # This would update the product in the database
            logger.info(f"Rating update requested for product {product_id}: {new_rating}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update product rating: {str(e)}")
            return False
    
    async def clear_cache(self, issue_id: Optional[str] = None) -> bool:
        """Clear recommendation cache (for admin use)"""
        try:
            if issue_id:
                result = await self.collection.delete_many({"issue_id": issue_id})
                logger.info(f"Cleared cache for issue {issue_id}: {result.deleted_count} documents")
            else:
                result = await self.collection.delete_many({})
                logger.info(f"Cleared all recommendation cache: {result.deleted_count} documents")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {str(e)}")
            return False
    
    async def _initialize_product_database(self):
        """Initialize product database with sample data if empty"""
        try:
            # Check if products collection is empty
            count = await self.products_collection.count_documents({})
            
            if count == 0:
                logger.info("Initializing product database with sample data")
                await self._seed_product_database()
            else:
                logger.info(f"Product database already contains {count} products")
                
        except Exception as e:
            logger.error(f"Failed to initialize product database: {str(e)}")
    
    async def _seed_product_database(self):
        """Seed the product database with comprehensive sample data"""
        try:
            sample_products = [
                # Acne products
                {
                    "id": "acne_001",
                    "name": "Neem Face Wash",
                    "brand": "Himalaya",
                    "price": 150.0,
                    "rating": 4.2,
                    "image_url": "https://example.com/neem-face-wash.jpg",
                    "is_ayurvedic": True,
                    "ingredients": ["Neem", "Turmeric", "Aloe Vera"],
                    "issue_types": ["acne", "oily_skin"],
                    "description": "Natural neem-based face wash for acne-prone skin",
                    "category": "cleanser"
                },
                {
                    "id": "acne_002",
                    "name": "Salicylic Acid Cleanser",
                    "brand": "CeraVe",
                    "price": 800.0,
                    "rating": 4.5,
                    "image_url": "https://example.com/salicylic-cleanser.jpg",
                    "is_ayurvedic": False,
                    "ingredients": ["Salicylic Acid", "Ceramides", "Hyaluronic Acid"],
                    "issue_types": ["acne", "blackheads"],
                    "description": "Gentle exfoliating cleanser with salicylic acid",
                    "category": "cleanser"
                },
                {
                    "id": "acne_003",
                    "name": "Tea Tree Oil Serum",
                    "brand": "The Body Shop",
                    "price": 1200.0,
                    "rating": 4.0,
                    "image_url": "https://example.com/tea-tree-serum.jpg",
                    "is_ayurvedic": False,
                    "ingredients": ["Tea Tree Oil", "Witch Hazel", "Glycerin"],
                    "issue_types": ["acne", "inflammation"],
                    "description": "Antibacterial serum for acne treatment",
                    "category": "serum"
                },
                
                # Dry skin products
                {
                    "id": "dry_001",
                    "name": "Aloe Vera Moisturizer",
                    "brand": "Patanjali",
                    "price": 120.0,
                    "rating": 4.1,
                    "image_url": "https://example.com/aloe-moisturizer.jpg",
                    "is_ayurvedic": True,
                    "ingredients": ["Aloe Vera", "Coconut Oil", "Shea Butter"],
                    "issue_types": ["dryness", "sensitive_skin"],
                    "description": "Natural moisturizer for dry and sensitive skin",
                    "category": "moisturizer"
                },
                {
                    "id": "dry_002",
                    "name": "Hyaluronic Acid Serum",
                    "brand": "The Ordinary",
                    "price": 600.0,
                    "rating": 4.6,
                    "image_url": "https://example.com/hyaluronic-serum.jpg",
                    "is_ayurvedic": False,
                    "ingredients": ["Hyaluronic Acid", "Vitamin B5", "Aqua"],
                    "issue_types": ["dryness", "dehydration"],
                    "description": "Intense hydration serum with multiple molecular weights",
                    "category": "serum"
                },
                
                # Dark circles/pigmentation products
                {
                    "id": "pigment_001",
                    "name": "Kumkumadi Eye Cream",
                    "brand": "Kama Ayurveda",
                    "price": 2500.0,
                    "rating": 4.3,
                    "image_url": "https://example.com/kumkumadi-eye-cream.jpg",
                    "is_ayurvedic": True,
                    "ingredients": ["Saffron", "Lotus", "Sandalwood", "Almond Oil"],
                    "issue_types": ["dark_circles", "pigmentation"],
                    "description": "Luxurious ayurvedic eye cream with saffron",
                    "category": "eye_care"
                },
                {
                    "id": "pigment_002",
                    "name": "Caffeine Eye Serum",
                    "brand": "The INKEY List",
                    "price": 900.0,
                    "rating": 4.4,
                    "image_url": "https://example.com/caffeine-eye-serum.jpg",
                    "is_ayurvedic": False,
                    "ingredients": ["Caffeine", "Peptides", "Hyaluronic Acid"],
                    "issue_types": ["dark_circles", "puffiness"],
                    "description": "Energizing eye serum to reduce dark circles",
                    "category": "eye_care"
                },
                {
                    "id": "pigment_003",
                    "name": "Vitamin C Serum",
                    "brand": "Minimalist",
                    "price": 700.0,
                    "rating": 4.3,
                    "image_url": "https://example.com/vitamin-c-serum.jpg",
                    "is_ayurvedic": False,
                    "ingredients": ["L-Ascorbic Acid", "Vitamin E", "Ferulic Acid"],
                    "issue_types": ["pigmentation", "dullness"],
                    "description": "Brightening serum for even skin tone",
                    "category": "serum"
                },
                
                # Ayurvedic specialties
                {
                    "id": "ayur_001",
                    "name": "Turmeric Face Pack",
                    "brand": "Forest Essentials",
                    "price": 800.0,
                    "rating": 4.4,
                    "image_url": "https://example.com/turmeric-face-pack.jpg",
                    "is_ayurvedic": True,
                    "ingredients": ["Turmeric", "Sandalwood", "Rose Water", "Multani Mitti"],
                    "issue_types": ["acne", "pigmentation", "dullness"],
                    "description": "Traditional ayurvedic face pack for glowing skin",
                    "category": "mask"
                },
                {
                    "id": "ayur_002",
                    "name": "Ashwagandha Night Cream",
                    "brand": "Biotique",
                    "price": 450.0,
                    "rating": 4.0,
                    "image_url": "https://example.com/ashwagandha-cream.jpg",
                    "is_ayurvedic": True,
                    "ingredients": ["Ashwagandha", "Almond Oil", "Honey", "Milk Protein"],
                    "issue_types": ["aging", "dryness"],
                    "description": "Rejuvenating night cream with ashwagandha",
                    "category": "moisturizer"
                }
            ]
            
            # Insert products into database
            await self.products_collection.insert_many(sample_products)
            logger.info(f"Seeded product database with {len(sample_products)} products")
            
            # Create indexes for better performance
            await self.products_collection.create_index([("issue_types", 1)])
            await self.products_collection.create_index([("is_ayurvedic", 1)])
            await self.products_collection.create_index([("rating", -1)])
            await self.products_collection.create_index([("price", 1)])
            
        except Exception as e:
            logger.error(f"Failed to seed product database: {str(e)}")
    
    async def _generate_recommendations(self, issue_id: str) -> Optional[ProductRecommendationDocument]:
        """
        Generate new product recommendations for an issue using the product database
        """
        try:
            # Map issue IDs to searchable terms
            issue_mapping = {
                "acne_001": ["acne", "oily_skin"],
                "acne_hf_001": ["acne", "oily_skin"],
                "dryness_001": ["dryness", "dehydration"],
                "dark_circles_001": ["dark_circles", "puffiness"],
                "pigmentation_001": ["pigmentation", "dullness"],
                "pigmentation_hf_001": ["pigmentation", "dullness"],
                "pigmentation_basic_001": ["pigmentation", "dullness"],
                "texture_001": ["aging", "acne"],
                "texture_basic_001": ["aging", "acne"]
            }
            
            # Get issue types for this issue
            issue_types = issue_mapping.get(issue_id, ["general"])
            
            # Query products from database
            query = {"issue_types": {"$in": issue_types}}
            cursor = self.products_collection.find(query).sort("rating", -1).limit(20)
            
            products = []
            async for product_doc in cursor:
                product = ProductInfo(
                    id=product_doc["id"],
                    name=product_doc["name"],
                    brand=product_doc["brand"],
                    price=product_doc["price"],
                    rating=product_doc["rating"],
                    image_url=product_doc["image_url"],
                    is_ayurvedic=product_doc["is_ayurvedic"],
                    ingredients=product_doc["ingredients"]
                )
                products.append(product)
            
            # If no products found, return general skincare products
            if not products:
                logger.warning(f"No specific products found for issue {issue_id}, using general products")
                products = await self._get_general_products()
            
            # Create recommendation document
            recommendation_doc = ProductRecommendationDocument(
                issue_id=issue_id,
                products=products,
                last_updated=datetime.utcnow()
            )
            
            return recommendation_doc
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations for issue {issue_id}: {str(e)}")
            return None
    
    async def _get_general_products(self) -> List[ProductInfo]:
        """Get general skincare products as fallback"""
        try:
            cursor = self.products_collection.find({}).sort("rating", -1).limit(10)
            
            products = []
            async for product_doc in cursor:
                product = ProductInfo(
                    id=product_doc["id"],
                    name=product_doc["name"],
                    brand=product_doc["brand"],
                    price=product_doc["price"],
                    rating=product_doc["rating"],
                    image_url=product_doc["image_url"],
                    is_ayurvedic=product_doc["is_ayurvedic"],
                    ingredients=product_doc["ingredients"]
                )
                products.append(product)
            
            return products
            
        except Exception as e:
            logger.error(f"Failed to get general products: {str(e)}")
            return []
    
    async def search_products(self, query: str, filters: Optional[Dict[str, Any]] = None) -> List[ProductInfo]:
        """Search products by name, brand, or ingredients"""
        try:
            # Build search query
            search_query = {
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"brand": {"$regex": query, "$options": "i"}},
                    {"ingredients": {"$regex": query, "$options": "i"}}
                ]
            }
            
            # Apply filters
            if filters:
                if "is_ayurvedic" in filters:
                    search_query["is_ayurvedic"] = filters["is_ayurvedic"]
                if "max_price" in filters:
                    search_query["price"] = {"$lte": filters["max_price"]}
                if "min_rating" in filters:
                    search_query["rating"] = {"$gte": filters["min_rating"]}
            
            cursor = self.products_collection.find(search_query).sort("rating", -1).limit(50)
            
            products = []
            async for product_doc in cursor:
                product = ProductInfo(
                    id=product_doc["id"],
                    name=product_doc["name"],
                    brand=product_doc["brand"],
                    price=product_doc["price"],
                    rating=product_doc["rating"],
                    image_url=product_doc["image_url"],
                    is_ayurvedic=product_doc["is_ayurvedic"],
                    ingredients=product_doc["ingredients"]
                )
                products.append(product)
            
            return products
            
        except Exception as e:
            logger.error(f"Product search failed: {str(e)}")
            return []
    
    async def get_product_by_id(self, product_id: str) -> Optional[ProductInfo]:
        """Get a specific product by ID"""
        try:
            product_doc = await self.products_collection.find_one({"id": product_id})
            
            if product_doc:
                return ProductInfo(
                    id=product_doc["id"],
                    name=product_doc["name"],
                    brand=product_doc["brand"],
                    price=product_doc["price"],
                    rating=product_doc["rating"],
                    image_url=product_doc["image_url"],
                    is_ayurvedic=product_doc["is_ayurvedic"],
                    ingredients=product_doc["ingredients"]
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get product {product_id}: {str(e)}")
            return None
    
    async def get_trending_products(self, category: Optional[str] = None, limit: int = 10) -> List[ProductInfo]:
        """Get trending products (highest rated)"""
        try:
            query = {}
            if category == "ayurvedic":
                query["is_ayurvedic"] = True
            elif category == "non-ayurvedic":
                query["is_ayurvedic"] = False
            
            cursor = self.products_collection.find(query).sort([("rating", -1), ("price", 1)]).limit(limit)
            
            products = []
            async for product_doc in cursor:
                product = ProductInfo(
                    id=product_doc["id"],
                    name=product_doc["name"],
                    brand=product_doc["brand"],
                    price=product_doc["price"],
                    rating=product_doc["rating"],
                    image_url=product_doc["image_url"],
                    is_ayurvedic=product_doc["is_ayurvedic"],
                    ingredients=product_doc["ingredients"]
                )
                products.append(product)
            
            return products
            
        except Exception as e:
            logger.error(f"Failed to get trending products: {str(e)}")
            return []
    
    def _generate_cache_key(self, issue_id: str, category: Optional[str]) -> str:
        """Generate cache key for recommendations"""
        key_data = f"{issue_id}_{category or 'all'}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def invalidate_cache(self, issue_id: Optional[str] = None):
        """Invalidate recommendation cache"""
        try:
            if issue_id:
                await self.recommendations_collection.delete_many({"issue_id": issue_id})
                logger.info(f"Invalidated cache for issue {issue_id}")
            else:
                await self.recommendations_collection.delete_many({})
                logger.info("Invalidated all recommendation cache")
                
        except Exception as e:
            logger.error(f"Failed to invalidate cache: {str(e)}")
    
    async def get_recommendation_stats(self) -> Dict[str, Any]:
        """Get statistics about recommendations and products"""
        try:
            total_products = await self.products_collection.count_documents({})
            ayurvedic_products = await self.products_collection.count_documents({"is_ayurvedic": True})
            cached_recommendations = await self.recommendations_collection.count_documents({})
            
            # Get average rating
            pipeline = [
                {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
            ]
            avg_rating_result = await self.products_collection.aggregate(pipeline).to_list(1)
            avg_rating = avg_rating_result[0]["avg_rating"] if avg_rating_result else 0
            
            return {
                "total_products": total_products,
                "ayurvedic_products": ayurvedic_products,
                "non_ayurvedic_products": total_products - ayurvedic_products,
                "cached_recommendations": cached_recommendations,
                "average_rating": round(avg_rating, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get recommendation stats: {str(e)}")
            return {}