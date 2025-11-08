import { configureStore } from '@reduxjs/toolkit';
import skinAnalysisReducer, {
  analyzeImage,
  retryAnalysis,
  loadAnalysisHistory,
  loadProductRecommendations,
  deleteAnalysis,
  clearAnalysisError,
  clearHistoryError,
  clearRecommendationError,
  setSelectedIssue,
  setProductFilter,
  cacheImage,
  clearImageCache,
  resetRetryCount,
  clearCurrentAnalysis,
  SkinAnalysisState,
} from '../../store/slices/skinAnalysisSlice';
import { SkinAnalysisApi } from '../../api';
import { SkinAnalysisResult, SkinIssue, ProductRecommendations } from '../../api/types';

// Mock the API
jest.mock('../../api', () => ({
  SkinAnalysisApi: {
    analyzeImage: jest.fn(),
    getAnalysisHistory: jest.fn(),
    getProductRecommendations: jest.fn(),
    deleteAnalysis: jest.fn(),
  },
}));

// Mock GlobalErrorHandler
jest.mock('../../utils/errorHandler', () => ({
  __esModule: true,
  default: {
    processError: jest.fn((error, context) => ({
      message: error.message || 'Test error',
      retryable: true,
    })),
  },
}));

const mockSkinAnalysisApi = SkinAnalysisApi as jest.Mocked<typeof SkinAnalysisApi>;

const getDefaultState = (): SkinAnalysisState =>
  skinAnalysisReducer(undefined, { type: '@@INIT' }) as SkinAnalysisState;

const createStore = (preloadedState?: Partial<SkinAnalysisState>) =>
  configureStore({
    reducer: { skinAnalysis: skinAnalysisReducer },
    preloadedState: preloadedState
      ? { skinAnalysis: { ...getDefaultState(), ...preloadedState } }
      : undefined,
  });

type AppStore = ReturnType<typeof createStore>;

describe('skinAnalysisSlice', () => {
  let store: AppStore;

  const mockAnalysisResult: SkinAnalysisResult = {
    skinType: 'Combination',
    issues: [
      {
        id: 'issue-1',
        name: 'Acne',
        description: 'Mild acne detected',
        severity: 'medium',
        causes: ['Hormonal changes', 'Poor diet'],
        highlightedImageUrl: 'https://example.com/highlighted.jpg',
        confidence: 0.85,
      },
    ],
    analysisMetadata: {
      modelVersion: 'v1.0',
      processingTime: 2500,
      imageQuality: 0.9,
    },
  };

  const mockProductRecommendations: ProductRecommendations = {
    issueId: 'issue-1',
    products: [
      {
        id: 'product-1',
        name: 'Acne Treatment Gel',
        brand: 'SkinCare Pro',
        price: 29.99,
        rating: 4.5,
        imageUrl: 'https://example.com/product.jpg',
        isAyurvedic: false,
        ingredients: ['Salicylic Acid', 'Benzoyl Peroxide'],
      },
    ],
    ayurvedicProducts: [
      {
        id: 'ayur-1',
        name: 'Neem Face Pack',
        brand: 'Ayur Natural',
        price: 19.99,
        rating: 4.2,
        imageUrl: 'https://example.com/ayur.jpg',
        isAyurvedic: true,
        ingredients: ['Neem', 'Turmeric'],
      },
    ],
  };

  beforeEach(() => {
    store = createStore();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().skinAnalysis;
      expect(state).toEqual({
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
      });
    });
  });

  describe('synchronous actions', () => {
    it('should clear analysis error', () => {
      // Set an error first
      store.dispatch({ type: 'skinAnalysis/analyzeImage/rejected', payload: { message: 'Test error' } });
      
      store.dispatch(clearAnalysisError());
      
      const state = store.getState().skinAnalysis;
      expect(state.analysisError).toBeNull();
    });

    it('should set selected issue', () => {
      const issue: SkinIssue = mockAnalysisResult.issues[0];
      
      store.dispatch(setSelectedIssue(issue));
      
      const state = store.getState().skinAnalysis;
      expect(state.selectedIssue).toEqual(issue);
    });

    it('should set product filter', () => {
      store.dispatch(setProductFilter('ayurvedic'));
      
      const state = store.getState().skinAnalysis;
      expect(state.productFilter).toBe('ayurvedic');
    });

    it('should cache image', () => {
      const cacheData = { analysisId: 'analysis-1', imageUri: 'file://image.jpg' };
      
      store.dispatch(cacheImage(cacheData));
      
      const state = store.getState().skinAnalysis;
      expect(state.cachedImages['analysis-1']).toBe('file://image.jpg');
    });

    it('should clear image cache', () => {
      // Add some cached images first
      store.dispatch(cacheImage({ analysisId: 'analysis-1', imageUri: 'file://image1.jpg' }));
      store.dispatch(cacheImage({ analysisId: 'analysis-2', imageUri: 'file://image2.jpg' }));
      
      store.dispatch(clearImageCache());
      
      const state = store.getState().skinAnalysis;
      expect(state.cachedImages).toEqual({});
    });

    it('should reset retry count', () => {
      // Simulate failed attempts to increase retry count
      store.dispatch({ type: 'skinAnalysis/analyzeImage/rejected', payload: { message: 'Error' } });
      
      store.dispatch(resetRetryCount());
      
      const state = store.getState().skinAnalysis;
      expect(state.retryCount).toBe(0);
    });

    it('should clear current analysis', () => {
      // Set some analysis data first
      store.dispatch({ type: 'skinAnalysis/analyzeImage/fulfilled', payload: mockAnalysisResult });
      store.dispatch(setSelectedIssue(mockAnalysisResult.issues[0]));
      
      store.dispatch(clearCurrentAnalysis());
      
      const state = store.getState().skinAnalysis;
      expect(state.currentAnalysis).toBeNull();
      expect(state.analysisError).toBeNull();
      expect(state.selectedIssue).toBeNull();
      expect(state.retryCount).toBe(0);
    });
  });

  describe('analyzeImage async thunk', () => {
    it('should handle successful image analysis', async () => {
      mockSkinAnalysisApi.analyzeImage.mockResolvedValue(mockAnalysisResult);
      const formData = new FormData();
      
      await store.dispatch(analyzeImage(formData));
      
      const state = store.getState().skinAnalysis;
      expect(state.isAnalyzing).toBe(false);
      expect(state.currentAnalysis).toEqual(mockAnalysisResult);
      expect(state.analysisError).toBeNull();
      expect(state.retryCount).toBe(0);
      expect(state.analysisHistory).toContain(mockAnalysisResult);
    });

    it('should handle failed image analysis', async () => {
      const error = new Error('Analysis failed');
      mockSkinAnalysisApi.analyzeImage.mockRejectedValue(error);
      const formData = new FormData();
      
      await store.dispatch(analyzeImage(formData));
      
      const state = store.getState().skinAnalysis;
      expect(state.isAnalyzing).toBe(false);
      expect(state.currentAnalysis).toBeNull();
      expect(state.analysisError).toBe('Test error');
      expect(state.retryCount).toBe(1);
    });

    it('should set loading state during analysis', () => {
      mockSkinAnalysisApi.analyzeImage.mockImplementation(() => new Promise(() => {})); // Never resolves
      const formData = new FormData();
      
      store.dispatch(analyzeImage(formData));
      
      const state = store.getState().skinAnalysis;
      expect(state.isAnalyzing).toBe(true);
      expect(state.analysisError).toBeNull();
      expect(state.retryCount).toBe(0);
    });
  });

  describe('retryAnalysis async thunk', () => {
    it('should handle successful retry', async () => {
      // Set retry count to 1 first
      store.dispatch({ type: 'skinAnalysis/analyzeImage/rejected', payload: { message: 'Error' } });
      
      mockSkinAnalysisApi.analyzeImage.mockResolvedValue(mockAnalysisResult);
      const formData = new FormData();
      
      await store.dispatch(retryAnalysis(formData));
      
      const state = store.getState().skinAnalysis;
      expect(state.isAnalyzing).toBe(false);
      expect(state.currentAnalysis).toEqual(mockAnalysisResult);
      expect(state.analysisError).toBeNull();
      expect(state.retryCount).toBe(0);
    });

    it('should reject when max retries reached', async () => {
      // Set retry count to max
      const initialState: Partial<SkinAnalysisState> = { retryCount: 3, maxRetries: 3 };
      store = createStore(initialState);
      
      const formData = new FormData();
      const result = await store.dispatch(retryAnalysis(formData));
      
      expect(result.type).toBe('skinAnalysis/retryAnalysis/rejected');
    });
  });

  describe('loadAnalysisHistory async thunk', () => {
    it('should load analysis history successfully', async () => {
      const mockHistory = [mockAnalysisResult];
      mockSkinAnalysisApi.getAnalysisHistory.mockResolvedValue(mockHistory);
      
      await store.dispatch(loadAnalysisHistory({ limit: 10, offset: 0 }));
      
      const state = store.getState().skinAnalysis;
      expect(state.isLoadingHistory).toBe(false);
      expect(state.analysisHistory).toEqual(mockHistory);
      expect(state.historyError).toBeNull();
    });

    it('should handle history loading error', async () => {
      const error = new Error('Failed to load history');
      mockSkinAnalysisApi.getAnalysisHistory.mockRejectedValue(error);
      
      await store.dispatch(loadAnalysisHistory({ limit: 10, offset: 0 }));
      
      const state = store.getState().skinAnalysis;
      expect(state.isLoadingHistory).toBe(false);
      expect(state.historyError).toBe('Test error');
    });

    it('should append to existing history when offset > 0', async () => {
      const existingHistory = [mockAnalysisResult];
      const newHistory = [{ ...mockAnalysisResult, skinType: 'Oily' }];
      
      // Set existing history
      store = createStore({ analysisHistory: existingHistory });
      
      mockSkinAnalysisApi.getAnalysisHistory.mockResolvedValue(newHistory);
      
      await store.dispatch(loadAnalysisHistory({ limit: 10, offset: 1 }));
      
      const state = store.getState().skinAnalysis;
      expect(state.analysisHistory).toHaveLength(2);
      expect(state.analysisHistory).toEqual([...existingHistory, ...newHistory]);
    });
  });

  describe('loadProductRecommendations async thunk', () => {
    it('should load product recommendations successfully', async () => {
      mockSkinAnalysisApi.getProductRecommendations.mockResolvedValue(mockProductRecommendations);
      
      await store.dispatch(loadProductRecommendations('issue-1'));
      
      const state = store.getState().skinAnalysis;
      expect(state.isLoadingRecommendations['issue-1']).toBe(false);
      expect(state.productRecommendations['issue-1']).toEqual(mockProductRecommendations);
      expect(state.recommendationErrors['issue-1']).toBeUndefined();
    });

    it('should handle recommendation loading error', async () => {
      const error = new Error('Failed to load recommendations');
      mockSkinAnalysisApi.getProductRecommendations.mockRejectedValue(error);
      
      await store.dispatch(loadProductRecommendations('issue-1'));
      
      const state = store.getState().skinAnalysis;
      expect(state.isLoadingRecommendations['issue-1']).toBe(false);
      expect(state.recommendationErrors['issue-1']).toBe('Test error');
    });
  });

  describe('deleteAnalysis async thunk', () => {
    it('should delete analysis successfully', async () => {
      // Set up initial state with analysis in history
      store = createStore({
        analysisHistory: [mockAnalysisResult],
        currentAnalysis: mockAnalysisResult,
      });
      
      mockSkinAnalysisApi.deleteAnalysis.mockResolvedValue();
      const analysisId = mockAnalysisResult.analysisMetadata.processingTime.toString();
      
      await store.dispatch(deleteAnalysis(analysisId));
      
      const state = store.getState().skinAnalysis;
      expect(state.analysisHistory).toHaveLength(0);
      expect(state.currentAnalysis).toBeNull();
    });
  });
});