import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthApi } from '../../api';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse 
} from '../../api/types';
import GlobalErrorHandler from '../../utils/errorHandler';
import SecureStorage from '../../utils/secureStorage';

// Auth state interface
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await AuthApi.login(credentials);
      
      // Store tokens securely
      await SecureStorage.storeAuthTokens(response.accessToken, response.refreshToken);
      
      return response;
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Login');
      return rejectWithValue(processedError.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await AuthApi.register(userData);
      
      // Store tokens securely
      await SecureStorage.storeAuthTokens(response.accessToken, response.refreshToken);
      
      return response;
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Register');
      return rejectWithValue(processedError.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AuthApi.logout();
      
      // Clear tokens securely
      await SecureStorage.clearAuthTokens();
      
      return null;
    } catch (error) {
      // Even if logout fails on server, clear local tokens
      await SecureStorage.clearAuthTokens();
      
      const processedError = GlobalErrorHandler.processError(error, 'Logout');
      return rejectWithValue(processedError.message);
    }
  }
);

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await AuthApi.refreshToken(refreshToken);
      
      // Update tokens securely
      await SecureStorage.storeAuthTokens(response.accessToken, response.refreshToken);
      
      return response;
    } catch (error) {
      // Clear tokens if refresh fails
      await SecureStorage.clearAuthTokens();
      
      const processedError = GlobalErrorHandler.processError(error, 'Token Refresh');
      return rejectWithValue(processedError.message);
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue }) => {
    try {
      const tokens = await SecureStorage.getAuthTokens();
      
      if (!tokens) {
        console.log('📦 No stored tokens found');
        return null;
      }
      
      console.log('📦 Loading stored auth tokens...');
      
      // Verify token and get basic user data
      const result = await AuthApi.verifyToken();
      
      if (!result.valid || !result.user) {
        console.warn('⚠️ Stored token is invalid, clearing...');
        // Clear invalid tokens
        await SecureStorage.clearAuthTokens();
        return null;
      }
      
      console.log('✅ Stored token is valid, user data:', result.user);
      
      // Try to get full user profile if UserApi is available
      let fullUser = result.user;
      try {
        const { UserApi } = await import('../../api');
        const profile = await UserApi.getProfile(result.user.id);
        fullUser = {
          ...result.user,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profileImageUrl: profile.profileImageUrl,
          createdAt: '',
          updatedAt: '',
        };
        console.log('✅ Full user profile loaded:', fullUser);
      } catch (profileError) {
        console.warn('⚠️ Could not fetch full user profile, using basic data:', profileError);
      }
      
      // Return complete auth data
      return {
        user: fullUser,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      // Clear tokens on error
      await SecureStorage.clearAuthTokens();
      
      const processedError = GlobalErrorHandler.processError(error, 'Load Stored Auth');
      return rejectWithValue(processedError.message);
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await AuthApi.forgotPassword(email);
      return email;
    } catch (error) {
      const processedError = GlobalErrorHandler.processError(error, 'Forgot Password');
      return rejectWithValue(processedError.message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        // Still clear auth state even if logout failed
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Refresh Token
    builder
      .addCase(refreshAuthToken.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });

    // Load Stored Auth
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
          console.log('✅ Auth state restored from storage:', {
            userId: action.payload.user?.id,
            email: action.payload.user?.email
          });
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;