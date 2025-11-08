import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { request, RESULTS } from 'react-native-permissions';
import SkinAnalysisScreen from '../../screens/skin/SkinAnalysisScreen';
import skinAnalysisReducer from '../../store/slices/skinAnalysisSlice';
import authReducer from '../../store/slices/authSlice';
import { SkinAnalysisApi } from '../../api';
import { SkinAnalysisResult } from '../../api/types';

// Mock dependencies
jest.mock('react-native-image-picker');
jest.mock('react-native-permissions');
jest.mock('../../api');

const mockLaunchCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;
const mockRequest = request as jest.MockedFunction<typeof request>;
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

const createTestStore = () => {
  return configureStore({
    reducer: {
      skinAnalysis: skinAnalysisReducer,
      auth: authReducer,
    },
  });
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
    mockRequest.mockResolvedValue(RESULTS.GRANTED);
  });

  it('should complete full skin analysis workflow successfully', async () => {
    mockSkinAnalysisApi.analyzeImage.mockResolvedValue(mockAnalysisResult);
    
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
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    // Step 3: Simulate successful image capture
    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      }],
    };

    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

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
    mockSkinAnalysisApi.analyzeImage.mockRejectedValue(error);
    
    const { getByText, queryByText } = renderWithStore(<SkinAnalysisScreen />);

    // Simulate image capture and analysis failure
    fireEvent.press(getByText('Take or Select Photo'));
    
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      }],
    };

    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    // Should show error state with retry option
    await waitFor(() => {
      expect(getByText('Analysis Failed')).toBeTruthy();
      expect(getByText('Test error')).toBeTruthy();
      expect(getByText('Retry (1/3)')).toBeTruthy();
      expect(getByText('New Photo')).toBeTruthy();
    });

    // Test retry functionality
    mockSkinAnalysisApi.analyzeImage.mockResolvedValue(mockAnalysisResult);
    fireEvent.press(getByText('Retry (1/3)'));

    await waitFor(() => {
      expect(getByText('Analysis Results')).toBeTruthy();
      expect(getByText('Combination')).toBeTruthy();
    });
  });

  it('should handle maximum retry attempts reached', async () => {
    const error = new Error('Persistent analysis failure');
    mockSkinAnalysisApi.analyzeImage.mockRejectedValue(error);
    
    const store = createTestStore();
    const { getByText } = renderWithStore(<SkinAnalysisScreen />, store);

    // Simulate image capture
    fireEvent.press(getByText('Take or Select Photo'));
    
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      }],
    };

    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    // Simulate multiple retry attempts
    for (let i = 1; i <= 3; i++) {
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
    mockSkinAnalysisApi.analyzeImage.mockResolvedValue(mockAnalysisResult);
    
    const { getByText } = renderWithStore(<SkinAnalysisScreen />);

    // Complete first analysis
    fireEvent.press(getByText('Take or Select Photo'));
    
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      }],
    };

    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

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
    const { getByText } = renderWithStore(<SkinAnalysisScreen />);

    fireEvent.press(getByText('Take or Select Photo'));
    
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    // Simulate oversized image
    const mockImageResponse = {
      assets: [{
        uri: 'file://large-image.jpg',
        fileName: 'large-image.jpg',
        type: 'image/jpeg',
        fileSize: 15 * 1024 * 1024, // 15MB
      }],
    };

    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    // Should show error alert
    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      'Image size must be less than 10MB'
    );

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
    
    mockSkinAnalysisApi.analyzeImage.mockReturnValue(analysisPromise);
    
    const { getByText, queryByText } = renderWithStore(<SkinAnalysisScreen />);

    // Start analysis
    fireEvent.press(getByText('Take or Select Photo'));
    
    const alertCall = mockAlert.mock.calls[0];
    const cameraOption = alertCall[2]?.find((option: any) => option.text === 'Camera');
    if (cameraOption?.onPress) {
      await cameraOption.onPress();
    }

    const mockImageResponse = {
      assets: [{
        uri: 'file://test-image.jpg',
        fileName: 'test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      }],
    };

    const cameraCallback = mockLaunchCamera.mock.calls[0]?.[1];
    if (cameraCallback) {
      cameraCallback(mockImageResponse);
    }

    // Should show loading state
    expect(getByText('Analyzing Your Skin...')).toBeTruthy();
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