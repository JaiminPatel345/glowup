import apiClient from './client';
import { 
  SkinAnalysisRequest,
  SkinAnalysisResult, 
  ProductRecommendations,
  ApiResponse 
} from './types';

export class SkinAnalysisApi {
  /**
   * Analyze uploaded face image for skin type and issues
   */
  static async analyzeImage(imageFormData: FormData): Promise<SkinAnalysisResult> {
    const response = await apiClient.post<ApiResponse<SkinAnalysisResult>>(
      '/skin/analyze',
      imageFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for AI processing
      }
    );
    return response.data.data;
  }

  /**
   * Get product recommendations for a specific skin issue
   */
  static async getProductRecommendations(issueId: string): Promise<ProductRecommendations> {
    const response = await apiClient.get<ApiResponse<ProductRecommendations>>(
      `/skin/recommendations/${issueId}`
    );
    return response.data.data;
  }

  /**
   * Get user's skin analysis history
   */
  static async getAnalysisHistory(limit: number = 10, offset: number = 0): Promise<SkinAnalysisResult[]> {
    const response = await apiClient.get<ApiResponse<SkinAnalysisResult[]>>(
      '/skin/history',
      {
        params: { limit, offset }
      }
    );
    return response.data.data;
  }

  /**
   * Delete a specific skin analysis result
   */
  static async deleteAnalysis(analysisId: string): Promise<void> {
    await apiClient.delete(`/skin/analysis/${analysisId}`);
  }

  /**
   * Get detailed information about a skin issue
   */
  static async getIssueDetails(issueId: string): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/skin/issues/${issueId}`
    );
    return response.data.data;
  }
}

export default SkinAnalysisApi;