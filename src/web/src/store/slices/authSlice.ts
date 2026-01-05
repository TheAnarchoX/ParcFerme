import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, SpoilerMode, MembershipTier, LoginRequest, RegisterRequest, UpdateProfileRequest } from '../../types/api';
import { authApi } from '../../services/authService';
import { tokenStorage } from '../../lib/api';

// =========================
// State Interface
// =========================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// =========================
// Async Thunks
// =========================

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      return response.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      return response.user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return rejectWithValue(message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await authApi.logout();
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authApi.getCurrentUser();
      return user;
    } catch (error) {
      tokenStorage.clearTokens();
      const message = error instanceof Error ? error.message : 'Failed to fetch user';
      return rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const user = await authApi.updateProfile(data);
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

// =========================
// Slice
// =========================

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Called when token refresh fails or user needs to be logged out
    forceLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Fetch Current User
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = null;
        state.isAuthenticated = false;
      });

    // Update Profile
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { setError, clearError, forceLogout } = authSlice.actions;

// =========================
// Selectors
// =========================

export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectSpoilerMode = (state: { auth: AuthState }): SpoilerMode => 
  state.auth.user?.spoilerMode ?? 'Strict';
export const selectMembershipTier = (state: { auth: AuthState }): MembershipTier => 
  state.auth.user?.membershipTier ?? 'Free';
export const selectIsPaddockPass = (state: { auth: AuthState }): boolean => 
  state.auth.user?.membershipTier === 'PaddockPass';

export default authSlice.reducer;
