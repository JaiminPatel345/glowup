import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HairTryOnApi } from '../../api/hair';
import { ProcessedVideo, WebSocketConnection } from '../../api/types';

// Types for hair try-on state
export interface HairTryOnHistory {
  id: string;
  type: 'video' | 'realtime';
  originalMediaUrl: string;
  styleImageUrl: string;
  colorImageUrl?: string;
  resultMediaUrl: string;
  processingMetadata: {
    modelVersion: string;
    processingTime: number;
    framesProcessed: number;
  };
  createdAt: string;
}

export interface ProcessingStatus {
  sessionId: string;
  status: 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface WebSocketState {
  isConnected: boolean;
  connectionUrl?: string;
  sessionId?: string;
  error?: string;
  latency?: number;
}

export interface HairTryOnState {
  // Video processing state
  videoProcessing: {
    isProcessing: boolean;
    currentVideo?: string;
    styleImage?: string;
    colorImage?: string;
    result?: ProcessedVideo;
    error?: string;
  };
  
  // Real-time state
  realTime: {
    isActive: boolean;
    styleImage?: string;
    webSocket: WebSocketState;
    currentFrame?: string;
  };
  
  // Processing status
  processingStatus: ProcessingStatus | null;
  
  // History
  history: HairTryOnHistory[];
  historyLoading: boolean;
  historyError?: string;
  
  // UI state
  selectedMode: 'video' | 'realtime';
  showHistory: boolean;
}

const initialState: HairTryOnState = {
  videoProcessing: {
    isProcessing: false,
  },
  realTime: {
    isActive: false,
    webSocket: {
      isConnected: false,
    },
  },
  processingStatus: null,
  history: [],
  historyLoading: false,
  selectedMode: 'video',
  showHistory: false,
};

// Async thunks
export const processVideo = createAsyncThunk(
  'hairTryOn/processVideo',
  async (params: {
    videoFormData: FormData;
    styleImageFormData: FormData;
    colorImageFormData?: FormData;
  }) => {
    const { videoFormData, styleImageFormData, colorImageFormData } = params;
    return await HairTryOnApi.processVideo(videoFormData, styleImageFormData, colorImageFormData);
  }
);

export const startRealTimeSession = createAsyncThunk(
  'hairTryOn/startRealTimeSession',
  async (styleImageFormData: FormData) => {
    return await HairTryOnApi.startRealTimeSession(styleImageFormData);
  }
);

export const fetchHairTryOnHistory = createAsyncThunk(
  'hairTryOn/fetchHistory',
  async (params: { limit?: number; offset?: number } = {}) => {
    const { limit = 10, offset = 0 } = params;
    return await HairTryOnApi.getHairTryOnHistory(limit, offset);
  }
);

export const deleteHairTryOn = createAsyncThunk(
  'hairTryOn/deleteHairTryOn',
  async (tryOnId: string) => {
    await HairTryOnApi.deleteHairTryOn(tryOnId);
    return tryOnId;
  }
);

export const cancelProcessing = createAsyncThunk(
  'hairTryOn/cancelProcessing',
  async (sessionId: string) => {
    await HairTryOnApi.cancelProcessing(sessionId);
    return sessionId;
  }
);

const hairTryOnSlice = createSlice({
  name: 'hairTryOn',
  initialState,
  reducers: {
    // Mode selection
    setSelectedMode: (state, action: PayloadAction<'video' | 'realtime'>) => {
      state.selectedMode = action.payload;
    },
    
    // Video processing actions
    setVideoProcessingData: (state, action: PayloadAction<{
      video?: string;
      styleImage?: string;
      colorImage?: string;
    }>) => {
      state.videoProcessing = {
        ...state.videoProcessing,
        ...action.payload,
      };
    },
    
    clearVideoProcessingResult: (state) => {
      state.videoProcessing.result = undefined;
      state.videoProcessing.error = undefined;
    },
    
    // Real-time actions
    setRealTimeStyleImage: (state, action: PayloadAction<string>) => {
      state.realTime.styleImage = action.payload;
    },
    
    setRealTimeActive: (state, action: PayloadAction<boolean>) => {
      state.realTime.isActive = action.payload;
      if (!action.payload) {
        state.realTime.currentFrame = undefined;
      }
    },
    
    setCurrentFrame: (state, action: PayloadAction<string>) => {
      state.realTime.currentFrame = action.payload;
    },
    
    // WebSocket actions
    setWebSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.realTime.webSocket.isConnected = action.payload;
      if (!action.payload) {
        state.realTime.webSocket.connectionUrl = undefined;
        state.realTime.webSocket.sessionId = undefined;
      }
    },
    
    setWebSocketConnection: (state, action: PayloadAction<{
      url: string;
      sessionId: string;
    }>) => {
      state.realTime.webSocket.connectionUrl = action.payload.url;
      state.realTime.webSocket.sessionId = action.payload.sessionId;
    },
    
    setWebSocketError: (state, action: PayloadAction<string | undefined>) => {
      state.realTime.webSocket.error = action.payload;
    },
    
    setWebSocketLatency: (state, action: PayloadAction<number>) => {
      state.realTime.webSocket.latency = action.payload;
    },
    
    // Processing status actions
    setProcessingStatus: (state, action: PayloadAction<ProcessingStatus>) => {
      state.processingStatus = action.payload;
    },
    
    updateProcessingProgress: (state, action: PayloadAction<{
      progress: number;
      estimatedTimeRemaining?: number;
    }>) => {
      if (state.processingStatus) {
        state.processingStatus.progress = action.payload.progress;
        state.processingStatus.estimatedTimeRemaining = action.payload.estimatedTimeRemaining;
      }
    },
    
    clearProcessingStatus: (state) => {
      state.processingStatus = null;
    },
    
    // History actions
    setShowHistory: (state, action: PayloadAction<boolean>) => {
      state.showHistory = action.payload;
    },
    
    addToHistory: (state, action: PayloadAction<HairTryOnHistory>) => {
      state.history.unshift(action.payload);
    },
    
    removeFromHistory: (state, action: PayloadAction<string>) => {
      state.history = state.history.filter(item => item.id !== action.payload);
    },
    
    // Clear all state
    clearAllState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Process video
    builder
      .addCase(processVideo.pending, (state) => {
        state.videoProcessing.isProcessing = true;
        state.videoProcessing.error = undefined;
      })
      .addCase(processVideo.fulfilled, (state, action) => {
        state.videoProcessing.isProcessing = false;
        state.videoProcessing.result = action.payload;
      })
      .addCase(processVideo.rejected, (state, action) => {
        state.videoProcessing.isProcessing = false;
        state.videoProcessing.error = action.error.message || 'Video processing failed';
      });
    
    // Start real-time session
    builder
      .addCase(startRealTimeSession.pending, (state) => {
        state.realTime.webSocket.error = undefined;
      })
      .addCase(startRealTimeSession.fulfilled, (state, action) => {
        state.realTime.webSocket.connectionUrl = action.payload.url;
        state.realTime.webSocket.sessionId = action.payload.sessionId;
      })
      .addCase(startRealTimeSession.rejected, (state, action) => {
        state.realTime.webSocket.error = action.error.message || 'Failed to start real-time session';
      });
    
    // Fetch history
    builder
      .addCase(fetchHairTryOnHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = undefined;
      })
      .addCase(fetchHairTryOnHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchHairTryOnHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.error.message || 'Failed to fetch history';
      });
    
    // Delete hair try-on
    builder
      .addCase(deleteHairTryOn.fulfilled, (state, action) => {
        state.history = state.history.filter(item => item.id !== action.payload);
      });
    
    // Cancel processing
    builder
      .addCase(cancelProcessing.fulfilled, (state) => {
        state.videoProcessing.isProcessing = false;
        if (state.processingStatus) {
          state.processingStatus.status = 'cancelled';
        }
      });
  },
});

export const {
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
} = hairTryOnSlice.actions;

export default hairTryOnSlice.reducer;