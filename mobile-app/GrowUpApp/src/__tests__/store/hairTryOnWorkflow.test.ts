import { configureStore } from '@reduxjs/toolkit';
import hairTryOnSlice, {
  setSelectedMode,
  setVideoProcessingData,
  setProcessingStatus,
  updateProcessingProgress,
  clearProcessingStatus,
  addToHistory,
  setWebSocketConnection,
  setWebSocketConnected,
  setRealTimeStyleImage,
  setRealTimeActive,
  setCurrentFrame,
  clearAllState,
  HairTryOnState,
} from '../../store/slices/hairTryOnSlice';

type RootState = {
  hairTryOn: HairTryOnState;
};

describe('Hair Try-On Complete Workflow Tests', () => {
  let store: ReturnType<typeof configureStore<RootState>>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        hairTryOn: hairTryOnSlice,
      },
    });
  });

  describe('Complete Video Processing Workflow', () => {
    it('should handle full video processing workflow from start to finish', () => {
      // 1. User selects video mode
      store.dispatch(setSelectedMode('video'));
      expect(store.getState().hairTryOn.selectedMode).toBe('video');

      // 2. User selects video and style
      store.dispatch(setVideoProcessingData({
        video: 'file://recording.mp4',
        styleImage: 'file://style-short-bob.jpg',
        colorImage: 'file://color-blonde.jpg',
      }));

      let state = store.getState().hairTryOn;
      expect(state.videoProcessing.currentVideo).toBe('file://recording.mp4');
      expect(state.videoProcessing.styleImage).toBe('file://style-short-bob.jpg');
      expect(state.videoProcessing.colorImage).toBe('file://color-blonde.jpg');

      // 3. Processing starts
      store.dispatch(setProcessingStatus({
        sessionId: 'video-session-123',
        status: 'processing',
        progress: 0,
        estimatedTimeRemaining: 60,
      }));

      state = store.getState().hairTryOn;
      expect(state.processingStatus?.status).toBe('processing');
      expect(state.processingStatus?.progress).toBe(0);

      // 4. Progress updates
      store.dispatch(updateProcessingProgress({
        progress: 25,
        estimatedTimeRemaining: 45,
      }));

      store.dispatch(updateProcessingProgress({
        progress: 50,
        estimatedTimeRemaining: 30,
      }));

      store.dispatch(updateProcessingProgress({
        progress: 75,
        estimatedTimeRemaining: 15,
      }));

      state = store.getState().hairTryOn;
      expect(state.processingStatus?.progress).toBe(75);
      expect(state.processingStatus?.estimatedTimeRemaining).toBe(15);

      // 5. Processing completes
      store.dispatch(setProcessingStatus({
        sessionId: 'video-session-123',
        status: 'completed',
        progress: 100,
      }));

      state = store.getState().hairTryOn;
      expect(state.processingStatus?.status).toBe('completed');
      expect(state.processingStatus?.progress).toBe(100);

      // 6. Result is saved to history
      store.dispatch(addToHistory({
        id: 'result-123',
        type: 'video',
        originalMediaUrl: 'file://recording.mp4',
        styleImageUrl: 'file://style-short-bob.jpg',
        colorImageUrl: 'file://color-blonde.jpg',
        resultMediaUrl: 'https://cdn.example.com/results/result-123.mp4',
        processingMetadata: {
          modelVersion: 'v2.0',
          processingTime: 58000,
          framesProcessed: 240,
        },
        createdAt: new Date().toISOString(),
      }));

      state = store.getState().hairTryOn;
      expect(state.history).toHaveLength(1);
      expect(state.history[0].type).toBe('video');
      expect(state.history[0].resultMediaUrl).toContain('result-123.mp4');

      // 7. Cleanup
      store.dispatch(clearProcessingStatus());
      expect(store.getState().hairTryOn.processingStatus).toBeNull();
    });

    it('should handle video processing failure and retry', () => {
      // Setup initial processing
      store.dispatch(setSelectedMode('video'));
      store.dispatch(setVideoProcessingData({
        video: 'file://recording.mp4',
        styleImage: 'file://style.jpg',
      }));

      // First attempt fails
      store.dispatch(setProcessingStatus({
        sessionId: 'video-session-456',
        status: 'failed',
        progress: 45,
        error: 'Network timeout',
      }));

      let state = store.getState().hairTryOn;
      expect(state.processingStatus?.status).toBe('failed');
      expect(state.processingStatus?.error).toBe('Network timeout');

      // User retries
      store.dispatch(clearProcessingStatus());
      store.dispatch(setProcessingStatus({
        sessionId: 'video-session-457',
        status: 'processing',
        progress: 0,
      }));

      // Second attempt succeeds
      store.dispatch(updateProcessingProgress({ progress: 100 }));
      store.dispatch(setProcessingStatus({
        sessionId: 'video-session-457',
        status: 'completed',
        progress: 100,
      }));

      state = store.getState().hairTryOn;
      expect(state.processingStatus?.status).toBe('completed');
      expect(state.processingStatus?.sessionId).toBe('video-session-457');
    });
  });

  describe('Complete Real-Time Workflow', () => {
    it('should handle full real-time try-on workflow', () => {
      // 1. User switches to real-time mode
      store.dispatch(setSelectedMode('realtime'));
      expect(store.getState().hairTryOn.selectedMode).toBe('realtime');

      // 2. User selects style for real-time
      store.dispatch(setRealTimeStyleImage('file://style-curly.jpg'));
      
      let state = store.getState().hairTryOn;
      expect(state.realTime.styleImage).toBe('file://style-curly.jpg');

      // 3. WebSocket connection established
      store.dispatch(setWebSocketConnection({
        url: 'wss://api.example.com/realtime/hair',
        sessionId: 'rt-session-789',
      }));

      store.dispatch(setWebSocketConnected(true));

      state = store.getState().hairTryOn;
      expect(state.realTime.webSocket.isConnected).toBe(true);
      expect(state.realTime.webSocket.sessionId).toBe('rt-session-789');

      // 4. Real-time session starts
      store.dispatch(setRealTimeActive(true));
      expect(store.getState().hairTryOn.realTime.isActive).toBe(true);

      // 5. Frames are processed in real-time
      const frames = [
        'data:image/jpeg;base64,frame1...',
        'data:image/jpeg;base64,frame2...',
        'data:image/jpeg;base64,frame3...',
      ];

      frames.forEach((frame) => {
        store.dispatch(setCurrentFrame(frame));
        state = store.getState().hairTryOn;
        expect(state.realTime.currentFrame).toBe(frame);
      });

      // 6. User ends session
      store.dispatch(setRealTimeActive(false));
      store.dispatch(setWebSocketConnected(false));

      state = store.getState().hairTryOn;
      expect(state.realTime.isActive).toBe(false);
      expect(state.realTime.currentFrame).toBeUndefined();
      expect(state.realTime.webSocket.isConnected).toBe(false);
    });

    it('should handle style changes during active real-time session', () => {
      // Start session with one style
      store.dispatch(setSelectedMode('realtime'));
      store.dispatch(setRealTimeStyleImage('file://style1.jpg'));
      store.dispatch(setRealTimeActive(true));

      let state = store.getState().hairTryOn;
      expect(state.realTime.styleImage).toBe('file://style1.jpg');
      expect(state.realTime.isActive).toBe(true);

      // User switches style mid-session
      store.dispatch(setRealTimeStyleImage('file://style2.jpg'));

      state = store.getState().hairTryOn;
      expect(state.realTime.styleImage).toBe('file://style2.jpg');
      expect(state.realTime.isActive).toBe(true);

      // Switch again
      store.dispatch(setRealTimeStyleImage('file://style3.jpg'));

      state = store.getState().hairTryOn;
      expect(state.realTime.styleImage).toBe('file://style3.jpg');
    });
  });

  describe('Mode Switching Workflow', () => {
    it('should properly switch between video and real-time modes', () => {
      // Start with video mode
      store.dispatch(setSelectedMode('video'));
      store.dispatch(setVideoProcessingData({
        video: 'file://video.mp4',
        styleImage: 'file://video-style.jpg',
      }));

      let state = store.getState().hairTryOn;
      expect(state.selectedMode).toBe('video');
      expect(state.videoProcessing.currentVideo).toBe('file://video.mp4');

      // Switch to real-time mode
      store.dispatch(setSelectedMode('realtime'));
      store.dispatch(setRealTimeStyleImage('file://realtime-style.jpg'));
      store.dispatch(setRealTimeActive(true));

      state = store.getState().hairTryOn;
      expect(state.selectedMode).toBe('realtime');
      expect(state.realTime.isActive).toBe(true);
      
      // Video data should still be preserved
      expect(state.videoProcessing.currentVideo).toBe('file://video.mp4');
      
      // Real-time data should be independent
      expect(state.realTime.styleImage).toBe('file://realtime-style.jpg');

      // Switch back to video
      store.dispatch(setSelectedMode('video'));

      state = store.getState().hairTryOn;
      expect(state.selectedMode).toBe('video');
      // Both mode data should still be preserved
      expect(state.videoProcessing.currentVideo).toBe('file://video.mp4');
      expect(state.realTime.styleImage).toBe('file://realtime-style.jpg');
    });
  });

  describe('History Management Workflow', () => {
    it('should manage multiple history entries correctly', () => {
      const entries = [
        {
          id: 'entry-1',
          type: 'video' as const,
          originalMediaUrl: 'file://video1.mp4',
          styleImageUrl: 'file://style1.jpg',
          resultMediaUrl: 'https://cdn.example.com/result1.mp4',
          processingMetadata: {
            modelVersion: 'v2.0',
            processingTime: 50000,
            framesProcessed: 200,
          },
          createdAt: '2025-11-08T10:00:00Z',
        },
        {
          id: 'entry-2',
          type: 'realtime' as const,
          originalMediaUrl: 'file://frame.jpg',
          styleImageUrl: 'file://style2.jpg',
          resultMediaUrl: 'https://cdn.example.com/result2.jpg',
          processingMetadata: {
            modelVersion: 'v2.0',
            processingTime: 1500,
            framesProcessed: 1,
          },
          createdAt: '2025-11-08T11:00:00Z',
        },
        {
          id: 'entry-3',
          type: 'video' as const,
          originalMediaUrl: 'file://video3.mp4',
          styleImageUrl: 'file://style3.jpg',
          resultMediaUrl: 'https://cdn.example.com/result3.mp4',
          processingMetadata: {
            modelVersion: 'v2.0',
            processingTime: 60000,
            framesProcessed: 240,
          },
          createdAt: '2025-11-08T12:00:00Z',
        },
      ];

      // Add entries
      entries.forEach((entry) => {
        store.dispatch(addToHistory(entry));
      });

      let state = store.getState().hairTryOn;
      expect(state.history).toHaveLength(3);

      // Most recent should be first
      expect(state.history[0].id).toBe('entry-3');
      expect(state.history[1].id).toBe('entry-2');
      expect(state.history[2].id).toBe('entry-1');

      // Mix of types
      expect(state.history.filter((e) => e.type === 'video')).toHaveLength(2);
      expect(state.history.filter((e) => e.type === 'realtime')).toHaveLength(1);
    });
  });

  describe('Complete Session Cleanup', () => {
    it('should properly clean up all state after session', () => {
      // Create a complex state
      store.dispatch(setSelectedMode('video'));
      store.dispatch(setVideoProcessingData({
        video: 'file://video.mp4',
        styleImage: 'file://style.jpg',
        colorImage: 'file://color.jpg',
      }));
      store.dispatch(setProcessingStatus({
        sessionId: 'session-999',
        status: 'processing',
        progress: 50,
      }));
      store.dispatch(setWebSocketConnection({
        url: 'wss://api.example.com/ws',
        sessionId: 'ws-session-999',
      }));
      store.dispatch(addToHistory({
        id: 'history-1',
        type: 'video',
        originalMediaUrl: 'file://video.mp4',
        styleImageUrl: 'file://style.jpg',
        resultMediaUrl: 'https://cdn.example.com/result.mp4',
        processingMetadata: {
          modelVersion: 'v2.0',
          processingTime: 50000,
          framesProcessed: 200,
        },
        createdAt: new Date().toISOString(),
      }));

      // Verify complex state exists
      let state = store.getState().hairTryOn;
      expect(state.videoProcessing.currentVideo).toBeDefined();
      expect(state.processingStatus).toBeDefined();
      expect(state.history.length).toBeGreaterThan(0);

      // Clear everything
      store.dispatch(clearAllState());

      // Verify complete cleanup
      state = store.getState().hairTryOn;
      expect(state.selectedMode).toBe('video');
      expect(state.videoProcessing.isProcessing).toBe(false);
      expect(state.videoProcessing.currentVideo).toBeUndefined();
      expect(state.realTime.isActive).toBe(false);
      expect(state.realTime.webSocket.isConnected).toBe(false);
      expect(state.processingStatus).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.showHistory).toBe(false);
    });
  });
});
