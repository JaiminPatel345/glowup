import { configureStore } from '@reduxjs/toolkit';
import hairTryOnSlice, {
  setSelectedMode,
  setVideoProcessingData,
  clearVideoProcessingResult,
  setRealTimeStyleImage,
  setRealTimeActive,
  setCurrentFrame,
  setWebSocketConnected,
  setWebSocketConnection,
  setWebSocketError,
  setWebSocketLatency,
  setProcessingStatus,
  updateProcessingProgress,
  clearProcessingStatus,
  setShowHistory,
  addToHistory,
  removeFromHistory,
  clearAllState,
  processVideo,
  startRealTimeSession,
  fetchHairTryOnHistory,
  deleteHairTryOn,
  cancelProcessing,
  HairTryOnState,
} from '../../store/slices/hairTryOnSlice';

// Mock the API
jest.mock('../../api/hair', () => ({
  HairTryOnApi: {
    processVideo: jest.fn(),
    startRealTimeSession: jest.fn(),
    getHairTryOnHistory: jest.fn(),
    deleteHairTryOn: jest.fn(),
    cancelProcessing: jest.fn(),
  },
}));

const getDefaultState = (): HairTryOnState =>
  hairTryOnSlice(undefined, { type: '@@INIT' }) as HairTryOnState;

const createStore = (initialState?: Partial<HairTryOnState>) => {
  const preloadedState = initialState
    ? { hairTryOn: { ...getDefaultState(), ...initialState } }
    : undefined;

  return configureStore({
    reducer: {
      hairTryOn: hairTryOnSlice,
    },
    preloadedState,
  });
};

describe('hairTryOnSlice', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().hairTryOn;
      
      expect(state.selectedMode).toBe('video');
      expect(state.videoProcessing.isProcessing).toBe(false);
      expect(state.realTime.isActive).toBe(false);
      expect(state.realTime.webSocket.isConnected).toBe(false);
      expect(state.processingStatus).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.historyLoading).toBe(false);
      expect(state.showHistory).toBe(false);
    });
  });

  describe('mode selection', () => {
    it('should set selected mode', () => {
      store.dispatch(setSelectedMode('realtime'));
      
      const state = store.getState().hairTryOn;
      expect(state.selectedMode).toBe('realtime');
    });
  });

  describe('video processing', () => {
    it('should set video processing data', () => {
      const processingData = {
        video: 'file://video.mp4',
        styleImage: 'file://style.jpg',
        colorImage: 'file://color.jpg',
      };

      store.dispatch(setVideoProcessingData(processingData));
      
      const state = store.getState().hairTryOn;
      expect(state.videoProcessing.currentVideo).toBe(processingData.video);
      expect(state.videoProcessing.styleImage).toBe(processingData.styleImage);
      expect(state.videoProcessing.colorImage).toBe(processingData.colorImage);
    });

    it('should clear video processing result', () => {
      // First set some result
      const initialState = {
        videoProcessing: {
          isProcessing: false,
          result: {
            resultVideoUrl: 'https://example.com/result.mp4',
            processingMetadata: {
              modelVersion: 'v1.0',
              processingTime: 5000,
              framesProcessed: 150,
            },
          },
          error: 'Some error',
        },
      };

      store = createStore(initialState as any);
      store.dispatch(clearVideoProcessingResult());
      
      const state = store.getState().hairTryOn;
      expect(state.videoProcessing.result).toBeUndefined();
      expect(state.videoProcessing.error).toBeUndefined();
    });
  });

  describe('real-time functionality', () => {
    it('should set real-time style image', () => {
      const styleImage = 'file://style.jpg';
      
      store.dispatch(setRealTimeStyleImage(styleImage));
      
      const state = store.getState().hairTryOn;
      expect(state.realTime.styleImage).toBe(styleImage);
    });

    it('should set real-time active state', () => {
      store.dispatch(setRealTimeActive(true));
      
      let state = store.getState().hairTryOn;
      expect(state.realTime.isActive).toBe(true);

      store.dispatch(setRealTimeActive(false));
      
      state = store.getState().hairTryOn;
      expect(state.realTime.isActive).toBe(false);
      expect(state.realTime.currentFrame).toBeUndefined();
    });

    it('should set current frame', () => {
      const frameData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
      
      store.dispatch(setCurrentFrame(frameData));
      
      const state = store.getState().hairTryOn;
      expect(state.realTime.currentFrame).toBe(frameData);
    });
  });

  describe('WebSocket functionality', () => {
    it('should set WebSocket connected state', () => {
      store.dispatch(setWebSocketConnected(true));
      
      let state = store.getState().hairTryOn;
      expect(state.realTime.webSocket.isConnected).toBe(true);

      store.dispatch(setWebSocketConnected(false));
      
      state = store.getState().hairTryOn;
      expect(state.realTime.webSocket.isConnected).toBe(false);
      expect(state.realTime.webSocket.connectionUrl).toBeUndefined();
      expect(state.realTime.webSocket.sessionId).toBeUndefined();
    });

    it('should set WebSocket connection details', () => {
      const connectionDetails = {
        url: 'ws://localhost:8000/ws',
        sessionId: 'session-123',
      };

      store.dispatch(setWebSocketConnection(connectionDetails));
      
      const state = store.getState().hairTryOn;
      expect(state.realTime.webSocket.connectionUrl).toBe(connectionDetails.url);
      expect(state.realTime.webSocket.sessionId).toBe(connectionDetails.sessionId);
    });

    it('should set WebSocket error', () => {
      const error = 'Connection failed';
      
      store.dispatch(setWebSocketError(error));
      
      const state = store.getState().hairTryOn;
      expect(state.realTime.webSocket.error).toBe(error);
    });

    it('should set WebSocket latency', () => {
      const latency = 150;
      
      store.dispatch(setWebSocketLatency(latency));
      
      const state = store.getState().hairTryOn;
      expect(state.realTime.webSocket.latency).toBe(latency);
    });
  });

  describe('processing status', () => {
    it('should set processing status', () => {
      const status = {
        sessionId: 'session-123',
        status: 'processing' as const,
        progress: 50,
        estimatedTimeRemaining: 30,
      };

      store.dispatch(setProcessingStatus(status));
      
      const state = store.getState().hairTryOn;
      expect(state.processingStatus).toEqual(status);
    });

    it('should update processing progress', () => {
      // First set initial status
      const initialStatus = {
        sessionId: 'session-123',
        status: 'processing' as const,
        progress: 25,
      };

      store.dispatch(setProcessingStatus(initialStatus));

      // Then update progress
      const progressUpdate = {
        progress: 75,
        estimatedTimeRemaining: 15,
      };

      store.dispatch(updateProcessingProgress(progressUpdate));
      
      const state = store.getState().hairTryOn;
      expect(state.processingStatus?.progress).toBe(75);
      expect(state.processingStatus?.estimatedTimeRemaining).toBe(15);
    });

    it('should clear processing status', () => {
      // First set some status
      const status = {
        sessionId: 'session-123',
        status: 'completed' as const,
        progress: 100,
      };

      store.dispatch(setProcessingStatus(status));
      store.dispatch(clearProcessingStatus());
      
      const state = store.getState().hairTryOn;
      expect(state.processingStatus).toBeNull();
    });
  });

  describe('history management', () => {
    it('should set show history', () => {
      store.dispatch(setShowHistory(true));
      
      const state = store.getState().hairTryOn;
      expect(state.showHistory).toBe(true);
    });

    it('should add to history', () => {
      const historyItem = {
        id: 'item-1',
        type: 'video' as const,
        originalMediaUrl: 'file://original.mp4',
        styleImageUrl: 'file://style.jpg',
        resultMediaUrl: 'https://example.com/result.mp4',
        processingMetadata: {
          modelVersion: 'v1.0',
          processingTime: 5000,
          framesProcessed: 150,
        },
        createdAt: '2023-01-01T00:00:00Z',
      };

      store.dispatch(addToHistory(historyItem));
      
      const state = store.getState().hairTryOn;
      expect(state.history).toHaveLength(1);
      expect(state.history[0]).toEqual(historyItem);
    });

    it('should remove from history', () => {
      // First add an item
      const historyItem = {
        id: 'item-1',
        type: 'video' as const,
        originalMediaUrl: 'file://original.mp4',
        styleImageUrl: 'file://style.jpg',
        resultMediaUrl: 'https://example.com/result.mp4',
        processingMetadata: {
          modelVersion: 'v1.0',
          processingTime: 5000,
          framesProcessed: 150,
        },
        createdAt: '2023-01-01T00:00:00Z',
      };

      store.dispatch(addToHistory(historyItem));
      
      // Then remove it
      store.dispatch(removeFromHistory('item-1'));
      
      const state = store.getState().hairTryOn;
      expect(state.history).toHaveLength(0);
    });
  });

  describe('clear all state', () => {
    it('should reset to initial state', () => {
      // First modify some state
      store.dispatch(setSelectedMode('realtime'));
      store.dispatch(setRealTimeActive(true));
      store.dispatch(setShowHistory(true));

      // Then clear all
      store.dispatch(clearAllState());
      
      const state = store.getState().hairTryOn;
      expect(state.selectedMode).toBe('video');
      expect(state.realTime.isActive).toBe(false);
      expect(state.showHistory).toBe(false);
    });
  });

  // Note: Async thunk tests would require more complex mocking of the API
  // For now, we're testing the synchronous reducers
});