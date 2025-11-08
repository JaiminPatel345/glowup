import { store } from '../store';
import {
  setWebSocketConnected,
  setWebSocketError,
  setWebSocketLatency,
  setCurrentFrame,
} from '../store/slices/hairTryOnSlice';

export interface WebSocketMessage {
  type: 'frame' | 'error' | 'status' | 'latency';
  data: any;
  timestamp?: number;
}

export class HairTryOnWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isManuallyDisconnected = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;

  constructor(private url: string, private sessionId: string) {}

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManuallyDisconnected = false;
        this.ws = new WebSocket(`${this.url}?sessionId=${this.sessionId}`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          store.dispatch(setWebSocketConnected(true));
          store.dispatch(setWebSocketError(undefined));
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          store.dispatch(setWebSocketConnected(false));
          this.stopPing();
          
          if (!this.isManuallyDisconnected && this.shouldReconnect(event.code)) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          store.dispatch(setWebSocketError('Connection error occurred'));
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    store.dispatch(setWebSocketConnected(false));
  }

  /**
   * Send frame data to server
   */
  sendFrame(frameData: ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(frameData);
    } else {
      console.warn('WebSocket not connected, cannot send frame');
    }
  }

  /**
   * Send JSON message to server
   */
  sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Handle binary data (processed frames)
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        this.handleFrameData(event.data);
        return;
      }

      // Handle JSON messages
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'frame':
          // Frame data as base64 string
          if (typeof message.data === 'string') {
            store.dispatch(setCurrentFrame(message.data));
          }
          break;
          
        case 'error':
          console.error('Server error:', message.data);
          store.dispatch(setWebSocketError(message.data));
          break;
          
        case 'status':
          console.log('Server status:', message.data);
          break;
          
        case 'latency':
          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            store.dispatch(setWebSocketLatency(latency));
          }
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle binary frame data
   */
  private handleFrameData(data: ArrayBuffer | Blob): void {
    // Convert binary data to base64 for display
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        store.dispatch(setCurrentFrame(reader.result));
      }
    };
    reader.readAsDataURL(data instanceof ArrayBuffer ? new Blob([data]) : data);
  }

  /**
   * Start ping/pong for latency measurement
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.sendMessage({
          type: 'latency',
          data: 'ping',
          timestamp: this.lastPingTime,
        });
      }
    }, 5000); // Ping every 5 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Check if we should attempt to reconnect
   */
  private shouldReconnect(closeCode: number): boolean {
    // Don't reconnect for certain close codes
    const noReconnectCodes = [1000, 1001, 1005, 4000, 4001, 4002, 4003];
    return !noReconnectCodes.includes(closeCode) && this.reconnectAttempts < this.maxReconnectAttempts;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.isManuallyDisconnected) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`);
        this.connect().catch((error) => {
          console.error('Reconnect failed:', error);
          store.dispatch(setWebSocketError(`Reconnect failed: ${error.message}`));
        });
      }
    }, this.reconnectDelay);
    
    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.maxReconnectDelay
    );
  }

  /**
   * Get current connection state
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current ready state
   */
  get readyState(): number | undefined {
    return this.ws?.readyState;
  }
}

// Singleton instance manager
class WebSocketManager {
  private client: HairTryOnWebSocketClient | null = null;

  /**
   * Create new WebSocket client
   */
  createClient(url: string, sessionId: string): HairTryOnWebSocketClient {
    // Disconnect existing client if any
    if (this.client) {
      this.client.disconnect();
    }
    
    this.client = new HairTryOnWebSocketClient(url, sessionId);
    return this.client;
  }

  /**
   * Get current client
   */
  getCurrentClient(): HairTryOnWebSocketClient | null {
    return this.client;
  }

  /**
   * Disconnect current client
   */
  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}

export const webSocketManager = new WebSocketManager();
export default HairTryOnWebSocketClient;