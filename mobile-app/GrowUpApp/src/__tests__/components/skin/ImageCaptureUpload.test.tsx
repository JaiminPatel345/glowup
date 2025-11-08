import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { request, RESULTS } from 'react-native-permissions';
import ImageCaptureUpload from '../../../components/skin/ImageCaptureUpload';

// Mock the dependencies
jest.mock('react-native-image-picker');
jest.mock('react-native-permissions');

const mockLaunchCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;
const mockLaunchImageLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockRequest = request as jest.MockedFunction<typeof request>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('ImageCaptureUpload', () => {
  const mockOnImageCapture = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue(RESULTS.GRANTED);
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

    // Simulate selecting camera option
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    expect(mockRequest).toHaveBeenCalled();
  });

  it('should show permission denied alert when camera permission denied', async () => {
    mockRequest.mockResolvedValue(RESULTS.DENIED);
    
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate selecting camera option
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

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

    // Simulate selecting camera option
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1024,
          maxHeight: 1024,
          includeBase64: false,
        }),
        expect.any(Function)
      );
    });
  });

  it('should launch image library when gallery option selected', () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate selecting photo library option
    const alertCall = mockAlert.mock.calls[0];
    const libraryOption = alertCall[2]?.find((option: any) => option.text === 'Photo Library');
    
    if (libraryOption?.onPress) {
      libraryOption.onPress();
    }

    expect(mockLaunchImageLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
      }),
      expect.any(Function)
    );
  });

  it('should process valid image response correctly', () => {
    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024, // 1MB
      }],
    };

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate camera launch and response
    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    expect(mockOnImageCapture).toHaveBeenCalledWith(expect.any(FormData));
  });

  it('should reject oversized images', () => {
    const mockImageResponse = {
      assets: [{
        uri: 'file://large-image.jpg',
        fileName: 'large-image.jpg',
        type: 'image/jpeg',
        fileSize: 15 * 1024 * 1024, // 15MB (over 10MB limit)
      }],
    };

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate camera launch and response
    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      'Image size must be less than 10MB'
    );
    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should reject unsupported file types', () => {
    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.gif',
        fileName: 'test-image.gif',
        type: 'image/gif',
        fileSize: 1024 * 1024,
      }],
    };

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate camera launch and response
    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      'Please select a JPEG or PNG image'
    );
    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should handle cancelled image selection', () => {
    const mockImageResponse = {
      didCancel: true,
    };

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate camera launch and cancellation
    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should handle image picker errors', () => {
    const mockImageResponse = {
      errorMessage: 'Camera not available',
    };

    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate camera launch and error
    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    expect(mockOnImageCapture).not.toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByText } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} disabled={true} />
    );

    const button = getByText('Take or Select Photo');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should show selected image preview', () => {
    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      }],
    };

    const { getByText, getByDisplayValue } = render(
      <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
    );

    fireEvent.press(getByText('Take or Select Photo'));

    // Simulate image selection
    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    // Should show "Change Photo" button after selection
    expect(getByText('Change Photo')).toBeTruthy();
    expect(getByText('Analyze This Photo')).toBeTruthy();
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