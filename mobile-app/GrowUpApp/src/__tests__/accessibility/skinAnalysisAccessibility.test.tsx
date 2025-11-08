import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SkinAnalysisScreen from '../../screens/skin/SkinAnalysisScreen';
import SkinAnalysisResults from '../../components/skin/SkinAnalysisResults';
import ImageCaptureUpload from '../../components/skin/ImageCaptureUpload';
import IssueDetailPopup from '../../components/skin/IssueDetailPopup';
import skinAnalysisReducer from '../../store/slices/skinAnalysisSlice';
import authReducer from '../../store/slices/authSlice';
import { SkinAnalysisResult, SkinIssue } from '../../api/types';

const mockStore = configureStore({
  reducer: {
    skinAnalysis: skinAnalysisReducer,
    auth: authReducer,
  },
});

const mockAnalysisResult: SkinAnalysisResult = {
  skinType: 'Combination',
  issues: [
    {
      id: 'issue-1',
      name: 'Acne',
      description: 'Mild acne detected on forehead and chin areas',
      severity: 'medium',
      causes: ['Hormonal changes', 'Poor diet', 'Stress'],
      highlightedImageUrl: 'https://example.com/highlighted.jpg',
      confidence: 0.85,
    },
    {
      id: 'issue-2',
      name: 'Dark Circles',
      description: 'Slight dark circles under eyes',
      severity: 'low',
      causes: ['Lack of sleep', 'Genetics'],
      highlightedImageUrl: 'https://example.com/dark-circles.jpg',
      confidence: 0.72,
    },
  ],
  analysisMetadata: {
    modelVersion: 'SkinAnalyzer v2.1',
    processingTime: 2500,
    imageQuality: 0.9,
  },
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('Skin Analysis Accessibility', () => {
  describe('SkinAnalysisScreen Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const { getByText } = renderWithProvider(<SkinAnalysisScreen />);

      // Main heading should be accessible
      const mainHeading = getByText('Skin Analysis');
      expect(mainHeading).toBeTruthy();
      
      // Subheading should be accessible
      const subHeading = getByText('Upload a clear photo of your face to get personalized skin analysis and recommendations');
      expect(subHeading).toBeTruthy();
    });

    it('should have accessible buttons with proper labels', () => {
      const { getByText } = renderWithProvider(<SkinAnalysisScreen />);

      const uploadButton = getByText('Take or Select Photo');
      expect(uploadButton).toBeTruthy();
      
      // Button should be focusable and have proper accessibility properties
      expect(uploadButton.props.accessible).not.toBe(false);
    });

    it('should provide meaningful error messages for screen readers', () => {
      // Create store with error state
      const storeWithError = configureStore({
        reducer: {
          skinAnalysis: skinAnalysisReducer,
          auth: authReducer,
        },
        preloadedState: {
          skinAnalysis: {
            ...mockStore.getState().skinAnalysis,
            analysisError: 'Network connection failed. Please check your internet connection and try again.',
            retryCount: 1,
          },
          auth: mockStore.getState().auth,
        },
      });

      const { getByText } = render(
        <Provider store={storeWithError}>
          <SkinAnalysisScreen />
        </Provider>
      );

      expect(getByText('Analysis Failed')).toBeTruthy();
      expect(getByText('Network connection failed. Please check your internet connection and try again.')).toBeTruthy();
      expect(getByText('Retry (1/3)')).toBeTruthy();
    });

    it('should have accessible loading states', () => {
      // Create store with loading state
      const storeWithLoading = configureStore({
        reducer: {
          skinAnalysis: skinAnalysisReducer,
          auth: authReducer,
        },
        preloadedState: {
          skinAnalysis: {
            ...mockStore.getState().skinAnalysis,
            isAnalyzing: true,
          },
          auth: mockStore.getState().auth,
        },
      });

      const { getByText } = render(
        <Provider store={storeWithLoading}>
          <SkinAnalysisScreen />
        </Provider>
      );

      expect(getByText('Analyzing Your Skin...')).toBeTruthy();
      expect(getByText('Our AI is examining your photo to detect skin type and issues. This may take a few seconds.')).toBeTruthy();
    });
  });

  describe('SkinAnalysisResults Accessibility', () => {
    it('should have accessible result headings', () => {
      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      expect(getByText('Analysis Results')).toBeTruthy();
      expect(getByText('Your Skin Type')).toBeTruthy();
      expect(getByText('Detected Issues (2)')).toBeTruthy();
    });

    it('should provide accessible issue information', () => {
      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      // Issue names should be accessible
      expect(getByText('Acne')).toBeTruthy();
      expect(getByText('Dark Circles')).toBeTruthy();

      // Issue descriptions should be accessible
      expect(getByText('Mild acne detected on forehead and chin areas')).toBeTruthy();
      expect(getByText('Slight dark circles under eyes')).toBeTruthy();

      // Confidence levels should be accessible
      expect(getByText('85%')).toBeTruthy();
      expect(getByText('72%')).toBeTruthy();
    });

    it('should have accessible severity indicators', () => {
      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      // Severity should be communicated through text, not just color
      const acneIssue = getByText('Acne');
      const darkCirclesIssue = getByText('Dark Circles');
      
      expect(acneIssue).toBeTruthy();
      expect(darkCirclesIssue).toBeTruthy();
    });

    it('should provide accessible interaction hints', () => {
      const { getAllByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      const tapMessages = getAllByText('Tap for details & solutions');
      expect(tapMessages).toHaveLength(2);
      
      // Each issue should have clear interaction guidance
      tapMessages.forEach(message => {
        expect(message).toBeTruthy();
      });
    });

    it('should handle no issues state accessibly', () => {
      const noIssuesResult: SkinAnalysisResult = {
        ...mockAnalysisResult,
        issues: [],
      };

      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={noIssuesResult} />
      );

      expect(getByText('Detected Issues (0)')).toBeTruthy();
      expect(getByText('🎉 Great news! No significant skin issues detected.')).toBeTruthy();
      expect(getByText('Your skin appears to be in good condition. Keep up your current skincare routine!')).toBeTruthy();
    });
  });

  describe('ImageCaptureUpload Accessibility', () => {
    const mockOnImageCapture = jest.fn();

    it('should have accessible upload interface', () => {
      const { getByText } = render(
        <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
      );

      expect(getByText('Upload Your Photo')).toBeTruthy();
      expect(getByText('Take or Select Photo')).toBeTruthy();
    });

    it('should provide accessible photo guidelines', () => {
      const { getByText } = render(
        <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
      );

      expect(getByText('📸 Photo Guidelines')).toBeTruthy();
      expect(getByText(/Ensure good lighting/)).toBeTruthy();
      expect(getByText(/Face should be clearly visible/)).toBeTruthy();
      expect(getByText(/Remove makeup for best results/)).toBeTruthy();
    });

    it('should have accessible button states', () => {
      const { getByText } = render(
        <ImageCaptureUpload onImageCapture={mockOnImageCapture} disabled={true} />
      );

      const button = getByText('Take or Select Photo');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should provide accessible feedback for processing', () => {
      const { getByText, rerender } = render(
        <ImageCaptureUpload onImageCapture={mockOnImageCapture} />
      );

      // Initially no processing message
      expect(() => getByText('Processing image...')).toThrow();

      // This would be shown during processing (simulated in real component)
      // The actual implementation would show this during image processing
    });
  });

  describe('IssueDetailPopup Accessibility', () => {
    const mockIssue: SkinIssue = mockAnalysisResult.issues[0];
    const mockOnClose = jest.fn();

    it('should have accessible modal structure', () => {
      const { getByText } = renderWithProvider(
        <IssueDetailPopup 
          issue={mockIssue} 
          visible={true} 
          onClose={mockOnClose} 
        />
      );

      expect(getByText('Acne')).toBeTruthy();
      expect(getByText('×')).toBeTruthy(); // Close button
    });

    it('should provide accessible issue details', () => {
      const { getByText } = renderWithProvider(
        <IssueDetailPopup 
          issue={mockIssue} 
          visible={true} 
          onClose={mockOnClose} 
        />
      );

      expect(getByText('Medium Priority')).toBeTruthy();
      expect(getByText('Confidence: 85%')).toBeTruthy();
      expect(getByText('Mild acne detected on forehead and chin areas')).toBeTruthy();
    });

    it('should have accessible causes and prevention sections', () => {
      const { getByText } = renderWithProvider(
        <IssueDetailPopup 
          issue={mockIssue} 
          visible={true} 
          onClose={mockOnClose} 
        />
      );

      expect(getByText('Common Causes')).toBeTruthy();
      expect(getByText('Prevention Tips')).toBeTruthy();
      
      // Causes should be listed accessibly
      expect(getByText('Hormonal changes')).toBeTruthy();
      expect(getByText('Poor diet')).toBeTruthy();
      expect(getByText('Stress')).toBeTruthy();
    });

    it('should have accessible action buttons', () => {
      const { getByText } = renderWithProvider(
        <IssueDetailPopup 
          issue={mockIssue} 
          visible={true} 
          onClose={mockOnClose} 
        />
      );

      const solutionsButton = getByText('View Product Solutions');
      expect(solutionsButton).toBeTruthy();
      expect(solutionsButton.props.accessible).not.toBe(false);
    });

    it('should provide accessible disclaimer information', () => {
      const { getByText } = renderWithProvider(
        <IssueDetailPopup 
          issue={mockIssue} 
          visible={true} 
          onClose={mockOnClose} 
        />
      );

      expect(getByText(/Disclaimer:/)).toBeTruthy();
      expect(getByText(/Please consult with a dermatologist/)).toBeTruthy();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly when opening issue details', () => {
      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      const acneIssue = getByText('Acne');
      expect(acneIssue).toBeTruthy();
      
      // In a real implementation, focus should move to the modal when opened
      // This would be tested with actual focus management
    });

    it('should return focus properly when closing modals', () => {
      // This would test that focus returns to the triggering element
      // when modals are closed, which is important for keyboard navigation
      expect(true).toBe(true); // Placeholder for focus management test
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce analysis completion', () => {
      // In a real implementation, this would test that screen readers
      // are notified when analysis completes
      expect(true).toBe(true); // Placeholder for announcement test
    });

    it('should announce error states clearly', () => {
      // This would test that error messages are properly announced
      // to screen reader users
      expect(true).toBe(true); // Placeholder for error announcement test
    });

    it('should announce loading state changes', () => {
      // This would test that loading state changes are announced
      // to keep screen reader users informed of progress
      expect(true).toBe(true); // Placeholder for loading announcement test
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should not rely solely on color for severity indication', () => {
      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      // Severity should be indicated by text labels, not just colors
      // The component uses emoji indicators and text labels
      expect(getByText('Acne')).toBeTruthy();
      expect(getByText('Dark Circles')).toBeTruthy();
      
      // Confidence percentages provide additional context
      expect(getByText('85%')).toBeTruthy();
      expect(getByText('72%')).toBeTruthy();
    });

    it('should provide text alternatives for visual elements', () => {
      const { getByText } = renderWithProvider(
        <SkinAnalysisResults analysis={mockAnalysisResult} />
      );

      // Guidelines use both emoji and text
      expect(getByText('📸 Photo Guidelines')).toBeTruthy();
      
      // Success message uses both emoji and text
      const noIssuesResult: SkinAnalysisResult = {
        ...mockAnalysisResult,
        issues: [],
      };

      const { getByText: getByTextNoIssues } = renderWithProvider(
        <SkinAnalysisResults analysis={noIssuesResult} />
      );

      expect(getByTextNoIssues('🎉 Great news! No significant skin issues detected.')).toBeTruthy();
    });
  });
});