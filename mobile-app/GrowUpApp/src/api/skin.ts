import apiClient from './client';
import {
  SkinAnalysisResult,
  ProductRecommendations
} from './types';

interface SkinAnalysisHistoryResponseItem {
  analysis_id?: string;
  skin_type?: string | null;
  issues_count?: number;
  created_at?: string;
  issues?: Array<{ id?: string }>;
}

interface SkinAnalysisHistoryResponse {
  user_id?: string;
  analyses?: SkinAnalysisHistoryResponseItem[];
  total?: number;
}

export interface SkinAnalysisHistorySummary {
  id: string;
  skinType: string | null;
  issuesCount: number;
  createdAt: string;
}

export class SkinAnalysisApi {
  /**
   * Analyze uploaded face image for skin type and issues
   */
  static async analyzeImage(imageFormData: FormData, userId: string): Promise<SkinAnalysisResult> {
    // Add user_id to form data
    imageFormData.append('user_id', userId);

    const response = await apiClient.post<any>(
      '/skin/analyze',
      imageFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for AI processing
      }
    );

    // Transform snake_case to camelCase
    return {
      skinType: response.data.skin_type,
      issues: response.data.issues,
      analysisMetadata: {
        modelVersion: '1.0.0',
        processingTime: 0,
        imageQuality: 1.0
      }
    } as SkinAnalysisResult;
  }

  /**
   * Get product recommendations for a specific skin issue
   */
  static async getProductRecommendations(issueId: string): Promise<ProductRecommendations> {
    const response = await apiClient.get<{
      issue_id: string;
      all_products: any[];
      ayurvedic_products: any[];
      non_ayurvedic_products: any[];
    }>(
      `/skin/recommendations/${issueId}`
    );
    
    // Transform snake_case to camelCase
    return {
      issueId: response.data.issue_id,
      allProducts: response.data.all_products || [],
      ayurvedicProducts: response.data.ayurvedic_products || [],
      nonAyurvedicProducts: response.data.non_ayurvedic_products || [],
    };
  }

  /**
   * Get user's skin analysis history
   */
  static async getAnalysisHistory(userId: string, limit: number = 10, offset: number = 0): Promise<SkinAnalysisResult[]> {
    const response = await apiClient.get<{ user_id: string; analyses: any[]; total: number }>(
      `/skin/user/${userId}/history`,
      {
        params: { limit, offset }
      }
    );

    // Transform response
    return response.data.analyses.map((analysis: any) => ({
      skinType: analysis.skin_type,
      issues: analysis.issues || [],
      analysisMetadata: {
        modelVersion: '1.0.0',
        processingTime: 0,
        imageQuality: 1.0
      }
    }));
  }

  /**
   * Get a summarized version of the user's analysis history with metadata
   */
  static async getAnalysisHistorySummary(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ items: SkinAnalysisHistorySummary[]; total: number }> {
    const response = await apiClient.get<SkinAnalysisHistoryResponse>(
      `/skin/user/${userId}/history`,
      {
        params: { limit, offset },
      }
    );

    const analyses = response.data?.analyses ?? [];

    const items: SkinAnalysisHistorySummary[] = analyses.map((analysis, index) => ({
      id: analysis.analysis_id ?? analysis.created_at ?? `${userId}-${offset + index}`,
      skinType: analysis.skin_type ?? null,
      issuesCount:
        typeof analysis.issues_count === 'number'
          ? analysis.issues_count
          : Array.isArray(analysis.issues)
          ? analysis.issues.length
          : 0,
      createdAt: analysis.created_at ?? new Date().toISOString(),
    }));

    return {
      items,
      total: response.data?.total ?? items.length,
    };
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
    const response = await apiClient.get<any>(
      `/skin/issues/${issueId}`
    );
    return response.data;
  }
}

export default SkinAnalysisApi;