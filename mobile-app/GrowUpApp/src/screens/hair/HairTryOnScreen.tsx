import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { HairTryOnApi, Hairstyle } from '../../api/hair';
import { useAppSelector } from '../../store';

export default function HairTryOnScreen() {
  // Get userId from auth state
  const { user } = useAppSelector((state) => state.auth);
  const userId = user?.id;

  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
  const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(null);
  const [customHairstyleUri, setCustomHairstyleUri] = useState<string | null>(null);
  const [userPhotoUri, setUserPhotoUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHairstyles, setLoadingHairstyles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'Male' | 'Female' | 'all'>('all');
  const [imageSelectionMode, setImageSelectionMode] = useState<'own' | 'default'>('own');

  useEffect(() => {
    loadHairstyles();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: saveStatus } = await MediaLibrary.requestPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted' || saveStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library access is required');
    }
  };

  const saveToGallery = async () => {
    if (!resultUri) return;

    try {
      // 1. Check permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to save to your gallery');
        return;
      }

      // 2. Download file if it's a remote URL
      let uriToSave = resultUri;
      if (resultUri.startsWith('http')) {
        const fileUri = FileSystem.documentDirectory + 'glowup_hair_result.jpg';
        const { uri } = await FileSystem.downloadAsync(resultUri, fileUri);
        uriToSave = uri;
      }

      // 3. Save to gallery
      await MediaLibrary.saveToLibraryAsync(uriToSave);
      Alert.alert('Saved!', 'Image saved to your gallery successfully');
    } catch (error) {
      console.error('Error saving to gallery:', error);
      Alert.alert('Error', 'Failed to save image to gallery');
    }
  };

  const loadHairstyles = async (token?: string) => {
    try {
      if (!token) {
        setLoadingHairstyles(true);
        setHairstyles([]);
      } else {
        setLoadingMore(true);
      }

      // On initial load, fetch all hairstyles from multiple tokens
      const fetchAll = !token;
      const response = await HairTryOnApi.getDefaultHairstyles(10, token, false, fetchAll);

      console.log('🔍 Loaded hairstyles count:', response.hairstyles.length);
      console.log('🔍 First 3 hairstyles:', response.hairstyles.slice(0, 3).map(h => ({ id: h.id, gender: h.gender, category: h.category })));

      // Check gender distribution
      const maleCount = response.hairstyles.filter(h => h.gender?.toLowerCase() === 'male').length;
      const femaleCount = response.hairstyles.filter(h => h.gender?.toLowerCase() === 'female').length;
      console.log(`🔍 Gender breakdown - Male: ${maleCount}, Female: ${femaleCount}`);

      if (!token) {
        setHairstyles(response.hairstyles);
      } else {
        // Filter out duplicates when appending more hairstyles
        setHairstyles(prev => {
          const existingIds = new Set(prev.map(h => h.id));
          const newHairstyles = response.hairstyles.filter(h => !existingIds.has(h.id));
          return [...prev, ...newHairstyles];
        });
      }

      setNextToken(response.next_token || null);
    } catch (error) {
      console.error('Failed to load hairstyles:', error);
      Alert.alert('Error', 'Failed to load hairstyles');
    } finally {
      setLoadingHairstyles(false);
      setLoadingMore(false);
    }
  };

  const loadMoreHairstyles = () => {
    if (nextToken && !loadingMore) {
      loadHairstyles(nextToken);
    }
  };

  const pickImage = async (type: 'user' | 'custom') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'user') {
          setUserPhotoUri(result.assets[0].uri);
          setResultUri(null); // Clear previous result
        } else {
          setCustomHairstyleUri(result.assets[0].uri);
          setSelectedHairstyle(null); // Clear default selection
          setImageSelectionMode('own');
        }
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUserPhotoUri(result.assets[0].uri);
        setResultUri(null);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const processHairTryOn = async () => {
    if (!userPhotoUri) {
      Alert.alert('Missing Photo', 'Please upload your photo first');
      return;
    }

    if (!selectedHairstyle && !customHairstyleUri) {
      Alert.alert('Missing Hairstyle', 'Please select a hairstyle or upload a custom one');
      return;
    }

    if (!userId) {
      Alert.alert('Authentication Error', 'Please log in to use this feature');
      return;
    }

    try {
      setLoading(true);

      console.log('🎨 Starting hair try-on process...', {
        userId,
        hasCustomHairstyle: !!customHairstyleUri,
        selectedHairstyleId: selectedHairstyle?.id
      });

      console.log('📦 Calling API with URIs...');

      // Process using React Native native method
      const resultUrl = await HairTryOnApi.processHairTryOnNative({
        userPhotoUri: userPhotoUri,
        hairstyleImageUri: customHairstyleUri || undefined,
        hairstyleId: selectedHairstyle?.id,
        userId: userId
      });

      console.log('✅ API call successful, result URL:', resultUrl);

      // Set the result URL directly
      setResultUri(resultUrl);

      console.log('🎉 Hair try-on completed successfully!');

      Alert.alert('Success', 'Hair try-on completed!');
    } catch (error: any) {
      console.error('❌ Failed to process hair try-on:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });

      let errorMessage = 'Failed to process hair try-on. Please try again.';
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = 'Authentication failed. Please log out and log in again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderHairstyleItem = (item: Hairstyle) => {
    // Filter by category
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return null;
    }

    return (
      <TouchableOpacity
        className={`w-[30%] mb-3 rounded-lg overflow-hidden border-2 ${selectedHairstyle?.id === item.id ? 'border-secondary-600' : 'border-transparent'
          }`}
        onPress={() => {
          setSelectedHairstyle(item);
          setCustomHairstyleUri(null);
          setImageSelectionMode('default');
        }}
      >
        <Image
          source={{ uri: item.preview_image_url }}
          className="w-full aspect-square"
          resizeMode="cover"
        />
        {selectedHairstyle?.id === item.id && (
          <View className="absolute top-1 right-1 bg-secondary-600 rounded-full w-6 h-6 items-center justify-center">
            <Text className="text-white text-base font-bold">✓</Text>
          </View>
        )}
        <Text className="text-xs text-center p-1 bg-gray-50" numberOfLines={1}>
          {item.style_name || 'Style'}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredHairstyles = hairstyles.filter(
    (item) => {
      if (selectedCategory === 'all') return true;
      // Backend returns 'gender' field with lowercase 'male'/'female'
      const itemGender = item.gender?.toLowerCase();
      return itemGender === selectedCategory.toLowerCase();
    }
  );

  console.log(`🔍 Filter - selectedCategory: ${selectedCategory}, total: ${hairstyles.length}, filtered: ${filteredHairstyles.length}`);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.springify()}
          className="bg-white px-6 pt-14 pb-6 border-b border-gray-100"
        >
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 bg-secondary-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="cut" size={20} color="#ec4899" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              Hair Try-On
            </Text>
          </View>
          <Text className="text-gray-600">
            Try different hairstyles with AI technology
          </Text>
        </Animated.View>

        {/* User Photo Section - Hide when loading or result is shown */}
        {!loading && !resultUri && (
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="bg-white mx-4 my-4 p-4 rounded-2xl shadow-sm"
          >
            <Text className="text-lg font-semibold mb-3 text-gray-800">Your Photo</Text>
            <View className="items-center mb-3">
              {userPhotoUri ? (
                <Image source={{ uri: userPhotoUri }} className="w-52 h-52 rounded-xl" />
              ) : (
                <View className="w-52 h-52 rounded-xl bg-gray-100 justify-center items-center border-2 border-dashed border-gray-300">
                  <Ionicons name="person" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-sm mt-2">No photo selected</Text>
                </View>
              )}
            </View>
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="flex-1 bg-secondary-600 p-3 rounded-xl mx-1 flex-row items-center justify-center"
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={18} color="white" />
                <Text className="text-white font-semibold text-sm ml-2">Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-secondary-600 p-3 rounded-xl mx-1 flex-row items-center justify-center"
                onPress={() => pickImage('user')}
              >
                <Ionicons name="images" size={18} color="white" />
                <Text className="text-white font-semibold text-sm ml-2">Gallery</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Hairstyle Selection - Hide when loading or result is shown */}
        {!loading && !resultUri && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-white mx-4 mb-4 p-4 rounded-2xl shadow-sm"
          >
            <Text className="text-lg font-semibold mb-3 text-gray-800">Select Hairstyle Option</Text>

            {/* Selection Mode Tabs */}
            <View className="flex-row mb-4 bg-gray-100 rounded-xl p-1">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg ${imageSelectionMode === 'own' ? 'bg-secondary-600' : 'bg-transparent'}`}
                onPress={() => setImageSelectionMode('own')}
              >
                <Text className={`text-center font-semibold ${imageSelectionMode === 'own' ? 'text-white' : 'text-gray-600'}`}>
                  Upload Own Image
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-lg ${imageSelectionMode === 'default' ? 'bg-secondary-600' : 'bg-transparent'}`}
                onPress={() => setImageSelectionMode('default')}
              >
                <Text className={`text-center font-semibold ${imageSelectionMode === 'default' ? 'text-white' : 'text-gray-600'}`}>
                  Select Default
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Upload Option */}
            {imageSelectionMode === 'own' && (
              <TouchableOpacity
                className={`h-32 rounded-xl border-2 ${customHairstyleUri ? 'border-secondary-600' : 'border-dashed border-gray-300'
                  } justify-center items-center bg-gray-50`}
                onPress={() => pickImage('custom')}
              >
                {customHairstyleUri ? (
                  <Image source={{ uri: customHairstyleUri }} className="w-full h-full rounded-xl" />
                ) : (
                  <View className="items-center">
                    <Ionicons name="cloud-upload-outline" size={32} color="#ec4899" />
                    <Text className="text-secondary-600 text-base font-semibold mt-2">
                      Upload Custom Hairstyle
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Choose a hairstyle image from your gallery
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Default Hairstyles Grid */}
            {imageSelectionMode === 'default' && (
              <>
                {/* Category Filter */}
                <View className="flex-row mb-3 bg-gray-100 rounded-xl p-1">
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg ${selectedCategory === 'all' ? 'bg-secondary-600' : 'bg-transparent'}`}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text className={`text-center text-sm font-semibold ${selectedCategory === 'all' ? 'text-white' : 'text-gray-600'}`}>
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg ${selectedCategory === 'Male' ? 'bg-secondary-600' : 'bg-transparent'}`}
                    onPress={() => setSelectedCategory('Male')}
                  >
                    <Text className={`text-center text-sm font-semibold ${selectedCategory === 'Male' ? 'text-white' : 'text-gray-600'}`}>
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg ${selectedCategory === 'Female' ? 'bg-secondary-600' : 'bg-transparent'}`}
                    onPress={() => setSelectedCategory('Female')}
                  >
                    <Text className={`text-center text-sm font-semibold ${selectedCategory === 'Female' ? 'text-white' : 'text-gray-600'}`}>
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingHairstyles ? (
                  <View className="py-8">
                    <ActivityIndicator size="large" color="#ec4899" />
                    <Text className="text-center text-gray-500 mt-3">Loading hairstyles...</Text>
                  </View>
                ) : (
                  <>
                    <View className="flex-row flex-wrap justify-between">
                      {filteredHairstyles.map((item, idx) => (
                        <React.Fragment key={idx}>
                          {renderHairstyleItem(item)}
                        </React.Fragment>
                      ))}
                    </View>

                    {/* Load More Button */}
                    {nextToken && (
                      <TouchableOpacity
                        className="mt-3 bg-secondary-100 py-3 rounded-xl flex-row items-center justify-center"
                        onPress={loadMoreHairstyles}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <ActivityIndicator size="small" color="#ec4899" />
                            <Text className="text-secondary-600 font-semibold ml-2">Loading...</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="chevron-down-circle-outline" size={20} color="#ec4899" />
                            <Text className="text-secondary-600 font-semibold ml-2">Load More Styles</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}
          </Animated.View>
        )}

        {/* Result Section */}
        {resultUri && (
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="bg-white mx-4 mb-4 p-4 rounded-2xl shadow-sm"
          >
            <Text className="text-lg font-semibold mb-3 text-gray-800">Result</Text>
            <Image source={{ uri: resultUri }} className="w-full h-96 rounded-xl mb-3" resizeMode="contain" />
            <TouchableOpacity
              className="bg-secondary-600 p-4 rounded-xl flex-row items-center justify-center shadow-md"
              onPress={saveToGallery}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text className="text-white text-center font-semibold text-base ml-2">
                Save to Gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-gray-200 p-4 rounded-xl flex-row items-center justify-center shadow-md mt-3"
              onPress={() => {
                setResultUri(null);
                setUserPhotoUri(null);
                setSelectedHairstyle(null);
                setCustomHairstyleUri(null);
              }}
            >
              <Ionicons name="refresh" size={20} color="#374151" />
              <Text className="text-gray-700 text-center font-semibold text-base ml-2">
                Try Another Style
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Processing View - Show when loading */}
        {loading && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="bg-white mx-4 mb-4 p-4 rounded-2xl shadow-sm"
          >
            <Text className="text-lg font-semibold mb-4 text-gray-800">Processing Your Look...</Text>

            {/* User Photo and Selected Hairstyle Side by Side */}
            <View className="flex-row justify-between mb-4">
              <View className="w-[48%]">
                <Text className="text-sm font-medium text-gray-600 mb-2">Your Photo</Text>
                <Image
                  source={{ uri: userPhotoUri! }}
                  className="w-full aspect-square rounded-xl"
                  resizeMode="cover"
                />
              </View>
              <View className="w-[48%]">
                <Text className="text-sm font-medium text-gray-600 mb-2">Selected Style</Text>
                <Image
                  source={{
                    uri: customHairstyleUri || selectedHairstyle?.preview_image_url
                  }}
                  className="w-full aspect-square rounded-xl"
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Processing Indicator */}
            <View className="bg-gray-50 p-6 rounded-xl items-center">
              <ActivityIndicator size="large" color="#ec4899" />
              <Text className="text-gray-700 text-base font-semibold mt-4">
                AI is creating your new look...
              </Text>
              <Text className="text-gray-500 text-sm mt-2 text-center">
                This may take 2-3 minutes. Please wait.
              </Text>
            </View>
          </Animated.View>
        )}

      </ScrollView>

      {/* Sticky Process Button at Bottom */}
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3 border-t border-gray-200 shadow-lg"
      >
        <TouchableOpacity
          className={`h-14 rounded-xl justify-center items-center flex-row shadow-lg ${loading ? 'bg-gray-400' : 'bg-secondary-600'
            }`}
          onPress={processHairTryOn}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white text-base font-bold ml-2">Processing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="color-wand" size={22} color="#ffffff" />
              <Text className="text-white text-base font-bold ml-2">Try On Hairstyle</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View >
  );
}
