import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { setProductFilter } from '../../store/slices/skinAnalysisSlice';
import { ProductRecommendations as ProductRecommendationsType, Product } from '../../api/types';

interface ProductRecommendationsProps {
  recommendations: ProductRecommendationsType;
  issueId: string;
}

const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  recommendations,
  issueId,
}) => {
  const dispatch = useAppDispatch();
  const { productFilter } = useAppSelector((state) => state.skinAnalysis);

  const getFilteredProducts = (): Product[] => {
    switch (productFilter) {
      case 'ayurvedic':
        return recommendations.ayurvedicProducts || [];
      case 'non-ayurvedic':
        return recommendations.nonAyurvedicProducts || [];
      case 'all':
      default:
        return recommendations.allProducts || [];
    }
  };

  const filteredProducts = getFilteredProducts();

  const getFilterButtonStyle = (filter: typeof productFilter) => {
    const isActive = productFilter === filter;
    return `px-4 py-2 rounded-full border ${
      isActive
        ? 'bg-blue-500 border-blue-500'
        : 'bg-white border-gray-300'
    }`;
  };

  const getFilterTextStyle = (filter: typeof productFilter) => {
    const isActive = productFilter === filter;
    return `font-medium ${isActive ? 'text-white' : 'text-gray-700'}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐'); // Using full star for simplicity
    }
    
    return stars.join('');
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <View>
      {/* Filter Tabs */}
      <View className="flex-row space-x-3 mb-4">
        <TouchableOpacity
          className={getFilterButtonStyle('all')}
          onPress={() => dispatch(setProductFilter('all'))}
        >
          <Text className={getFilterTextStyle('all')}>
            All ({(recommendations.allProducts || []).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={getFilterButtonStyle('ayurvedic')}
          onPress={() => dispatch(setProductFilter('ayurvedic'))}
        >
          <Text className={getFilterTextStyle('ayurvedic')}>
            Ayurvedic ({(recommendations.ayurvedicProducts || []).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className={getFilterButtonStyle('non-ayurvedic')}
          onPress={() => dispatch(setProductFilter('non-ayurvedic'))}
        >
          <Text className={getFilterTextStyle('non-ayurvedic')}>
            Non-Ayurvedic ({(recommendations.nonAyurvedicProducts || []).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <View className="bg-gray-50 rounded-lg p-6 items-center">
          <Text className="text-gray-600 text-center">
            No products found for the selected filter.
          </Text>
        </View>
      ) : (
        <ScrollView className="space-y-4">
          {filteredProducts.map((product) => (
            <View
              key={product.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <View className="flex-row">
                {/* Product Image */}
                <Image
                  source={{ uri: product.imageUrl }}
                  className="w-20 h-20 rounded-lg mr-4"
                  resizeMode="cover"
                />
                
                {/* Product Details */}
                <View className="flex-1">
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className="text-lg font-semibold text-gray-900 flex-1 mr-2">
                      {product.name}
                    </Text>
                    {product.isAyurvedic && (
                      <View className="bg-green-100 px-2 py-1 rounded-full">
                        <Text className="text-green-800 text-xs font-medium">
                          🌿 Ayurvedic
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Text className="text-gray-600 mb-2">
                    by {product.brand}
                  </Text>
                  
                  {/* Rating and Price */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <Text className="text-yellow-500 mr-1">
                        {renderStars(product.rating)}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        ({product.rating.toFixed(1)})
                      </Text>
                    </View>
                    <Text className="text-lg font-bold text-blue-600">
                      {formatPrice(product.price)}
                    </Text>
                  </View>
                  
                  {/* Key Ingredients */}
                  {product.ingredients.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-sm font-medium text-gray-700 mb-1">
                        Key Ingredients:
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {product.ingredients.slice(0, 3).join(', ')}
                        {product.ingredients.length > 3 && '...'}
                      </Text>
                    </View>
                  )}
                  
                  {/* Action Buttons */}
                  <View className="flex-row space-x-2">
                    <TouchableOpacity className="flex-1 bg-blue-500 py-2 px-4 rounded-lg">
                      <Text className="text-white text-center font-medium">
                        View Details
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 bg-gray-100 py-2 px-4 rounded-lg">
                      <Text className="text-gray-700 text-center font-medium">
                        Add to Cart
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Disclaimer */}
      <View className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <Text className="text-yellow-800 text-sm">
          <Text className="font-semibold">Disclaimer:</Text> These recommendations are based on AI analysis. 
          Please consult with a dermatologist for professional medical advice, especially for persistent or severe skin issues.
        </Text>
      </View>
    </View>
  );
};

export default ProductRecommendations;