import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SkinAnalysisApi } from '../../api';
import { 
  SkinAnalysisResult, 
  ProductRecommendations,
  SkinIssue 
} from '../../api/types';
import GlobalErrorHandler from '../../utils/errorHandler';

// Skin Analysis state interface
export interface SkinAnalysisState {
  // Current analysis
  currentAnalysis: SkinAnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // Analysis history
  analysisHistory: SkinAnalysisResult[];
  isLoadingHistory: boolean;
  historyError: string | null;
  
  // Product recommendations
  productRecommendations: Record<string, ProductRecommendations>;
  isLoadingRecommendations: Record<string, boolean>;
  recommendationErrors: Record<string, string>;
  
  // UI state
  selectedIssue: SkinIssue | null;
  productFilter: 'all' | 'ayurvedic' | 'non-ayurvedic';
  
  // Image caching
  cachedImages: Record<string, string>; // analysisId -> imageUri
  
  // Retry functionality
  retryCount: number;
  maxRetries: number;
}

// Initial state
const initialState: SkinAnalysisState = {
  currentAnalysis: null,
  isAnalyzing: false,
  analysisError: null,
  
  analysisHistory: [],
  isLoadingHistory: false,
  historyError: null,
  
  productRecommendations: {},
  isLoadingRecommendations: {},
  recommendationErrors: {},
  
  selectedIssue: null,
  productFilter: 'all',
  
  cachedImages: {},
  
  retryCount: 0,
  maxRetries: 3,
};

// Async thunks for skin analysis actions
export const analyzeImage = createAsyncThunk(
  'skinAnalysis/analyzeImage',
  async (imageFormData: FormData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { skinAnalysis: SkinAnalysisState; auth: { user: { id: string } | null } };
      
      // Get userId from auth state
      const userId = state.auth.user?.id;
      if (!userId) {
        return rejectWithValue({
          message: 'User not authenticated',
          retryable: false,
        });
      }
      
      const result = await SkinAnalysisApi.analyzeImage(imageFormData, userId);
      return result;
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Skin Analysis');
      return rejectWithValue({
        message: processedError.message,
        retryable: processedError.retryable || false,
      });
    }
  }
);

export const retryAnalysis = createAsyncThunk(
  'skinAnalysis/retryAnalysis',
  async (imageFormData: FormData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { skinAnalysis: SkinAnalysisState; auth: { user: { id: string } | null } };
      
      if (state.skinAnalysis.retryCount >= state.skinAnalysis.maxRetries) {
        return rejectWithValue({
          message: 'Maximum retry attempts reached',
          retryable: false,
        });
      }
      
      // Get userId from auth state
      const userId = state.auth.user?.id;
      if (!userId) {
        return rejectWithValue({
          message: 'User not authenticated',
          retryable: false,
        });
      }
      
      const result = await SkinAnalysisApi.analyzeImage(imageFormData, userId);
      return result;
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Skin Analysis Retry');
      return rejectWithValue({
        message: processedError.message,
        retryable: processedError.retryable || false,
      });
    }
  }
);

export const loadAnalysisHistory = createAsyncThunk(
  'skinAnalysis/loadHistory',
  async (
    { limit = 10, offset = 0 }: { limit?: number; offset?: number } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      
      // Get userId from auth state
      const userId = state.auth.user?.id;
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      const history = await SkinAnalysisApi.getAnalysisHistory(userId, limit, offset);
      return { history, offset };
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Load Analysis History');
      return rejectWithValue(processedError.message);
    }
  }
);

export const loadProductRecommendations = createAsyncThunk(
  'skinAnalysis/loadRecommendations',
  async (issueId: string, { rejectWithValue }) => {
    try {
      const recommendations = await SkinAnalysisApi.getProductRecommendations(issueId);
      return { issueId, recommendations };
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Load Product Recommendations');
      return rejectWithValue({ issueId, message: processedError.message });
    }
  }
);

export const deleteAnalysis = createAsyncThunk(
  'skinAnalysis/deleteAnalysis',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      await SkinAnalysisApi.deleteAnalysis(analysisId);
      return analysisId;
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Delete Analysis');
      return rejectWithValue(processedError.message);
    }
  }
);

// Skin Analysis slice
const skinAnalysisSlice = createSlice({
  name: 'skinAnalysis',
  initialState,
  reducers: {
    clearAnalysisError: (state) => {
      state.analysisError = null;
    },
    clearHistoryError: (state) => {
      state.historyError = null;
    },
    clearRecommendationError: (state, action: PayloadAction<string>) => {
      delete state.recommendationErrors[action.payload];
    },
    setSelectedIssue: (state, action: PayloadAction<SkinIssue | null>) => {
      state.selectedIssue = action.payload;
    },
    setProductFilter: (state, action: PayloadAction<'all' | 'ayurvedic' | 'non-ayurvedic'>) => {
      state.productFilter = action.payload;
    },
    cacheImage: (state, action: PayloadAction<{ analysisId: string; imageUri: string }>) => {
      state.cachedImages[action.payload.analysisId] = action.payload.imageUri;
    },
    clearImageCache: (state) => {
      state.cachedImages = {};
    },
    resetRetryCount: (state) => {
      state.retryCount = 0;
    },
    clearCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
      state.analysisError = null;
      state.selectedIssue = null;
      state.retryCount = 0;
    },
  },
  extraReducers: (builder) => {
    // Analyze Image
    builder
      .addCase(analyzeImage.pending, (state) => {
        state.isAnalyzing = true;
        state.analysisError = null;
        state.retryCount = 0;
      })
      .addCase(analyzeImage.fulfilled, (state, action: PayloadAction<SkinAnalysisResult>) => {
        state.isAnalyzing = false;
        state.currentAnalysis = action.payload;
        state.analysisError = null;
        state.retryCount = 0;
        
        // Add to history if not already present
        const existingIndex = state.analysisHistory.findIndex(
          analysis => analysis.analysisMetadata.processingTime === action.payload.analysisMetadata.processingTime
        );
        if (existingIndex === -1) {
          state.analysisHistory.unshift(action.payload);
        }
      })
      .addCase(analyzeImage.rejected, (state, action) => {
        state.isAnalyzing = false;
        const payload = action.payload as { message: string; retryable: boolean };
        state.analysisError = payload.message;
        state.retryCount += 1;
      });

    // Retry Analysis
    builder
      .addCase(retryAnalysis.pending, (state) => {
        state.isAnalyzing = true;
        state.analysisError = null;
      })
      .addCase(retryAnalysis.fulfilled, (state, action: PayloadAction<SkinAnalysisResult>) => {
        state.isAnalyzing = false;
        state.currentAnalysis = action.payload;
        state.analysisError = null;
        state.retryCount = 0;
        
        // Add to history
        state.analysisHistory.unshift(action.payload);
      })
      .addCase(retryAnalysis.rejected, (state, action) => {
        state.isAnalyzing = false;
        const payload = action.payload as { message: string; retryable: boolean };
        state.analysisError = payload.message;
        state.retryCount += 1;
      });

    // Load Analysis History
    builder
      .addCase(loadAnalysisHistory.pending, (state) => {
        state.isLoadingHistory = true;
        state.historyError = null;
      })
      .addCase(loadAnalysisHistory.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        const { history, offset } = action.payload;
        
        if (offset === 0) {
          // Replace history if loading from beginning
          state.analysisHistory = history;
        } else {
          // Append to existing history for pagination
          state.analysisHistory.push(...history);
        }
        state.historyError = null;
      })
      .addCase(loadAnalysisHistory.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.historyError = action.payload as string;
      });

    // Load Product Recommendations
    builder
      .addCase(loadProductRecommendations.pending, (state, action) => {
        const issueId = action.meta.arg;
        state.isLoadingRecommendations[issueId] = true;
        delete state.recommendationErrors[issueId];
      })
      .addCase(loadProductRecommendations.fulfilled, (state, action) => {
        const { issueId, recommendations } = action.payload;
        state.isLoadingRecommendations[issueId] = false;
        state.productRecommendations[issueId] = recommendations;
        delete state.recommendationErrors[issueId];
      })
      .addCase(loadProductRecommendations.rejected, (state, action) => {
        const payload = action.payload as { issueId: string; message: string };
        state.isLoadingRecommendations[payload.issueId] = false;
        state.recommendationErrors[payload.issueId] = payload.message;
      });

    // Delete Analysis
    builder
      .addCase(deleteAnalysis.fulfilled, (state, action: PayloadAction<string>) => {
        const analysisId = action.payload;
        state.analysisHistory = state.analysisHistory.filter(
          analysis => analysis.analysisMetadata.processingTime.toString() !== analysisId
        );
        
        // Clear from cache
        delete state.cachedImages[analysisId];
        
        // Clear current analysis if it matches
        if (state.currentAnalysis?.analysisMetadata.processingTime.toString() === analysisId) {
          state.currentAnalysis = null;
          state.selectedIssue = null;
        }
      });
  },
});

export const {
  clearAnalysisError,
  clearHistoryError,
  clearRecommendationError,
  setSelectedIssue,
  setProductFilter,
  cacheImage,
  clearImageCache,
  resetRetryCount,
  clearCurrentAnalysis,
} = skinAnalysisSlice.actions;

export default skinAnalysisSlice.reducer;