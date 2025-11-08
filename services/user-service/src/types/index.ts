export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  skinType?: string | null;
  hairType?: string | null;
  preferredLanguage: string;
  notificationSettings: any;
  privacySettings: any;
  appPreferences: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface CreateUserPreferencesRequest {
  skinType?: string;
  hairType?: string;
  preferredLanguage?: string;
  notificationSettings?: Record<string, any>;
  privacySettings?: Record<string, any>;
  appPreferences?: Record<string, any>;
}

export interface UpdateUserPreferencesRequest {
  skinType?: string;
  hairType?: string;
  preferredLanguage?: string;
  notificationSettings?: Record<string, any>;
  privacySettings?: Record<string, any>;
  appPreferences?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Skin and Hair type enums based on requirements
export enum SkinType {
  OILY = 'oily',
  DRY = 'dry',
  COMBINATION = 'combination',
  SENSITIVE = 'sensitive',
  NORMAL = 'normal'
}

export enum HairType {
  STRAIGHT = 'straight',
  WAVY = 'wavy',
  CURLY = 'curly',
  COILY = 'coily',
  FINE = 'fine',
  THICK = 'thick',
  DAMAGED = 'damaged',
  HEALTHY = 'healthy'
}