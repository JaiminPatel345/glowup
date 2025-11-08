# GrowUp Mobile App

A React Native mobile application for AI-powered skin analysis and hair try-on features.

## Features

- **Authentication System**: Secure login/register with JWT tokens
- **Skin Analysis**: AI-powered skin analysis with product recommendations
- **Hair Try-On**: Real-time and video-based hair styling with AI
- **User Management**: Profile management and preferences
- **Secure Storage**: Token storage using React Native Keychain

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **Redux Toolkit** for state management
- **NativeWind** for styling (Tailwind CSS for React Native)
- **Axios** for API communication
- **React Native Keychain** for secure token storage
- **AsyncStorage** for local data persistence

## Project Structure

```
src/
├── api/                 # API layer with typed interfaces
│   ├── client.ts       # Axios client configuration
│   ├── auth.ts         # Authentication API
│   ├── skin.ts         # Skin analysis API
│   ├── hair.ts         # Hair try-on API
│   ├── user.ts         # User management API
│   └── types.ts        # API type definitions
├── components/         # Reusable UI components
│   ├── common/         # Common components (Button, Input)
│   └── auth/           # Authentication components
├── screens/            # Screen components
│   ├── auth/           # Authentication screens
│   └── main/           # Main app screens
├── store/              # Redux store configuration
│   └── slices/         # Redux slices
├── utils/              # Utility functions
├── constants/          # App constants
└── types/              # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd mobile-app/GrowUpApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on specific platform:
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator
   npm run web     # Web browser
   ```

## Configuration

### Environment Variables

The app automatically detects the environment and uses appropriate API endpoints:

- **Development**: `http://localhost:80/api`
- **Production**: `https://api.growup.app/api`

### API Integration

The app is configured to work with the following backend services:

- **User Service**: User authentication and management
- **Skin Analysis Service**: AI-powered skin analysis
- **Hair Try-On Service**: AI-powered hair styling

## Key Features Implementation

### Authentication Flow

- Secure login/register with form validation
- JWT token management with automatic refresh
- Secure token storage using React Native Keychain
- Protected routes for authenticated content

### State Management

- Redux Toolkit for predictable state management
- Async thunks for API calls
- Error handling with user-friendly messages
- Loading states for better UX

### Styling

- NativeWind for consistent styling
- Tailwind CSS classes for rapid development
- Custom color palette matching brand guidelines
- Responsive design principles

### Error Handling

- Global error handler for consistent error processing
- Network error detection and retry logic
- User-friendly error messages
- Automatic token refresh on 401 errors

## Development Guidelines

### Code Style

- TypeScript for type safety
- ESLint and Prettier for code formatting
- Consistent naming conventions
- Component-based architecture

### Testing

- Unit tests for utility functions
- Component testing with React Native Testing Library
- API integration tests
- End-to-end testing with Detox (planned)

### Security

- Secure token storage with React Native Keychain
- Input validation and sanitization
- HTTPS-only API communication
- Automatic token expiration handling

## Deployment

### iOS

1. Build the app:
   ```bash
   expo build:ios
   ```

2. Submit to App Store Connect

### Android

1. Build the app:
   ```bash
   expo build:android
   ```

2. Submit to Google Play Console

## Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests for review

## License

This project is proprietary and confidential.