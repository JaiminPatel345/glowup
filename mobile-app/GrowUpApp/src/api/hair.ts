import axios from 'axios';
import apiClient from './client';
import type { ProcessedVideo, WebSocketConnection } from './types';

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

interface HairTryOnHistoryResponseItem {
  id?: string;
  result_id?: string;
  user_id?: string;
  type?: 'video' | 'realtime';
  original_media_url?: string;
  originalMediaUrl?: string;
  style_image_url?: string;
  styleImageUrl?: string;
  color_image_url?: string | null;
  colorImageUrl?: string | null;
  result_media_url?: string | null;
  resultMediaUrl?: string | null;
  processing_metadata?: Record<string, any> | null;
  processingMetadata?: Record<string, any> | null;
  created_at?: string;
  createdAt?: string;
  status?: string;
}

export interface HairTryOnHistoryItem {
  id: string;
  type: 'video' | 'realtime';
  originalMediaUrl: string;
  styleImageUrl: string;
  colorImageUrl?: string;
  resultMediaUrl: string;
  processingMetadata: {
    modelVersion: string;
    processingTime: number;
    framesProcessed: number;
  };
  createdAt: string;
  status?: string;
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
      '/hair-tryOn/hairstyles',
      { params }
    );
    return response.data.hairstyles;
  }

  /**
   * Get a specific hairstyle by ID
   */
  static async getHairstyleById(hairstyleId: string): Promise<Hairstyle> {
    const response = await apiClient.get<{ success: boolean; hairstyle: Hairstyle }>(
      `/hair-tryOn/hairstyles/${hairstyleId}`
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
      '/hair-tryOn/process',
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
   * Process a recorded video using the Hair Try-On service
   */
  static async processVideo(
    videoFormData: FormData,
    styleImageFormData: FormData,
    colorImageFormData?: FormData
  ): Promise<ProcessedVideo> {
    const formData = HairTryOnApi.mergeFormData(
      videoFormData,
      styleImageFormData,
      colorImageFormData
    );

    const response = await apiClient.post(
      '/hair-tryOn/process-video',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return HairTryOnApi.mapProcessedVideo(response.data);
  }

  /**
   * Start a real-time hair try-on session and receive WebSocket connection details
   */
  static async startRealTimeSession(
    styleImageFormData: FormData
  ): Promise<WebSocketConnection> {
    const response = await apiClient.post(
      '/hair-tryOn/realtime/session',
      styleImageFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const data = response.data ?? {};
    const url = data.url ?? data.connectionUrl ?? data.connection_url;
    const sessionId = data.sessionId ?? data.session_id;

    if (!url || !sessionId) {
      throw new Error('Invalid response from real-time session endpoint');
    }

    return {
      url,
      sessionId,
    };
  }

  /**
   * Get user's hair try-on history
   */
  static async getHairTryOnHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<HairTryOnHistoryItem[]> {
    const response = await apiClient.get(
      `/hair-tryOn/history/${userId}`,
      {
        params: {
          limit,
          offset,
          skip: offset,
        },
      }
    );

    const payload = response.data ?? {};
    const history: HairTryOnHistoryResponseItem[] =
      payload.history ?? payload.results ?? [];

    return history.map(HairTryOnApi.mapHistoryItem);
  }

  /**
   * Delete a hair try-on result
   */
  static async deleteHairTryOn(resultId: string, userId: string): Promise<void> {
    await apiClient.delete(`/hair-tryOn/result/${resultId}`, {
      params: { user_id: userId }
    });
  }

  /**
   * Cancel an in-progress hair try-on processing session
   */
  static async cancelProcessing(sessionId: string): Promise<void> {
    try {
      await apiClient.post('/hair-tryOn/process/cancel', {
        session_id: sessionId,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 501) {
          // Endpoint not available yet; treat as best-effort cancellation
          if (__DEV__) {
            console.warn(
              'HairTryOnApi.cancelProcessing: endpoint not available, skipping cancel request',
              { sessionId }
            );
          }
          return;
        }
      }

      throw error;
    }
  }

  /**
   * Get service health status
   */
  static async getHealthStatus(): Promise<any> {
    const response = await apiClient.get('/hair-tryOn/health');
    return response.data;
  }

  /**
   * Clear hairstyles cache
   */
  static async clearCache(): Promise<void> {
    await apiClient.post('/hair-tryOn/cache/clear');
  }

  private static mergeFormData(...forms: Array<FormData | undefined>): FormData {
    const merged = new FormData();

    forms.forEach((form) => {
      if (!form) {
        return;
      }

      form.forEach((value, key) => {
        merged.append(key, value as any);
      });
    });

    return merged;
  }

  private static mapProcessedVideo(data: any): ProcessedVideo {
  const metadata = (data?.processing_metadata ?? data?.processingMetadata ?? {}) as Record<string, any>;

    return {
      resultVideoUrl:
        data?.resultVideoUrl ?? data?.result_media_url ?? data?.resultMediaUrl ?? '',
      processingMetadata: {
        modelVersion:
          metadata?.modelVersion ?? metadata?.model_version ?? 'unknown',
        processingTime:
          metadata?.processingTime ?? metadata?.processing_time ?? 0,
        framesProcessed:
          metadata?.framesProcessed ?? metadata?.frames_processed ?? 0,
      },
    };
  }

  private static mapHistoryItem(item: HairTryOnHistoryResponseItem): HairTryOnHistoryItem {
  const metadata = (item.processing_metadata ?? item.processingMetadata ?? {}) as Record<string, any>;

    return {
      id: item.id ?? item.result_id ?? '',
      type: item.type ?? 'video',
      originalMediaUrl:
        item.original_media_url ?? item.originalMediaUrl ?? '',
      styleImageUrl: item.style_image_url ?? item.styleImageUrl ?? '',
      colorImageUrl:
        item.color_image_url ?? item.colorImageUrl ?? undefined,
      resultMediaUrl:
        item.result_media_url ?? item.resultMediaUrl ?? '',
      processingMetadata: {
        modelVersion:
          metadata?.model_version ?? metadata?.modelVersion ?? 'unknown',
        processingTime:
          metadata?.processing_time ?? metadata?.processingTime ?? 0,
        framesProcessed:
          metadata?.frames_processed ?? metadata?.framesProcessed ?? 0,
      },
      createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
      status: item.status,
    };
  }
}

export default HairTryOnApi;