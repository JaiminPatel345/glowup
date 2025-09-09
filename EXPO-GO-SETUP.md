# 📱 Using GlowUp with Expo Go (Tunnel Mode)

## ⚠️ Important Setup for Expo Go Users

When using Expo Go with tunnel mode, the app cannot connect to `localhost:8080` because your phone and computer are on different networks. You need to configure the WebSocket URL to use your computer's local network IP address.

## 🔧 Quick Setup

### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" address under your active network interface (usually starts with 192.168.x.x or 10.x.x.x)

### Step 2: Start the Backend Services

```bash
# Start the backend services on your computer
cd /path/to/glowup
./start-system.sh
```

This will start:
- Python Hair Service on port 50051
- Node.js Gateway on port 8080

### Step 3: Configure the App

1. **Open the Expo app** - You'll see connection errors initially
2. **Tap "Config"** button at the bottom of the screen
3. **Enter your WebSocket URL**: `ws://YOUR_IP_ADDRESS:8080`
   - Example: `ws://192.168.1.100:8080`
   - Replace `192.168.1.100` with your actual IP address
4. **Tap "Save"**

### Step 4: Test the Connection

- The app should now connect to your backend services
- You'll see "connected" status in the overlay
- The processed video feed should start showing face anonymization

## 🎯 Expected Behavior

Once connected:
- **Small live preview** (top-right): Shows raw camera feed
- **Main screen**: Shows processed video with face anonymization
- **Status overlay**: Shows FPS, frame count, and connection status
- **Real-time processing**: Faces should be blurred in the main view

## 🐛 Troubleshooting

### Connection Issues
- Ensure your phone and computer are on the same WiFi network
- Check that no firewall is blocking port 8080
- Verify the backend services are running (`./start-system.sh`)
- Try disabling VPN on either device

### Performance Issues
- Face detection requires good lighting
- Processing may be slower on older devices
- Network latency affects real-time performance

### Common Errors
- `Failed to connect to localhost`: Use the Config button to set your network IP
- `Connection timeout`: Check firewall settings and network connectivity
- `No processed video`: Ensure backend services are running and accessible

## 📋 Network Requirements

- **Same WiFi Network**: Phone and computer must be connected to the same network
- **Port Access**: Port 8080 must be accessible from your phone to your computer
- **Stable Connection**: Good WiFi signal for real-time video streaming

## 💡 Tips

- Use a stable WiFi connection for best performance
- Good lighting improves face detection accuracy
- The system processes at ~15 FPS for optimal real-time experience
- Face anonymization uses Gaussian blur for privacy protection
