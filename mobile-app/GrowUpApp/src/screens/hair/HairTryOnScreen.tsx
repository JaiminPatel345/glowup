import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { HairTryOnApi, Hairstyle } from '../../api/hair';
import { useAppSelector } from '../../store';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const ITEM_SIZE = (width - 40) / GRID_COLUMNS;

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
      style={[
        styles.hairstyleItem,
        selectedHairstyle?.id === item.id && styles.selectedHairstyle,
      ]}
      onPress={() => {
        setSelectedHairstyle(item);
        setCustomHairstyleUri(null);
      }}
    >
      <Image
        source={{ uri: item.preview_image_url }}
        style={styles.hairstyleImage}
        resizeMode="cover"
      />
      {selectedHairstyle?.id === item.id && (
        <View style={styles.selectedOverlay}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
      )}
      <Text style={styles.hairstyleName} numberOfLines={1}>
        {item.style_name || 'Style'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Hair Try-On</Text>

      {/* User Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Photo</Text>
        <View style={styles.photoContainer}>
          {userPhotoUri ? (
            <Image source={{ uri: userPhotoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.placeholderText}>No photo selected</Text>
            </View>
          )}
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => pickImage('user')}>
            <Text style={styles.buttonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hairstyle Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Hairstyle</Text>

        {/* Custom Upload Option */}
        <TouchableOpacity
          style={[styles.customUploadButton, customHairstyleUri && styles.customUploadActive]}
          onPress={() => pickImage('custom')}
        >
          {customHairstyleUri ? (
            <Image source={{ uri: customHairstyleUri }} style={styles.customUploadImage} />
          ) : (
            <Text style={styles.customUploadText}>+ Upload Custom Hairstyle</Text>
          )}
        </TouchableOpacity>

        {/* Default Hairstyles Grid */}
        <Text style={styles.subsectionTitle}>Or choose from defaults:</Text>
        {loadingHairstyles ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <View style={styles.hairstylesGrid}>
            {hairstyles.map(renderHairstyleItem)}
          </View>
        )}
      </View>

      {/* Blend Ratio Slider */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blend Intensity: {Math.round(blendRatio * 100)}%</Text>
        <View style={styles.sliderContainer}>
          {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.sliderButton,
                blendRatio === value && styles.sliderButtonActive,
              ]}
              onPress={() => setBlendRatio(value)}
            >
              <Text style={styles.sliderButtonText}>{Math.round(value * 100)}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Process Button */}
      <TouchableOpacity
        style={[styles.processButton, loading && styles.processButtonDisabled]}
        onPress={processHairTryOn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.processButtonText}>Try On Hairstyle</Text>
        )}
      </TouchableOpacity>

      {/* Result Section */}
      {resultUri && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <Image source={{ uri: resultUri }} style={styles.resultImage} />
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save to Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 10,
    color: '#666',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  customUploadButton: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  customUploadActive: {
    borderColor: '#007AFF',
    borderStyle: 'solid',
  },
  customUploadText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customUploadImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  hairstylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hairstyleItem: {
    width: ITEM_SIZE,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedHairstyle: {
    borderColor: '#007AFF',
  },
  hairstyleImage: {
    width: '100%',
    height: ITEM_SIZE,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hairstyleName: {
    fontSize: 11,
    textAlign: 'center',
    padding: 4,
    backgroundColor: '#f9f9f9',
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    flex: 1,
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  sliderButtonActive: {
    backgroundColor: '#007AFF',
  },
  sliderButtonText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  processButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  processButtonDisabled: {
    backgroundColor: '#ccc',
  },
  processButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
  bottomSpacer: {
    height: 30,
  },
});
