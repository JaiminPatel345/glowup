import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  rating: number;
  image: string;
  category: string;
  isAyurvedic?: boolean;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'glowup 1 acne',
    brand: 'GlowUp',
    price: 29.99,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
    category: 'Serum',
    isAyurvedic: true,
  },
  {
    id: '2',
    name: 'glowup 2 dryness',
    brand: 'GlowUp',
    price: 19.99,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
    category: 'Face Mask',
    isAyurvedic: true,
  },
  {
    id: '3',
    name: 'glowup 3 pigmentation',
    brand: 'GlowUp',
    price: 34.99,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=400&fit=crop',
    category: 'Moisturizer',
    isAyurvedic: false,
  },
  {
    id: '4',
    name: 'glowup 1 dark circles',
    brand: 'GlowUp',
    price: 14.99,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=400&h=400&fit=crop',
    category: 'Cleanser',
    isAyurvedic: true,
  },
];

const CATEGORIES = ['All', 'Cleanser', 'Serum', 'Moisturizer', 'Face Mask', 'Ayurvedic'];

const ProductsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState(MOCK_PRODUCTS);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      product.category === selectedCategory ||
      (selectedCategory === 'Ayurvedic' && product.isAyurvedic);
    return matchesSearch && matchesCategory;
  });

  const handleBuyNow = async (productName: string) => {
    try {
      // Create Amazon search URL with product name
      const searchQuery = encodeURIComponent(productName + ' skincare');
      const amazonUrl = `https://www.amazon.com/s?k=${searchQuery}`;
      
      // Check if the link can be opened
      const canOpen = await Linking.canOpenURL(amazonUrl);
      
      if (canOpen) {
        await Linking.openURL(amazonUrl);
      } else {
        console.error('Cannot open Amazon URL');
      }
    } catch (error) {
      console.error('Error opening Amazon:', error);
    }
  };

  const ProductCard = ({ product, index }: { product: Product; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden"
    >
      <TouchableOpacity activeOpacity={0.7} className="flex-row p-4">
        <View className="w-24 h-24 bg-gray-100 rounded-xl mr-4">
          <Image
            source={{ uri: product.image }}
            className="w-full h-full rounded-xl"
            resizeMode="cover"
          />
        </View>
        
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs text-gray-500 mr-2">{product.brand}</Text>
            {product.isAyurvedic && (
              <View className="bg-green-100 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-green-700 font-medium">Ayurvedic</Text>
              </View>
            )}
          </View>
          
          <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={2}>
            {product.name}
          </Text>
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text className="text-sm text-gray-600 ml-1">{product.rating}</Text>
            <Text className="text-sm text-gray-400 ml-1">• {product.category}</Text>
          </View>
          
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-primary-600">
              ${product.price.toFixed(2)}
            </Text>
            <TouchableOpacity 
              className="bg-primary-600 px-4 py-2 rounded-lg"
              onPress={() => handleBuyNow(product.name)}
            >
              <Text className="text-white text-sm font-medium">Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 pt-14 pb-6 border-b border-gray-100">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Products
          </Text>
          <Text className="text-gray-600">
            Discover skincare products for your needs
          </Text>
        </View>

        <View className="px-6 py-4">
          {/* Search Bar */}
          <View className="bg-white rounded-xl px-4 py-3 mb-4 flex-row items-center shadow-sm">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-base text-gray-900"
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`mr-3 px-4 py-2 rounded-full ${
                  selectedCategory === category
                    ? 'bg-primary-600'
                    : 'bg-white border border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === category
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="search" size={48} color="#d1d5db" />
              <Text className="text-gray-500 text-lg mt-4">No products found</Text>
              <Text className="text-gray-400 text-sm mt-2">Try a different search or category</Text>
            </View>
          ) : (
            <View>
              <Text className="text-gray-600 mb-4">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
              </Text>
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ProductsScreen;
