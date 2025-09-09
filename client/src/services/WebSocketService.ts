import { store } from '../store';
import type { RootState } from '../store';
import type { ConnectionState } from '../store/slices/connectionSlice';
import config from '../config';
import {
  setConnectionStatus,
  setSessionId,
  setError as setConnectionError,
  updateLatency,
  updateBytesTransmitted,
  updateBytesReceived,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setServerUrl,
} from '../store/slices/connectionSlice';
import {
  setProcessedFrame,
  setError as setVideoError,
  setProcessing,
} from '../store/slices/videoSlice';

export interface VideoFrame {
  frameData: string;
  format: string;
  timestamp: number;
  width?: number;
  height?: number;
  cameraFacing: 'front' | 'back';
  quality: number;
  metadata?: Record<string, any>;
}

export interface ProcessedFrameResponse {
  sessionId: string;
  frameData: string;
  format: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private frameQueue: VideoFrame[] = [];
  private maxQueueSize = 5; // Limit queue size for real-time processing
  private lastPingTime = 0;

  constructor(private serverUrl: string = config.websocketUrl) {
    // Update the store with the configured URL
    store.dispatch(setServerUrl(this.serverUrl));
    
    // Log configuration for debugging
    console.log('WebSocket Service initialized with URL:', this.serverUrl);
    if (config.isExpoGo) {
      console.log('Running in Expo Go - make sure gateway is accessible from your network');
    }
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    store.dispatch(setConnectionStatus('connecting'));

    try {
      this.ws = new WebSocket(this.serverUrl);
      this.setupEventListeners();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      store.dispatch(setConnectionError(errorMessage));
      throw error;
    }
  }

  disconnect(): void {
    this.isReconnecting = false;
    this.clearTimeouts();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    store.dispatch(setConnectionStatus('disconnected'));
    store.dispatch(setSessionId(null));
  }

  sendFrame(frame: VideoFrame): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, queueing frame');
      this.queueFrame(frame);
      return;
    }

    try {
      const message = {
        type: 'video_frame',
        data: frame,
      };

      const messageStr = JSON.stringify(message);
      this.ws!.send(messageStr);
      
      // Update bytes transmitted
      store.dispatch(updateBytesTransmitted(messageStr.length));
      store.dispatch(setProcessing(true));
    } catch (error) {
      console.error('Failed to send frame:', error);
      store.dispatch(setVideoError('Failed to send video frame'));
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      store.dispatch(setConnectionStatus('connected'));
      store.dispatch(resetReconnectAttempts());
      this.startPingInterval();
      this.processQueuedFrames();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
        
        // Update bytes received
        store.dispatch(updateBytesReceived(event.data.length));
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      store.dispatch(setConnectionStatus('disconnected'));
      this.clearTimeouts();
      
      if (!this.isReconnecting && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      store.dispatch(setConnectionError('Connection error'));
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'connection_established':
        console.log('Session established:', message.data.sessionId);
        store.dispatch(setSessionId(message.data.sessionId));
        break;

      case 'processed_frame':
        this.handleProcessedFrame(message.data);
        break;

      case 'pong':
        this.handlePong(message.data.timestamp);
        break;

      case 'error':
        console.error('Server error:', message.data);
        store.dispatch(setVideoError(message.data.message));
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleProcessedFrame(data: ProcessedFrameResponse): void {
    const processingTime = Date.now() - data.timestamp;
    
    store.dispatch(setProcessedFrame({
      frameData: data.frameData,
      processingTime,
    }));
  }

  private handlePong(serverTimestamp: number): void {
    const latency = Date.now() - this.lastPingTime;
    store.dispatch(updateLatency(latency));
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.lastPingTime = Date.now();
        this.ws!.send(JSON.stringify({
          type: 'ping',
          data: { timestamp: this.lastPingTime },
        }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private attemptReconnect(): void {
    // Simplified reconnection logic to avoid typing issues
    this.isReconnecting = true;
    store.dispatch(incrementReconnectAttempts());
    
    const delay = 3000; // 3 second delay for reconnection
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnection attempt`);
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }

  private queueFrame(frame: VideoFrame): void {
    // Keep only the most recent frames to avoid memory issues
    if (this.frameQueue.length >= this.maxQueueSize) {
      this.frameQueue.shift(); // Remove oldest frame
    }
    this.frameQueue.push(frame);
  }

  private processQueuedFrames(): void {
    while (this.frameQueue.length > 0 && this.isConnected()) {
      const frame = this.frameQueue.shift()!;
      this.sendFrame(frame);
    }
  }

  private clearTimeouts(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'No connection';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'Connecting';
      case WebSocket.OPEN:
        return 'Connected';
      case WebSocket.CLOSING:
        return 'Closing';
      case WebSocket.CLOSED:
        return 'Closed';
      default:
        return 'Unknown';
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
