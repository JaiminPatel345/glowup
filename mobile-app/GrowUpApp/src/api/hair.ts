import apiClient from './client';
import { ApiResponse } from './types';

export interface Hairstyle {
  id: string;
  preview_image_url: string;
  style_name: string;
  category: string;
  description?: string;
  tags?: string[];
}

export interface HairstylesResponse {
  success: boolean;
  count: number;
  hairstyles: Hairstyle[];
}

export interface ProcessHairTryOnRequest {
  userPhoto: any; // File/Blob
  hairstyleImage?: any; // File/Blob (optional)
  hairstyleId?: string; // (optional)
  userId: string;
  blendRatio?: number;
}

export interface HairTryOnHistory {
  result_id: string;
  user_id: string;
  hairstyle_source: string;
  blend_ratio: number;
  created_at: string;
  status: string;
}

export class HairTryOnApi {
  /**
   * Get default hairstyles from PerfectCorp API
   */
  static async getDefaultHairstyles(
    pageSize: number = 20,
    startingToken?: string,
    forceRefresh: boolean = false
  ): Promise<Hairstyle[]> {
    const params: any = { page_size: pageSize, force_refresh: forceRefresh };
    if (startingToken) {
      params.starting_token = startingToken;
    }

    const response = await apiClient.get<HairstylesResponse>(
      '/api/hair-tryOn/hairstyles',
      { params }
    );
    return response.data.hairstyles;
  }

  /**
   * Get a specific hairstyle by ID
   */
  static async getHairstyleById(hairstyleId: string): Promise<Hairstyle> {
    const response = await apiClient.get<{ success: boolean; hairstyle: Hairstyle }>(
      `/api/hair-tryOn/hairstyles/${hairstyleId}`
    );
    return response.data.hairstyle;
  }

  /**
   * Process hair try-on with either default or custom hairstyle
   */
  static async processHairTryOn(request: ProcessHairTryOnRequest): Promise<Blob> {
    const formData = new FormData();
    
    // Add user photo
    formData.append('user_photo', request.userPhoto);
    
    // Add hairstyle (either custom image or ID)
    if (request.hairstyleImage) {
      formData.append('hairstyle_image', request.hairstyleImage);
    } else if (request.hairstyleId) {
      formData.append('hairstyle_id', request.hairstyleId);
    } else {
      throw new Error('Either hairstyleImage or hairstyleId must be provided');
    }
    
    // Add user ID
    formData.append('user_id', request.userId);
    
    // Add blend ratio
    formData.append('blend_ratio', String(request.blendRatio || 0.8));

    const response = await apiClient.post(
      '/api/hair-tryOn/process',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        timeout: 60000, // 1 minute for image processing
      }
    );
    
    return response.data;
  }

  /**
   * Get user's hair try-on history
   */
  static async getHairTryOnHistory(
    userId: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<HairTryOnHistory[]> {
    const response = await apiClient.get<{ success: boolean; count: number; history: HairTryOnHistory[] }>(
      `/api/hair-tryOn/history/${userId}`,
      {
        params: { limit, skip }
      }
    );
    return response.data.history;
  }

  /**
   * Delete a hair try-on result
   */
  static async deleteHairTryOn(resultId: string, userId: string): Promise<void> {
    await apiClient.delete(`/api/hair-tryOn/result/${resultId}`, {
      params: { user_id: userId }
    });
  }

  /**
   * Get service health status
   */
  static async getHealthStatus(): Promise<any> {
    const response = await apiClient.get('/api/hair-tryOn/health');
    return response.data;
  }

  /**
   * Clear hairstyles cache
   */
  static async clearCache(): Promise<void> {
    await apiClient.post('/api/hair-tryOn/cache/clear');
  }
}

export default HairTryOnApi;