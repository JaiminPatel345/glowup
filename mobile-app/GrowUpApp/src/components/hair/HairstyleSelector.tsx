import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface HairstyleOption {
  id: string;
  name: string;
  imageUrl: string;
  category: 'short' | 'medium' | 'long' | 'curly' | 'straight' | 'wavy';
}

interface HairstyleSelectorProps {
  onStyleSelected: (styleImageUri: string, styleName?: string) => void;
  onColorSelected?: (colorImageUri: string) => void;
  selectedStyle?: string;
  selectedColor?: string;
  allowCustomUpload?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const itemWidth = (screenWidth - 48) / 3; // 3 columns with padding

// Predefined hairstyle options (in a real app, these would come from an API)
const PREDEFINED_STYLES: HairstyleOption[] = [
  {
    id: '1',
    name: 'Short Bob',
    imageUrl: 'https://example.com/styles/short-bob.jpg',
    category: 'short',
  },
  {
    id: '2',
    name: 'Long Waves',
    imageUrl: 'https://example.com/styles/long-waves.jpg',
    category: 'long',
  },
  {
    id: '3',
    name: 'Pixie Cut',
    imageUrl: 'https://example.com/styles/pixie-cut.jpg',
    category: 'short',
  },
  {
    id: '4',
    name: 'Beach Waves',
    imageUrl: 'https://example.com/styles/beach-waves.jpg',
    category: 'wavy',
  },
  {
    id: '5',
    name: 'Straight Long',
    imageUrl: 'https://example.com/styles/straight-long.jpg',
    category: 'straight',
  },
  {
    id: '6',
    name: 'Curly Medium',
    imageUrl: 'https://example.com/styles/curly-medium.jpg',
    category: 'curly',
  },
];

const COLOR_OPTIONS = [
  { id: 'blonde', name: 'Blonde', color: '#F5DEB3' },
  { id: 'brown', name: 'Brown', color: '#8B4513' },
  { id: 'black', name: 'Black', color: '#000000' },
  { id: 'red', name: 'Red', color: '#DC143C' },
  { id: 'gray', name: 'Gray', color: '#808080' },
  { id: 'purple', name: 'Purple', color: '#800080' },
];

export const HairstyleSelector: React.FC<HairstyleSelectorProps> = ({
  onStyleSelected,
  onColorSelected,
  selectedStyle,
  selectedColor,
  allowCustomUpload = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customStyleUri, setCustomStyleUri] = useState<string | null>(null);
  const [customColorUri, setCustomColorUri] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'short', name: 'Short' },
    { id: 'medium', name: 'Medium' },
    { id: 'long', name: 'Long' },
    { id: 'curly', name: 'Curly' },
    { id: 'straight', name: 'Straight' },
    { id: 'wavy', name: 'Wavy' },
  ];

  const filteredStyles = selectedCategory === 'all' 
    ? PREDEFINED_STYLES 
    : PREDEFINED_STYLES.filter(style => style.category === selectedCategory);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library.'
      );
      return false;
    }
    return true;
  };

  const pickCustomStyle = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setCustomStyleUri(uri);
        onStyleSelected(uri, 'Custom Style');
      }
    } catch (error) {
      console.error('Error picking custom style:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const pickCustomColor = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setCustomColorUri(uri);
        if (onColorSelected) {
          onColorSelected(uri);
        }
      }
    } catch (error) {
      console.error('Error picking custom color:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const renderStyleItem = (style: HairstyleOption) => (
    <TouchableOpacity
      key={style.id}
      onPress={() => onStyleSelected(style.imageUrl, style.name)}
      className={`mb-4 rounded-lg overflow-hidden ${
        selectedStyle === style.imageUrl ? 'border-2 border-blue-500' : 'border border-gray-200'
      }`}
      style={{ width: itemWidth }}
    >
      <Image
        source={{ uri: style.imageUrl }}
        className="w-full h-24"
        resizeMode="cover"
        defaultSource={require('../../../assets/icon.png')} // Fallback image
      />
      <View className="p-2 bg-white">
        <Text className="text-xs font-medium text-gray-800 text-center">
          {style.name}
        </Text>
      </View>
      
      {selectedStyle === style.imageUrl && (
        <View className="absolute top-1 right-1 p-1 bg-blue-500 rounded-full">
          <Ionicons name="checkmark" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderColorOption = (color: typeof COLOR_OPTIONS[0]) => (
    <TouchableOpacity
      key={color.id}
      onPress={() => onColorSelected && onColorSelected(color.id)}
      className={`w-12 h-12 rounded-full mr-3 border-2 ${
        selectedColor === color.id ? 'border-blue-500' : 'border-gray-300'
      }`}
      style={{ backgroundColor: color.color }}
    >
      {selectedColor === color.id && (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Hairstyle Selection */}
      <View className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Choose Hairstyle
        </Text>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 mr-2 rounded-full ${
                selectedCategory === category.id
                  ? 'bg-blue-600'
                  : 'bg-white border border-gray-300'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategory === category.id ? 'text-white' : 'text-gray-700'
                }`}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom Upload Option */}
        {allowCustomUpload && (
          <TouchableOpacity
            onPress={pickCustomStyle}
            className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg items-center"
          >
            <Ionicons name="cloud-upload-outline" size={32} color="#6B7280" />
            <Text className="text-gray-600 text-sm mt-2">
              Upload Custom Hairstyle
            </Text>
            {customStyleUri && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-green-600 text-xs ml-1">Custom style selected</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Predefined Styles Grid */}
        <View className="flex-row flex-wrap justify-between">
          {filteredStyles.map(renderStyleItem)}
        </View>
      </View>

      {/* Hair Color Selection */}
      {onColorSelected && (
        <View className="p-4 border-t border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Hair Color (Optional)
          </Text>

          {/* Custom Color Upload */}
          <TouchableOpacity
            onPress={pickCustomColor}
            className="mb-4 p-3 border border-gray-300 rounded-lg flex-row items-center"
          >
            <Ionicons name="color-palette-outline" size={24} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-3">
              Upload Custom Color Reference
            </Text>
            {customColorUri && (
              <View className="ml-auto">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              </View>
            )}
          </TouchableOpacity>

          {/* Predefined Colors */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {COLOR_OPTIONS.map(renderColorOption)}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

export default HairstyleSelector;