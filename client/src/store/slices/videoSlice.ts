import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VideoState {
  isRecording: boolean;
  isProcessing: boolean;
  originalFrame: string | null;
  processedFrame: string | null;
  frameCount: number;
  fps: number;
  quality: number;
  cameraFacing: 'front' | 'back';
  lastProcessingTime: number;
  error: string | null;
}

const initialState: VideoState = {
  isRecording: false,
  isProcessing: false,
  originalFrame: null,
  processedFrame: null,
  frameCount: 0,
  fps: 0,
  quality: 0.8,
  cameraFacing: 'back',
  lastProcessingTime: 0,
  error: null,
};

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
      if (!action.payload) {
        state.frameCount = 0;
        state.fps = 0;
        state.originalFrame = null;
        state.processedFrame = null;
      }
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setOriginalFrame: (state, action: PayloadAction<string>) => {
      state.originalFrame = action.payload;
      state.frameCount += 1;
    },
    setProcessedFrame: (state, action: PayloadAction<{ frameData: string; processingTime: number }>) => {
      state.processedFrame = action.payload.frameData;
      state.lastProcessingTime = action.payload.processingTime;
      state.isProcessing = false;
    },
    setCameraFacing: (state, action: PayloadAction<'front' | 'back'>) => {
      state.cameraFacing = action.payload;
    },
    setQuality: (state, action: PayloadAction<number>) => {
      state.quality = Math.max(0.1, Math.min(1.0, action.payload));
    },
    updateFPS: (state, action: PayloadAction<number>) => {
      state.fps = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetVideo: (state) => {
      return { ...initialState, cameraFacing: state.cameraFacing, quality: state.quality };
    },
  },
});

export const {
  setRecording,
  setProcessing,
  setOriginalFrame,
  setProcessedFrame,
  setCameraFacing,
  setQuality,
  updateFPS,
  setError,
  clearError,
  resetVideo,
} = videoSlice.actions;

export default videoSlice.reducer;
