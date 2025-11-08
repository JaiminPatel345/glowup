import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../common';

interface ImageCaptureUploadProps {
  onImageCapture: (imageFormData: FormData) => void;
  disabled?: boolean;
}

const ImageCaptureUpload: React.FC<ImageCaptureUploadProps> = ({
  onImageCapture,
  disabled = false,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const createFormData = (imageUri: string, fileName: string, type: string): FormData => {
    const formData = new FormData();
    
    formData.append('image', {
      uri: imageUri,
      type: type,
      name: fileName,
    } as any);

    return formData;
  };

  const processImageResponse = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      Alert.alert('Error', 'Failed to process the selected image');
      return;
    }

    // Validate image
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) { // 10MB limit
      Alert.alert('Error', 'Image size must be less than 10MB');
      return;
    }

    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const normalizedType = asset.type && asset.type !== 'image' ? asset.type : undefined;
    const extension = asset.uri.split('.').pop()?.toLowerCase();
    const inferredType = extension === 'png'
      ? 'image/png'
      : extension === 'jpg' || extension === 'jpeg'
        ? 'image/jpeg'
        : undefined;

    const fileType = normalizedType ?? inferredType;
    if (!fileType || !supportedTypes.includes(fileType)) {
      Alert.alert('Error', 'Please select a JPEG or PNG image');
      return;
    }

    setSelectedImage(asset.uri);
    setIsProcessing(true);

    try {
  const fileName = asset.fileName || `image_${Date.now()}.jpg`;
  const formData = createFormData(asset.uri, fileName, fileType);
      
      onImageCapture(formData);
    } catch (error) {
      console.error('Error creating form data:', error);
      Alert.alert('Error', 'Failed to process the image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraCapture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to take photos for skin analysis.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {/* Open settings */} },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      aspect: [4, 3],
    });

    await processImageResponse(result);
  };

  const handleGallerySelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      aspect: [4, 3],
    });

    await processImageResponse(result);
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Select Image Source',
      'Choose how you want to provide your photo',
      [
        {
          text: 'Camera',
          onPress: handleCameraCapture,
        },
        {
          text: 'Photo Library',
          onPress: handleGallerySelect,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View className="bg-white rounded-lg p-6 mb-4">
      <Text className="text-lg font-semibold text-gray-900 mb-4">
        Upload Your Photo
      </Text>
      
      {/* Image Preview */}
      {selectedImage && (
        <View className="mb-4">
          <Image
            source={{ uri: selectedImage }}
            className="w-full h-48 rounded-lg"
            resizeMode="cover"
          />
        </View>
      )}

      {/* Upload Instructions */}
      <View className="bg-blue-50 rounded-lg p-4 mb-4">
        <Text className="text-blue-800 font-medium mb-2">
          📸 Photo Guidelines
        </Text>
        <Text className="text-blue-700 text-sm">
          • Ensure good lighting (natural light preferred){'\n'}
          • Face should be clearly visible and centered{'\n'}
          • Remove makeup for best results{'\n'}
          • Keep a neutral expression{'\n'}
          • Avoid shadows on your face
        </Text>
      </View>

      {/* Upload Buttons */}
      <View className="space-y-3">
        <Button
          title={selectedImage ? "Change Photo" : "Take or Select Photo"}
          onPress={showImageSourceOptions}
          disabled={disabled || isProcessing}
          className="w-full"
        />
        
        {selectedImage && !isProcessing && (
          <Button
            title="Analyze This Photo"
            onPress={() => {
              if (selectedImage) {
                // Re-trigger analysis with current image
                const fileName = `image_${Date.now()}.jpg`;
                const formData = createFormData(selectedImage, fileName, 'image/jpeg');
                onImageCapture(formData);
              }
            }}
            disabled={disabled}
            className="w-full"
          />
        )}
      </View>

      {/* Processing State */}
      {isProcessing && (
        <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <Text className="text-yellow-800 text-center">
            Processing image...
          </Text>
        </View>
      )}
    </View>
  );
};

export default ImageCaptureUpload;