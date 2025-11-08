import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ImageCaptureUpload from '../../../components/skin/ImageCaptureUpload';

// Mock the dependencies
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockRequestCameraPermissionsAsync = ImagePicker.requestCameraPermissionsAsync as jest.MockedFunction<typeof ImagePicker.requestCameraPermissionsAsync>;
const mockLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.MockedFunction<typeof ImagePicker.launchCameraAsync>;
const mockLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<typeof ImagePicker.launchImageLibraryAsync>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

const selectAlertOption = async (label: string) => {
  const alertCall = mockAlert.mock.calls[mockAlert.mock.calls.length - 1];
  const options = alertCall?.[2] as Array<{ text: string; onPress?: () => void }> | undefined;
  const option = options?.find((item) => item.text === label);
  if (option?.onPress) {
    await act(async () => {
      await option.onPress?.();
    });
  }
};

describe('ImageCaptureUpload', () => {
  const mockOnImageCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnImageCapture.mockClear();
    mockRequestCameraPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
      permissions: {} as any,
    } as ImagePicker.PermissionResponse);
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true } as ImagePicker.ImagePickerResult);
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true } as ImagePicker.ImagePickerResult);
  });

  it('should render upload interface correctly', () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    expect(getByText('Upload Your Photo')).toBeTruthy();
    expect(getByText('Take or Select Photo')).toBeTruthy();
    expect(getByText('📸 Photo Guidelines')).toBeTruthy();
    expect(getByText(/Ensure good lighting/)).toBeTruthy();
  });

  it('should show image source options when button pressed', () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    expect(mockAlert).toHaveBeenCalledWith(
      'Select Image Source',
      'Choose how you want to provide your photo',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Camera' }),
        expect.objectContaining({ text: 'Photo Library' }),
        expect.objectContaining({ text: 'Cancel' }),
      ])
    );
  });

  it('should request camera permission before launching camera', async () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
  });

  it('should show permission denied alert when camera permission denied', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
      expires: 'never',
      permissions: {} as any,
    } as ImagePicker.PermissionResponse);
    
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Camera Permission Required',
        'Please grant camera permission to take photos for skin analysis.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Settings' }),
        ])
      );
    });
  });

  it('should launch camera with correct options when permission granted', async () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    await waitFor(() => {
      expect(mockLaunchCameraAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
          aspect: [4, 3],
        })
      );
    });
  });

  it('should launch image library when gallery option selected', async () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Photo Library');

    expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        aspect: [4, 3],
      })
    );
  });

  it('should process valid image response correctly', async () => {
    const mockImageResponse = {
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
  type: 'image',
        fileSize: 1024 * 1024, // 1MB
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult;

    mockLaunchCameraAsync.mockResolvedValueOnce(mockImageResponse);

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    await waitFor(() => {
      expect(mockOnImageCapture).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it('should reject oversized images', async () => {
    const mockImageResponse = {
      canceled: false,
      assets: [{
        uri: 'file://large-image.jpg',
        fileName: 'large-image.jpg',
  type: 'image',
        fileSize: 15 * 1024 * 1024, // 15MB (over 10MB limit)
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult;

    mockLaunchCameraAsync.mockResolvedValueOnce(mockImageResponse);

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Image size must be less than 10MB'
      );
    });
    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should reject unsupported file types', async () => {
    const mockImageResponse = {
      canceled: false,
      assets: [{
  uri: 'file://test-image.gif',
  fileName: 'test-image.gif',
  type: 'image',
        fileSize: 1024 * 1024,
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult;

    mockLaunchCameraAsync.mockResolvedValueOnce(mockImageResponse);

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Please select a JPEG or PNG image'
      );
    });
    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should handle cancelled image selection', async () => {
    const mockImageResponse = {
      canceled: true,
    } as ImagePicker.ImagePickerResult;

    mockLaunchCameraAsync.mockResolvedValueOnce(mockImageResponse);

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    await selectAlertOption('Camera');

    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByRole } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} disabled={true} />
    );

    const button = getByRole('button', { name: /Take or Select Photo/i });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('should show selected image preview', async () => {
    const mockImageResponse = {
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
  type: 'image',
        fileSize: 1024 * 1024,
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult;

    mockLaunchCameraAsync.mockResolvedValueOnce(mockImageResponse);

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate image selection
    await selectAlertOption('Camera');

    // Should show "Change Photo" button after selection
    await waitFor(() => {
      expect(getByText('Change Photo')).toBeTruthy();
      expect(getByText('Analyze This Photo')).toBeTruthy();
    });
  });

  it('should have proper accessibility labels', () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    const uploadButton = getByText('Take or Select Photo');
    expect(uploadButton).toBeTruthy();
    
    // Check that guidelines are accessible
    expect(getByText('📸 Photo Guidelines')).toBeTruthy();
    expect(getByText(/Ensure good lighting/)).toBeTruthy();
  });
});