// Centralized API exports
export { default as apiClient } from './client';
export { default as AuthApi } from './auth';
export { default as SkinAnalysisApi } from './skin';
export { default as HairTryOnApi } from './hair';
export { default as UserApi } from './user';

// Export types
export * from './types';

// API Client interface for easy access
import AuthApi from './auth';
import SkinAnalysisApi from './skin';
import HairTryOnApi from './hair';
import UserApi from './user';

export interface ApiClient {
  auth: typeof AuthApi;
  skin: typeof SkinAnalysisApi;
  hair: typeof HairTryOnApi;
  user: typeof UserApi;
}

// Create centralized API object
export const api: ApiClient = {
  auth: AuthApi,
  skin: SkinAnalysisApi,
  hair: HairTryOnApi,
  user: UserApi,
};