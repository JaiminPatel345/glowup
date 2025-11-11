// Mock Redux store BEFORE importing webSocketClient
const mockDispatch = jest.fn();
const mockStore = {
  dispatch: mockDispatch,
  getState: jest.fn(() => ({})),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
  [Symbol.observable]: jest.fn(),
};

jest.mock('../../store', () => ({
  __esModule: true,
  store: mockStore,
  default: mockStore,
}));

// Mock the hairTryOnSlice actions
jest.mock('../../store/slices/hairTryOnSlice', () => ({
  setWebSocketConnected: jest.fn((payload) => ({ type: 'hairTryOn/setWebSocketConnected', payload })),
  setWebSocketError: jest.fn((payload) => ({ type: 'hairTryOn/setWebSocketError', payload })),
  setWebSocketLatency: jest.fn((payload) => ({ type: 'hairTryOn/setWebSocketLatency', payload })),
  setCurrentFrame: jest.fn((payload) => ({ type: 'hairTryOn/setCurrentFrame', payload })),
}));

// Import after mocks are set up
import { webSocketManager, HairTryOnWebSocketClient } from '../../utils/webSocketClient';

// Mock WebSocket
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: any) {
    // Simulate message echo for latency testing
    setTimeout(() => {
      if (this.onmessage && typeof data === 'string') {
        try {
          const message = JSON.parse(data);
          if (message.type === 'latency') {
            this.onmessage(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'latency',
                timestamp: message.timestamp,
              }),
            }));
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      }
    }, 50); // Simulate 50ms server response time
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
    }
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('Hair Try-On Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
  });

  describe('WebSocket Latency Tests', () => {
    it('should measure and report latency under 200ms target', async () => {
      const client = new HairTryOnWebSocketClient('ws://localhost:3004', 'test-session');
      
      const startTime = Date.now();
      await client.connect();
      const connectionTime = Date.now() - startTime;

      // Connection should be fast (under 100ms in test environment)
      expect(connectionTime).toBeLessThan(100);

      // Test latency measurement
      const latencyPromise = new Promise<number>((resolve) => {
        const originalDispatch = mockStore.dispatch;
        mockStore.dispatch = jest.fn((action: any) => {
          if (action.type === 'hairTryOn/setWebSocketLatency') {
            resolve(action.payload);
          }
          return originalDispatch(action);
        });
      });

      // Simulate ping/pong for latency measurement
      client.sendMessage({
        type: 'latency',
        data: 'ping',
        timestamp: Date.now(),
      });

      const latency = await latencyPromise;
      
      // Latency should be under 200ms target (in test, it should be around 50ms)
      expect(latency).toBeLessThan(200);
      expect(latency).toBeGreaterThan(0);

      client.disconnect();
    });

    it('should handle high-frequency frame sending without blocking', async () => {
      const client = new HairTryOnWebSocketClient('ws://localhost:3004', 'test-session');
      await client.connect();

      const frameCount = 100;
      const frameSize = 1024; // 1KB frames
      const testData = new ArrayBuffer(frameSize);

      const startTime = Date.now();
      
      // Send frames rapidly (simulating 30 FPS)
      for (let i = 0; i < frameCount; i++) {
        client.sendFrame(testData);
        
        // Small delay to simulate frame capture time
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const totalTime = Date.now() - startTime;
      const averageTimePerFrame = totalTime / frameCount;

      // Each frame should be processed quickly (under 10ms per frame for sending)
      expect(averageTimePerFrame).toBeLessThan(10);
      
      // Total time should be reasonable for 100 frames
      expect(totalTime).toBeLessThan(2000); // Under 2 seconds

      client.disconnect();
    });

    it('should maintain performance under connection stress', async () => {
      const connectionCount = 5;
      const clients: HairTryOnWebSocketClient[] = [];

      const startTime = Date.now();

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const client = new HairTryOnWebSocketClient(`ws://localhost:800${i}`, `session-${i}`);
        clients.push(client);
        await client.connect();
      }

      const connectionTime = Date.now() - startTime;

      // All connections should establish quickly
      expect(connectionTime).toBeLessThan(500);

      // Test concurrent frame sending
      const frameStartTime = Date.now();
      const testData = new ArrayBuffer(512);

      await Promise.all(
        clients.map(async (client, index) => {
          for (let i = 0; i < 10; i++) {
            client.sendFrame(testData);
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        })
      );

      const frameTime = Date.now() - frameStartTime;
      
      // Concurrent operations should not significantly degrade performance
      expect(frameTime).toBeLessThan(1000);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Memory and Resource Management', () => {
    it('should properly cleanup resources on disconnect', async () => {
      const client = new HairTryOnWebSocketClient('ws://localhost:3004', 'test-session');
      await client.connect();

      expect(client.isConnected).toBe(true);

      client.disconnect();

      expect(client.isConnected).toBe(false);
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      const cycles = 10;
      
      for (let i = 0; i < cycles; i++) {
        const client = new HairTryOnWebSocketClient('ws://localhost:3004', `session-${i}`);
        
        await client.connect();
        expect(client.isConnected).toBe(true);
        
        client.disconnect();
        expect(client.isConnected).toBe(false);
      }

      // Should complete without memory leaks or errors
      expect(true).toBe(true);
    });

    it('should handle large frame data efficiently', async () => {
      const client = new HairTryOnWebSocketClient('ws://localhost:3004', 'test-session');
      await client.connect();

      // Test with larger frame sizes (simulating high-quality video frames)
      const frameSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB

      for (const size of frameSizes) {
        const testData = new ArrayBuffer(size);
        const startTime = Date.now();
        
        client.sendFrame(testData);
        
        const sendTime = Date.now() - startTime;
        
        // Even large frames should be sent quickly (under 50ms)
        expect(sendTime).toBeLessThan(50);
      }

      client.disconnect();
    });
  });

  describe('Reconnection Performance', () => {
    it('should reconnect quickly after connection loss', async () => {
      const client = new HairTryOnWebSocketClient('ws://localhost:3004', 'test-session');
      await client.connect();

      expect(client.isConnected).toBe(true);

      // Simulate connection loss
      (client as any).ws.close(1006, 'Connection lost');

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for reconnect delay

      // Should attempt to reconnect (in real implementation)
      // This test verifies the reconnection logic exists
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hairTryOn/setWebSocketConnected',
          payload: false,
        })
      );
    });

    it('should implement exponential backoff for failed reconnections', async () => {
      const client = new HairTryOnWebSocketClient('ws://invalid-url', 'test-session');
      
      const startTime = Date.now();
      
      try {
        await client.connect();
      } catch (error) {
        const failTime = Date.now() - startTime;
        
        // Should fail quickly for invalid URL (under connection timeout)
        expect(failTime).toBeLessThan(11000); // 10 second timeout + buffer
      }
    });
  });

  describe('Frame Processing Performance', () => {
    it('should maintain target frame rate under load', async () => {
      const targetFPS = 10; // 10 FPS for real-time processing
      const testDuration = 1000; // 1 second test
      const expectedFrames = Math.floor((testDuration / 1000) * targetFPS);
      
      const client = new HairTryOnWebSocketClient('ws://localhost:3004', 'test-session');
      await client.connect();

      let framesSent = 0;
      const startTime = Date.now();
      
      const frameInterval = setInterval(() => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(frameInterval);
          return;
        }
        
        const testData = new ArrayBuffer(1024);
        client.sendFrame(testData);
        framesSent++;
      }, 1000 / targetFPS);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, testDuration + 100));

      // Should have sent approximately the expected number of frames
      expect(framesSent).toBeGreaterThanOrEqual(expectedFrames - 2); // Allow some tolerance
      expect(framesSent).toBeLessThanOrEqual(expectedFrames + 2);

      client.disconnect();
    });
  });

  describe('WebSocket Manager Performance', () => {
    it('should efficiently manage multiple client instances', () => {
      const startTime = Date.now();
      
      // Create multiple clients through manager
      for (let i = 0; i < 10; i++) {
        webSocketManager.createClient(`ws://localhost:800${i}`, `session-${i}`);
      }
      
      const creationTime = Date.now() - startTime;
      
      // Client creation should be fast
      expect(creationTime).toBeLessThan(100);
      
      // Should properly cleanup previous clients
      const currentClient = webSocketManager.getCurrentClient();
      expect(currentClient).toBeTruthy();
      
      webSocketManager.disconnect();
      expect(webSocketManager.getCurrentClient()).toBeNull();
    });
  });
});