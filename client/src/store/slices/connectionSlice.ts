import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  sessionId: string | null;
  serverUrl: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastError: string | null;
  latency: number;
  bytesTransmitted: number;
  bytesReceived: number;
  isAutoReconnect: boolean;
}

const initialState: ConnectionState = {
  status: 'disconnected',
  sessionId: null,
  serverUrl: 'ws://localhost:8080',
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  lastError: null,
  latency: 0,
  bytesTransmitted: 0,
  bytesReceived: 0,
  isAutoReconnect: true,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload;
      if (action.payload === 'connected') {
        state.reconnectAttempts = 0;
        state.lastError = null;
      }
    },
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload;
    },
    setServerUrl: (state, action: PayloadAction<string>) => {
      state.serverUrl = action.payload;
    },
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.lastError = action.payload;
      state.status = 'error';
    },
    clearError: (state) => {
      state.lastError = null;
    },
    updateLatency: (state, action: PayloadAction<number>) => {
      state.latency = action.payload;
    },
    updateBytesTransmitted: (state, action: PayloadAction<number>) => {
      state.bytesTransmitted += action.payload;
    },
    updateBytesReceived: (state, action: PayloadAction<number>) => {
      state.bytesReceived += action.payload;
    },
    setAutoReconnect: (state, action: PayloadAction<boolean>) => {
      state.isAutoReconnect = action.payload;
    },
    resetConnection: (state) => {
      return {
        ...initialState,
        serverUrl: state.serverUrl,
        isAutoReconnect: state.isAutoReconnect,
      };
    },
  },
});

export const {
  setConnectionStatus,
  setSessionId,
  setServerUrl,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setError,
  clearError,
  updateLatency,
  updateBytesTransmitted,
  updateBytesReceived,
  setAutoReconnect,
  resetConnection,
} = connectionSlice.actions;

export default connectionSlice.reducer;
