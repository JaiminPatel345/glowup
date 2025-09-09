const WebSocket = require('ws');

// Simple test to send a frame to the gateway
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to gateway');
  
  // Send a test frame after connection
  setTimeout(() => {
    const testFrame = {
      type: 'video_frame',
      data: {
        frameData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=',
        format: 'jpeg',
        timestamp: Date.now(),
        width: 640,
        height: 480,
        cameraFacing: 'back',
        quality: 0.8
      }
    };
    
    console.log('Sending test frame...');
    ws.send(JSON.stringify(testFrame));
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('Received message:', message.type, message.data);
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Connection closed');
});

// Keep the script running for a bit
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 10000);
