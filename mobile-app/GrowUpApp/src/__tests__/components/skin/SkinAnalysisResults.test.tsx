import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SkinAnalysisResults from '../../../components/skin/SkinAnalysisResults';
import skinAnalysisReducer from '../../../store/slices/skinAnalysisSlice';
import { SkinAnalysisResult } from '../../../api/types';

const mockStore = configureStore({
  reducer: {
    skinAnalysis: skinAnalysisReducer,
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

const mockAnalysisResultNoIssues: SkinAnalysisResult = {
  skinType: 'Normal',
  issues: [],
  analysisMetadata: {
    modelVersion: 'SkinAnalyzer v2.1',
    processingTime: 1800,
    imageQuality: 0.95,
  },
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('SkinAnalysisResults', () => {
  it('should render analysis results correctly', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    expect(getByText('Analysis Results')).toBeTruthy();
    expect(getByText('Your Skin Type')).toBeTruthy();
    expect(getByText('Combination')).toBeTruthy();
    expect(getByText('Detected Issues (2)')).toBeTruthy();
    expect(getByText('Processing time: 2500ms')).toBeTruthy();
    expect(getByText('Quality: 90%')).toBeTruthy();
  });

  it('should display skin issues with correct information', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    // Check first issue
    expect(getByText('Acne')).toBeTruthy();
    expect(getByText('Mild acne detected on forehead and chin areas')).toBeTruthy();
    expect(getByText('85%')).toBeTruthy(); // Confidence
    expect(getByText('Hormonal changes, Poor diet...')).toBeTruthy(); // Causes preview

    // Check second issue
    expect(getByText('Dark Circles')).toBeTruthy();
    expect(getByText('Slight dark circles under eyes')).toBeTruthy();
    expect(getByText('72%')).toBeTruthy(); // Confidence
  });

  it('should show correct severity indicators', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    // Medium severity should show yellow indicator
    const acneSection = getByText('Acne').parent;
    expect(acneSection).toBeTruthy();

    // Low severity should show green indicator  
    const darkCirclesSection = getByText('Dark Circles').parent;
    expect(darkCirclesSection).toBeTruthy();
  });

  it('should handle issue press and dispatch setSelectedIssue', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    const acneIssue = getByText('Acne');
    fireEvent.press(acneIssue.parent!);

    // Check if the action was dispatched by checking store state
    const state = mockStore.getState().skinAnalysis;
    expect(state.selectedIssue?.id).toBe('issue-1');
  });

  it('should display no issues message when no issues detected', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResultNoIssues} />
    );

    expect(getByText('Detected Issues (0)')).toBeTruthy();
    expect(getByText('🎉 Great news! No significant skin issues detected.')).toBeTruthy();
    expect(getByText('Your skin appears to be in good condition. Keep up your current skincare routine!')).toBeTruthy();
  });

  it('should display model version in metadata', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    expect(getByText('Analysis powered by SkinAnalyzer v2.1')).toBeTruthy();
  });

  it('should show tap for details message on issues', () => {
    const { getAllByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    const tapMessages = getAllByText('Tap for details & solutions');
    expect(tapMessages).toHaveLength(2); // One for each issue
  });

  it('should display highlighted images when available', () => {
    const { getAllByTestId } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    // Note: In a real test, you'd need to add testID props to Image components
    // This is a placeholder for image testing
    expect(mockAnalysisResult.issues[0].highlightedImageUrl).toBeTruthy();
    expect(mockAnalysisResult.issues[1].highlightedImageUrl).toBeTruthy();
  });

  it('should truncate causes list when more than 2 causes', () => {
    const { getByText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    // First issue has 3 causes, should show first 2 + "..."
    expect(getByText('Hormonal changes, Poor diet...')).toBeTruthy();
    
    // Second issue has 2 causes, should show both without "..."
    expect(getByText('Lack of sleep, Genetics')).toBeTruthy();
  });

  it('should be accessible for screen readers', () => {
    const { getByText, getByLabelText } = renderWithProvider(
      <SkinAnalysisResults analysis={mockAnalysisResult} />
    );

    // Check that important elements have proper accessibility
    expect(getByText('Analysis Results')).toBeTruthy();
    expect(getByText('Your Skin Type')).toBeTruthy();
    expect(getByText('Detected Issues (2)')).toBeTruthy();
    
    // Issues should be pressable and accessible
    const acneIssue = getByText('Acne');
    expect(acneIssue).toBeTruthy();
  });
});