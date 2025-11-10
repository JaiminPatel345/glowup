# 🚀 Quick Start Guide - GrowUp Mobile App

## Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

## 📦 Installation

```bash
# Navigate to the mobile app directory
cd mobile-app/GrowUpApp

# Install dependencies
yarn install

# Clear cache (important for NativeWind)
yarn start --clear
```

## 🏃 Running the App

### Option 1: Using Expo Go (Recommended for Quick Testing)

```bash
# Start the development server
yarn start

# Scan the QR code with:
# - iOS: Camera app
# - Android: Expo Go app
```

### Option 2: iOS Simulator (Mac only)

```bash
yarn ios
```

### Option 3: Android Emulator

```bash
yarn android
```

### Option 4: Web Browser

```bash
yarn web
```

## 🎨 NativeWind Styling

All components are styled using NativeWind (Tailwind CSS for React Native).

### If Styles Don't Appear:

1. **Clear Metro Cache:**
   ```bash
   yarn start --clear
   ```

2. **Clear Expo Cache:**
   ```bash
   rm -rf .expo
   yarn start --clear
   ```

3. **Reinstall Dependencies:**
   ```bash
   rm -rf node_modules
   yarn install
   yarn start --clear
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `mobile-app/GrowUpApp` directory:

```env
API_BASE_URL=http://localhost:3000/api
WS_BASE_URL=ws://localhost:3000
```

### Backend Connection

Make sure the backend services are running:

```bash
# From the root directory
docker-compose up
```

## 📱 Features

- ✅ User Authentication (Login, Register, Forgot Password)
- ✅ Skin Analysis with AI
- ✅ Hair Try-On with AI
- ✅ Product Recommendations
- ✅ Real-time Updates via WebSocket
- ✅ Secure Storage for Tokens
- ✅ Redux State Management
- ✅ Full NativeWind Styling

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run integration tests
yarn test:integration
```

## 📂 Project Structure

```
src/
├── api/              # API client and endpoints
├── components/       # Reusable components
│   ├── auth/        # Authentication components
│   ├── common/      # Common UI components (Button, Input)
│   ├── hair/        # Hair try-on components
│   └── skin/        # Skin analysis components
├── screens/         # Screen components
│   ├── auth/        # Auth screens
│   ├── hair/        # Hair try-on screen
│   ├── main/        # Home screen
│   └── skin/        # Skin analysis screen
├── store/           # Redux store and slices
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## 🎯 Common Issues & Solutions

### Issue: "Unable to resolve module"

**Solution:**
```bash
yarn start --clear
```

### Issue: "Network request failed"

**Solution:**
- Check if backend is running
- Update API_BASE_URL in .env
- For iOS Simulator: Use `http://localhost:3000`
- For Android Emulator: Use `http://10.0.2.2:3000`
- For Physical Device: Use your computer's IP address

### Issue: Styles not appearing

**Solution:**
```bash
# Clear all caches
rm -rf node_modules .expo
yarn install
yarn start --clear
```

### Issue: "Invariant Violation: requireNativeComponent"

**Solution:**
```bash
# Rebuild the app
yarn ios --clean
# or
yarn android --clean
```

## 📖 Documentation

- [NativeWind Setup Guide](./NATIVEWIND_SETUP.md)
- [API Documentation](../../docs/api/)
- [Testing Guide](./src/__tests__/README.md)

## 🔗 Useful Commands

```bash
# Start with clear cache
yarn start --clear

# Start on specific platform
yarn ios
yarn android
yarn web

# Run tests
yarn test
yarn test:watch
yarn test:coverage

# Type checking
npx tsc --noEmit

# Lint code
npx eslint src/
```

## 🌐 API Endpoints

The app connects to these backend services:

- **Auth Service**: `http://localhost:3001`
- **Skin Analysis Service**: `http://localhost:3002`
- **Hair Try-On Service**: `http://localhost:3003`
- **API Gateway**: `http://localhost:3000`

## 📱 Supported Platforms

- ✅ iOS (13.0+)
- ✅ Android (API 21+)
- ✅ Web (Modern browsers)

## 🎨 Design System

The app uses a custom Tailwind color palette:

- **Primary**: Blue (#0284c7)
- **Secondary**: Pink (#ec4899)
- **Success**: Green (#22c55e)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

## 🔐 Security

- Secure token storage using Expo SecureStore
- HTTPS for production API calls
- Input validation and sanitization
- Protected routes with authentication

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review common issues above
3. Check the logs in Metro bundler
4. Review the backend logs

## 🎉 Happy Coding!

Your GrowUp mobile app is ready to go! Start the development server and begin building amazing features.
