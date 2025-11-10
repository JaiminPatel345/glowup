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
import * as ImagePicker from 'expo-image-picker';
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
  const [blendRatio, setBlendRatio] = useState(0.8);

  useEffect(() => {
    loadHairstyles();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library access is required');
    }
  };

  const loadHairstyles = async () => {
    try {
      setLoadingHairstyles(true);
      const styles = await HairTryOnApi.getDefaultHairstyles(20);
      setHairstyles(styles);
    } catch (error) {
      console.error('Failed to load hairstyles:', error);
      Alert.alert('Error', 'Failed to load hairstyles');
    } finally {
      setLoadingHairstyles(false);
    }
  };

  const pickImage = async (type: 'user' | 'custom') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      // Prepare user photo
      const userPhotoBlob = await fetch(userPhotoUri).then(r => r.blob());

      // Prepare hairstyle
      let hairstyleBlob = null;
      if (customHairstyleUri) {
        hairstyleBlob = await fetch(customHairstyleUri).then(r => r.blob());
      }

      // Process
      const resultBlob = await HairTryOnApi.processHairTryOn({
        userPhoto: userPhotoBlob,
        hairstyleImage: hairstyleBlob,
        hairstyleId: selectedHairstyle?.id,
        userId: userId,
        blendRatio,
      });

      // Convert blob to URI
      const reader = new FileReader();
      reader.onloadend = () => {
        setResultUri(reader.result as string);
      };
      reader.readAsDataURL(resultBlob);

      Alert.alert('Success', 'Hair try-on completed!');
    } catch (error) {
      console.error('Failed to process hair try-on:', error);
      Alert.alert('Error', 'Failed to process hair try-on. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderHairstyleItem = (item: Hairstyle) => (
    <TouchableOpacity
      key={item.id}
      className={`w-[30%] mb-3 rounded-lg overflow-hidden border-2 ${selectedHairstyle?.id === item.id ? 'border-primary-600' : 'border-transparent'
        }`}
      onPress={() => {
        setSelectedHairstyle(item);
        setCustomHairstyleUri(null);
      }}
    >
      <Image
        source={{ uri: item.preview_image_url }}
        className="w-full aspect-square"
        resizeMode="cover"
      />
      {selectedHairstyle?.id === item.id && (
        <View className="absolute top-1 right-1 bg-primary-600 rounded-full w-6 h-6 items-center justify-center">
          <Text className="text-white text-base font-bold">✓</Text>
        </View>
      )}
      <Text className="text-xs text-center p-1 bg-gray-50" numberOfLines={1}>
        {item.style_name || 'Style'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <Text className="text-3xl font-bold text-center my-5 text-gray-800">Hair Try-On</Text>

      {/* User Photo Section */}
      <View className="bg-white mx-4 mb-4 p-4 rounded-xl shadow-sm">
        <Text className="text-lg font-semibold mb-3 text-gray-800">Your Photo</Text>
        <View className="items-center mb-3">
          {userPhotoUri ? (
            <Image source={{ uri: userPhotoUri }} className="w-52 h-52 rounded-xl" />
          ) : (
            <View className="w-52 h-52 rounded-xl bg-gray-200 justify-center items-center">
              <Text className="text-gray-500 text-sm">No photo selected</Text>
            </View>
          )}
        </View>
        <View className="flex-row justify-between">
          <TouchableOpacity className="flex-1 bg-primary-600 p-3 rounded-lg mx-1" onPress={takePhoto}>
            <Text className="text-white text-center font-semibold text-sm">Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-primary-600 p-3 rounded-lg mx-1" onPress={() => pickImage('user')}>
            <Text className="text-white text-center font-semibold text-sm">Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hairstyle Selection */}
      <View className="bg-white mx-4 mb-4 p-4 rounded-xl shadow-sm">
        <Text className="text-lg font-semibold mb-3 text-gray-800">Select Hairstyle</Text>

        {/* Custom Upload Option */}
        <TouchableOpacity
          className={`h-32 rounded-xl border-2 ${customHairstyleUri ? 'border-primary-600' : 'border-dashed border-gray-300'
            } justify-center items-center mb-3`}
          onPress={() => pickImage('custom')}
        >
          {customHairstyleUri ? (
            <Image source={{ uri: customHairstyleUri }} className="w-full h-full rounded-xl" />
          ) : (
            <Text className="text-primary-600 text-base font-semibold">+ Upload Custom Hairstyle</Text>
          )}
        </TouchableOpacity>

        {/* Default Hairstyles Grid */}
        <Text className="text-sm font-medium mt-4 mb-2 text-gray-600">Or choose from defaults:</Text>
        {loadingHairstyles ? (
          <ActivityIndicator size="large" color="#0284c7" className="my-5" />
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {hairstyles.map(renderHairstyleItem)}
          </View>
        )}
      </View>

      {/* Blend Ratio Slider */}
      <View className="bg-white mx-4 mb-4 p-4 rounded-xl shadow-sm">
        <Text className="text-lg font-semibold mb-3 text-gray-800">
          Blend Intensity: {Math.round(blendRatio * 100)}%
        </Text>
        <View className="flex-row justify-between">
          {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((value) => (
            <TouchableOpacity
              key={value}
              className={`flex-1 p-2 mx-0.5 rounded-md ${blendRatio === value ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              onPress={() => setBlendRatio(value)}
            >
              <Text className={`text-center text-xs font-semibold ${blendRatio === value ? 'text-white' : 'text-gray-700'
                }`}>
                {Math.round(value * 100)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Process Button */}
      <TouchableOpacity
        className={`p-4 rounded-xl mx-4 mb-4 ${loading ? 'bg-gray-400' : 'bg-success-600'
          }`}
        onPress={processHairTryOn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-center text-lg font-bold">Try On Hairstyle</Text>
        )}
      </TouchableOpacity>

      {/* Result Section */}
      {resultUri && (
        <View className="bg-white mx-4 mb-4 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-semibold mb-3 text-gray-800">Result</Text>
          <Image source={{ uri: resultUri }} className="w-full h-80 rounded-xl mb-3" />
          <TouchableOpacity className="bg-primary-600 p-3 rounded-lg">
            <Text className="text-white text-center font-semibold text-base">Save to Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
