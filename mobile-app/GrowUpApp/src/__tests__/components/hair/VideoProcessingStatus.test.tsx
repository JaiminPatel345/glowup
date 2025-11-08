import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VideoProcessingStatus } from '../../../components/hair/VideoProcessingStatus';
import hairTryOnSlice, { ProcessingStatus } from '../../../store/slices/hairTryOnSlice';

// Create a mock store
const createMockStore = (initialState: any) => {
    return configureStore({
        reducer: {
            hairTryOn: hairTryOnSlice,
        },
        preloadedState: {
            hairTryOn: initialState,
        },
    });
};

const renderWithStore = (component: React.ReactElement, initialState: any) => {
    const store = createMockStore(initialState);
    return {
        ...render(
            <Provider store={store}>
                {component}
            </Provider>
        ),
        store,
    };
};

describe('VideoProcessingStatus', () => {
    const mockOnCancel = jest.fn();
    const mockOnComplete = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const initialState = {
        videoProcessing: {
            isProcessing: false,
            result: null,
            error: undefined,
        },
        processingStatus: null,
        realTime: {
            isActive: false,
            webSocket: { isConnected: false },
        },
        history: [],
        historyLoading: false,
        selectedMode: 'video' as const,
        showHistory: false,
    };

    it('renders initializing state correctly', () => {
        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            initialState
        );

        expect(getByText('Initializing processing...')).toBeTruthy();
        expect(getByText('Cancel')).toBeTruthy();
    });

    it('renders processing state with progress', () => {
        const processingState = {
            ...initialState,
            videoProcessing: {
                ...initialState.videoProcessing,
                isProcessing: true,
            },
            processingStatus: {
                sessionId: 'test-session',
                status: 'processing',
                progress: 45,
                estimatedTimeRemaining: 30,
            } as ProcessingStatus,
        };

        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            processingState
        );

        expect(getByText(/Processing your video/)).toBeTruthy();
        expect(getByText('45% complete')).toBeTruthy();
        expect(getByText('~0:30 remaining')).toBeTruthy();
        expect(getByText('Cancel Processing')).toBeTruthy();
    });

    it('renders completed state', () => {
        const completedState = {
            ...initialState,
            processingStatus: {
                sessionId: 'test-session',
                status: 'completed',
                progress: 100,
            } as ProcessingStatus,
            videoProcessing: {
                ...initialState.videoProcessing,
                result: {
                    resultVideoUrl: 'https://example.com/result.mp4',
                    processingMetadata: {
                        modelVersion: 'v1.0',
                        processingTime: 5000,
                        framesProcessed: 150,
                    },
                },
            },
        };

        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            completedState
        );

        expect(getByText('Processing complete!')).toBeTruthy();
        expect(getByText('View Result')).toBeTruthy();
    });

    it('renders failed state with error message', () => {
        const failedState = {
            ...initialState,
            processingStatus: {
                sessionId: 'test-session',
                status: 'failed',
                progress: 0,
                error: 'Processing failed due to network error',
            } as ProcessingStatus,
        };

        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            failedState
        );

        expect(getByText('Processing failed')).toBeTruthy();
        expect(getByText('Processing failed due to network error')).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();
        expect(getByText('Go Back')).toBeTruthy();
    });

    it('calls onCancel when cancel button is pressed', () => {
        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            initialState
        );

        fireEvent.press(getByText('Cancel'));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onComplete when view result button is pressed', () => {
        const completedState = {
            ...initialState,
            processingStatus: {
                sessionId: 'test-session',
                status: 'completed',
                progress: 100,
            } as ProcessingStatus,
            videoProcessing: {
                ...initialState.videoProcessing,
                result: {
                    resultVideoUrl: 'https://example.com/result.mp4',
                    processingMetadata: {
                        modelVersion: 'v1.0',
                        processingTime: 5000,
                        framesProcessed: 150,
                    },
                },
            },
        };

        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            completedState
        );

        fireEvent.press(getByText('View Result'));
        expect(mockOnComplete).toHaveBeenCalled();
    });

    it('formats time correctly', () => {
        const processingState = {
            ...initialState,
            videoProcessing: {
                ...initialState.videoProcessing,
                isProcessing: true,
            },
            processingStatus: {
                sessionId: 'test-session',
                status: 'processing',
                progress: 50,
                estimatedTimeRemaining: 125, // 2 minutes 5 seconds
            } as ProcessingStatus,
        };

        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            processingState
        );

        expect(getByText('~2:05 remaining')).toBeTruthy();
    });

    it('shows processing details during processing', () => {
        const processingState = {
            ...initialState,
            videoProcessing: {
                ...initialState.videoProcessing,
                isProcessing: true,
            },
            processingStatus: {
                sessionId: 'test-session',
                status: 'processing',
                progress: 30,
            } as ProcessingStatus,
        };

        const { getByText } = renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            processingState
        );

        expect(getByText('Applying hairstyle using AI model')).toBeTruthy();
        expect(getByText('This may take a few moments depending on video length')).toBeTruthy();
    });

    it('calls onComplete automatically when processing completes', async () => {
        const completedState = {
            ...initialState,
            processingStatus: {
                sessionId: 'test-session',
                status: 'completed',
                progress: 100,
            } as ProcessingStatus,
            videoProcessing: {
                ...initialState.videoProcessing,
                result: {
                    resultVideoUrl: 'https://example.com/result.mp4',
                    processingMetadata: {
                        modelVersion: 'v1.0',
                        processingTime: 5000,
                        framesProcessed: 150,
                    },
                },
            },
        };

        renderWithStore(
            <VideoProcessingStatus onCancel={mockOnCancel} onComplete={mockOnComplete} />,
            completedState
        );

        await waitFor(() => {
            expect(mockOnComplete).toHaveBeenCalled();
        });
    });
});