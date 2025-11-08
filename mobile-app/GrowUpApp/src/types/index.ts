// Re-export API types
export * from '../api/types';

// Navigation types
export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main App Stack
  Home: undefined;
  Profile: undefined;
  
  // Skin Analysis Stack
  SkinAnalysis: undefined;
  SkinResults: { analysisId: string };
  ProductRecommendations: { issueId: string };
  
  // Hair Try-On Stack
  HairTryOn: undefined;
  HairVideoUpload: undefined;
  HairRealTime: undefined;
  HairResults: { sessionId: string };
};

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  testID?: string;
}

export interface ButtonProps extends BaseComponentProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export interface InputProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

// Image/Video Types
export interface MediaFile {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface ImagePickerResult {
  cancelled: boolean;
  uri?: string;
  width?: number;
  height?: number;
  type?: string;
  fileSize?: number;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'frame' | 'result' | 'error' | 'status';
  data: any;
  timestamp: number;
}

export interface RealTimeSession {
  sessionId: string;
  websocket: WebSocket | null;
  isConnected: boolean;
  styleImageUrl: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  retryable?: boolean;
}

// App State Types
export interface AppState {
  isOnboardingCompleted: boolean;
  currentTheme: 'light' | 'dark';
  language: string;
  notifications: {
    enabled: boolean;
    skinAnalysis: boolean;
    hairTryOn: boolean;
    productRecommendations: boolean;
  };
}

// Analytics Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

// Cache Types
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items
}