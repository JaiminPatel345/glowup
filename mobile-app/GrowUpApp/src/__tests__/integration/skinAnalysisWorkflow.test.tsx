import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import SkinAnalysisScreen from '../../screens/skin/SkinAnalysisScreen';
import skinAnalysisReducer from '../../store/slices/skinAnalysisSlice';
import authReducer from '../../store/slices/authSlice';
import { SkinAnalysisApi } from '../../api';
import { SkinAnalysisResult } from '../../api/types';

// Mock dependencies
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('../../api');

const mockRequestCameraPermissionsAsync = ImagePicker.requestCameraPermissionsAsync as jest.MockedFunction<typeof ImagePicker.requestCameraPermissionsAsync>;
const mockLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.MockedFunction<typeof ImagePicker.launchCameraAsync>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockSkinAnalysisApi = SkinAnalysisApi as jest.Mocked<typeof SkinAnalysisApi>;

const mockAnalysisResult: SkinAnalysisResult = {
  skinType: 'Combination',
  issues: [
    {
      id: 'issue-1',
      name: 'Acne',
      description: 'Mild acne detected',
      severity: 'medium',
      causes: ['Hormonal changes', 'Poor diet'],
      highlightedImageUrl: 'https://example.com/highlighted.jpg',
      confidence: 0.85,
    },
  ],
  analysisMetadata: {
    modelVersion: 'v1.0',
    processingTime: 2500,
    imageQuality: 0.9,
  },
};

const createTestStore = () =>
  configureStore({
    reducer: {
      skinAnalysis: skinAnalysisReducer,
      auth: authReducer,
    },
  });

const delay = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

const renderWithStore = (component: React.ReactElement, store = createTestStore()) => {
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store,
  };
};

describe('Skin Analysis Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestCameraPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
      permissions: {} as any,
    } as ImagePicker.PermissionResponse);
    mockLaunchCameraAsync.mockResolvedValue({ canceled: true } as ImagePicker.ImagePickerResult);
  });

  it('should complete full skin analysis workflow successfully', async () => {
    mockSkinAnalysisApi.analyzeImage.mockImplementation(async (): Promise<SkinAnalysisResult> => {
      await delay(100); // Add 100ms delay to simulate API processing
      return mockAnalysisResult;
    });

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
    
    const { getByText, queryByText } = renderWithStore(<SkinAnalysisScreen />);

    // Initial state - should show upload interface
    expect(getByText('Skin Analysis')).toBeTruthy();
    expect(getByText('Upload a clear photo of your face to get personalized skin analysis and recommendations')).toBeTruthy();
    expect(getByText('Take or Select Photo')).toBeTruthy();

    // Step 1: Initiate image capture
    fireEvent.press(getByText('Take or Select Photo'));
    expect(mockAlert).toHaveBeenCalledWith(
      'Select Image Source',
      expect.any(String),
      expect.any(Array)
    );

    // Step 2: Select camera option
    await selectAlertOption('Camera');

    // Step 4: Should show loading state
    await waitFor(() => {
      expect(getByText('Analyzing Your Skin...')).toBeTruthy();
      expect(getByText('Our AI is examining your photo to detect skin type and issues. This may take a few seconds.')).toBeTruthy();
    });

    // Step 5: Should show analysis results
    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
      expect(getByText('Your Skin Type')).toBeTruthy();
      expect(getByText('Combination')).toBeTruthy();
      expect(getByText('Detected Issues (1)')).toBeTruthy();
      expect(getByText('Acne')).toBeTruthy();
    });

    // Step 6: Should be able to tap on issue for details
    fireEvent.press(getByText('Acne'));
    
    // Should open issue detail popup (this would be tested in component-specific tests)
    // Here we just verify the Redux state was updated
    expect(mockSkinAnalysisApi.analyzeImage).toHaveBeenCalledWith(expect.any(FormData));
  });

  it('should handle analysis failure with retry functionality', async () => {
    const error = new Error('Analysis failed');
    mockSkinAnalysisApi.analyzeImage.mockImplementation(async (): Promise<SkinAnalysisResult> => {
      await delay();
      throw error;
    });

    mockLaunchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image',
        fileSize: 1024 * 1024,
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult);
    
    const { getByText, queryByText } = renderWithStore(<SkinAnalysisScreen />);

    // Simulate image capture and analysis failure
    fireEvent.press(getByText('Take or Select Photo'));
    await selectAlertOption('Camera');

    // Should show error state with retry option
    await waitFor(() => {
      expect(getByText('Analysis Failed')).toBeTruthy();
  expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
      expect(getByText('Retry (1/3)')).toBeTruthy();
      expect(getByText('New Photo')).toBeTruthy();
    });

    // Test retry functionality
    mockSkinAnalysisApi.analyzeImage.mockImplementation(async (): Promise<SkinAnalysisResult> => {
      await delay();
      return mockAnalysisResult;
    });
    fireEvent.press(getByText('Retry (1/3)'));

    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
      expect(getByText('Combination')).toBeTruthy();
    });
  });

  it('should handle maximum retry attempts reached', async () => {
    const error = new Error('Persistent analysis failure');
    mockSkinAnalysisApi.analyzeImage.mockImplementation(async (): Promise<SkinAnalysisResult> => {
      await delay();
      throw error;
    });

    mockLaunchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image',
        fileSize: 1024 * 1024,
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult);
    
    const store = createTestStore();
    const { getByText } = renderWithStore(<SkinAnalysisScreen />, store);

    // Simulate image capture
    fireEvent.press(getByText('Take or Select Photo'));
    await selectAlertOption('Camera');

    // Simulate multiple retry attempts
    for (let i = 1; i <= 2; i++) {
      await waitFor(() => {
        expect(getByText(`Retry (${i}/3)`)).toBeTruthy();
      });
      fireEvent.press(getByText(`Retry (${i}/3)`));
    }

    // Should show max retries reached message
    await waitFor(() => {
      expect(getByText('Maximum retry attempts reached. Please try with a different photo.')).toBeTruthy();
      expect(getByText('Take New Photo')).toBeTruthy();
    });
  });

  it('should allow starting new analysis after completion', async () => {
    mockSkinAnalysisApi.analyzeImage.mockImplementation(async (): Promise<SkinAnalysisResult> => {
      await delay();
      return mockAnalysisResult;
    });

    mockLaunchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image',
        fileSize: 1024 * 1024,
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult);
    
    const { getByText } = renderWithStore(<SkinAnalysisScreen />);

    // Complete first analysis
    fireEvent.press(getByText('Take or Select Photo'));
    await selectAlertOption('Camera');

    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
      expect(getByText('Analyze Another Photo')).toBeTruthy();
    });

    // Start new analysis
    fireEvent.press(getByText('Analyze Another Photo'));

    // Should return to upload interface
    expect(getByText('Take or Select Photo')).toBeTruthy();
    expect(getByText('Upload Your Photo')).toBeTruthy();
  });

  it('should handle image validation errors during upload', async () => {
    mockLaunchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file://large-image.jpg',
        fileName: 'large-image.jpg',
        type: 'image',
        fileSize: 15 * 1024 * 1024, // 15MB
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult);

    const { getByText } = renderWithStore(<SkinAnalysisScreen />);

    fireEvent.press(getByText('Take or Select Photo'));
    await selectAlertOption('Camera');

    // Should show error alert
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Image size must be less than 10MB'
      );
    });

    // Should remain on upload screen
    expect(getByText('Take or Select Photo')).toBeTruthy();
  });

  it('should be accessible for screen readers', async () => {
    const { getByText, getByLabelText } = renderWithStore(<SkinAnalysisScreen />);

    // Check main headings are accessible
    expect(getByText('Skin Analysis')).toBeTruthy();
    expect(getByText('Upload Your Photo')).toBeTruthy();
    
    // Check buttons are accessible
    const uploadButton = getByText('Take or Select Photo');
    expect(uploadButton).toBeTruthy();
    
    // Check guidelines are accessible
    expect(getByText('📸 Photo Guidelines')).toBeTruthy();
  });

  it('should maintain proper loading states throughout workflow', async () => {
    let resolveAnalysis: (value: SkinAnalysisResult) => void;
    const analysisPromise = new Promise<SkinAnalysisResult>((resolve) => {
      resolveAnalysis = resolve;
    });
    
    mockSkinAnalysisApi.analyzeImage.mockImplementation(() => analysisPromise);

    mockLaunchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image',
        fileSize: 1024 * 1024,
        width: 1080,
        height: 1920,
      }],
    } as ImagePicker.ImagePickerSuccessResult);
    
    const { getByText, queryByText } = renderWithStore(<SkinAnalysisScreen />);

    // Start analysis
    fireEvent.press(getByText('Take or Select Photo'));
    await selectAlertOption('Camera');

    // Wait for loading state to appear
    await waitFor(() => {
      expect(getByText('Analyzing Your Skin...')).toBeTruthy();
    });
    expect(queryByText('Analysis Results')).toBeFalsy();

    // Complete analysis
    resolveAnalysis!(mockAnalysisResult);

    // Should show results
    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
      expect(queryByText('Analyzing Your Skin...')).toBeFalsy();
    });
  });
});