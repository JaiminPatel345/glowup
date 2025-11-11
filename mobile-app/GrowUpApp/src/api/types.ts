// Common API Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
  retry_possible?: boolean;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Skin Analysis Types
export interface SkinAnalysisRequest {
  image: FormData;
}

export interface SkinAnalysisResult {
  skinType: string;
  issues: SkinIssue[];
  analysisMetadata: {
    modelVersion: string;
    processingTime: number;
    imageQuality: number;
  };
}

export interface SkinIssue {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  causes: string[];
  highlightedImageUrl: string;
  confidence: number;
}

export interface ProductRecommendations {
  issueId: string;
  allProducts: Product[];
  ayurvedicProducts: Product[];
  nonAyurvedicProducts: Product[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  rating: number;
  imageUrl: string;
  isAyurvedic: boolean;
  ingredients: string[];
}

// Hair Try-On Types
export interface HairTryOnVideoRequest {
  video: FormData;
  styleImage: FormData;
  colorImage?: FormData;
}

export interface ProcessedVideo {
  resultVideoUrl: string;
  processingMetadata: {
    modelVersion: string;
    processingTime: number;
    framesProcessed: number;
  };
}

export interface WebSocketConnection {
  url: string;
  sessionId: string;
}

// User Management Types
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  skinType?: string;
  hairType?: string;
  preferences?: Record<string, any>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface UpdatePreferencesRequest {
  skinType?: string;
  hairType?: string;
  preferences?: Record<string, any>;
}