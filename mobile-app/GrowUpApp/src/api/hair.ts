import apiClient from './client';
import { 
  HairTryOnVideoRequest,
  ProcessedVideo,
  WebSocketConnection,
  ApiResponse 
} from './types';

export class HairTryOnApi {
  /**
   * Process video with hair style application
   */
  static async processVideo(
    videoFormData: FormData,
    styleImageFormData: FormData,
    colorImageFormData?: FormData
  ): Promise<ProcessedVideo> {
    // Combine all form data
    const combinedFormData = new FormData();
    
    // Add video file
    const videoFile = videoFormData.get('video');
    if (videoFile) {
      combinedFormData.append('video', videoFile);
    }
    
    // Add style image
    const styleFile = styleImageFormData.get('styleImage');
    if (styleFile) {
      combinedFormData.append('styleImage', styleFile);
    }
    
    // Add color image if provided
    if (colorImageFormData) {
      const colorFile = colorImageFormData.get('colorImage');
      if (colorFile) {
        combinedFormData.append('colorImage', colorFile);
      }
    }

    const response = await apiClient.post<ApiResponse<ProcessedVideo>>(
      '/hair/process-video',
      combinedFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for video processing
      }
    );
    return response.data.data;
  }

  /**
   * Start real-time hair try-on session
   */
  static async startRealTimeSession(styleImageFormData: FormData): Promise<WebSocketConnection> {
    const response = await apiClient.post<ApiResponse<WebSocketConnection>>(
      '/hair/start-realtime',
      styleImageFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Get hair try-on processing status
   */
  static async getProcessingStatus(sessionId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/hair/status/${sessionId}`
    );
    return response.data.data;
  }

  /**
   * Get user's hair try-on history
   */
  static async getHairTryOnHistory(limit: number = 10, offset: number = 0): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      '/hair/history',
      {
        params: { limit, offset }
      }
    );
    return response.data.data;
  }

  /**
   * Delete a hair try-on result
   */
  static async deleteHairTryOn(tryOnId: string): Promise<void> {
    await apiClient.delete(`/hair/tryon/${tryOnId}`);
  }

  /**
   * Cancel ongoing video processing
   */
  static async cancelProcessing(sessionId: string): Promise<void> {
    await apiClient.post(`/hair/cancel/${sessionId}`);
  }
}

export default HairTryOnApi;