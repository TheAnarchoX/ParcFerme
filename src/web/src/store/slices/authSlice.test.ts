import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { mockAuthResponse } from '../../test/mocks/handlers';
import authReducer, {
  authSlice,
  login,
  register,
  logout,
  fetchCurrentUser,
  updateProfile,
  setError,
  clearError,
  forceLogout,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsInitialized,
  selectAuthError,
  selectSpoilerMode,
  selectMembershipTier,
  selectIsPaddockPass,
} from './authSlice';
import { mockUser, mockPaddockPassUser, setupStore } from '../../test/test-utils';
import { tokenStorage } from '../../lib/api';
import type { User } from '../../types/api';

// Initial state for reducer tests
const initialState = {
  user: null as User | null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null as string | null,
};

describe('authSlice', () => {
  describe('reducer', () => {
    describe('synchronous actions', () => {
      it('should return initial state', () => {
        const result = authReducer(undefined, { type: 'unknown' });
        expect(result).toEqual(initialState);
      });

      it('should handle setError', () => {
        const error = 'Something went wrong';
        const result = authReducer(initialState, setError(error));
        expect(result.error).toBe(error);
      });

      it('should handle clearError', () => {
        const stateWithError = { ...initialState, error: 'An error' };
        const result = authReducer(stateWithError, clearError());
        expect(result.error).toBeNull();
      });

      it('should handle forceLogout', () => {
        const authenticatedState = {
          ...initialState,
          user: mockUser,
          isAuthenticated: true,
          error: 'Some error',
        };
        const result = authReducer(authenticatedState, forceLogout());
        expect(result.user).toBeNull();
        expect(result.isAuthenticated).toBe(false);
        expect(result.error).toBeNull();
      });
    });

    describe('login action', () => {
      it('should set loading state when pending', () => {
        const result = authReducer(initialState, login.pending('requestId', { email: '', password: '' }));
        expect(result.isLoading).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should set user and authenticated when fulfilled', () => {
        const result = authReducer(
          { ...initialState, isLoading: true },
          login.fulfilled(mockUser, 'requestId', { email: '', password: '' })
        );
        expect(result.isLoading).toBe(false);
        expect(result.user).toEqual(mockUser);
        expect(result.isAuthenticated).toBe(true);
      });

      it('should set error when rejected', () => {
        const error = 'Invalid credentials';
        const result = authReducer(
          { ...initialState, isLoading: true },
          login.rejected(null, 'requestId', { email: '', password: '' }, error)
        );
        expect(result.isLoading).toBe(false);
        expect(result.error).toBe(error);
      });
    });

    describe('register action', () => {
      it('should set loading state when pending', () => {
        const result = authReducer(
          initialState, 
          register.pending('requestId', { email: '', password: '', displayName: '' })
        );
        expect(result.isLoading).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should set user and authenticated when fulfilled', () => {
        const result = authReducer(
          { ...initialState, isLoading: true },
          register.fulfilled(mockUser, 'requestId', { email: '', password: '', displayName: '' })
        );
        expect(result.isLoading).toBe(false);
        expect(result.user).toEqual(mockUser);
        expect(result.isAuthenticated).toBe(true);
      });

      it('should set error when rejected', () => {
        const error = 'Email already exists';
        const result = authReducer(
          { ...initialState, isLoading: true },
          register.rejected(null, 'requestId', { email: '', password: '', displayName: '' }, error)
        );
        expect(result.isLoading).toBe(false);
        expect(result.error).toBe(error);
      });
    });

    describe('logout action', () => {
      it('should clear user and authentication on fulfilled', () => {
        const authenticatedState = {
          ...initialState,
          user: mockUser,
          isAuthenticated: true,
        };
        const result = authReducer(authenticatedState, logout.fulfilled(undefined, 'requestId'));
        expect(result.user).toBeNull();
        expect(result.isAuthenticated).toBe(false);
        expect(result.error).toBeNull();
      });
    });

    describe('fetchCurrentUser action', () => {
      it('should set loading when pending', () => {
        const result = authReducer(initialState, fetchCurrentUser.pending('requestId'));
        expect(result.isLoading).toBe(true);
      });

      it('should set user, authenticated and initialized when fulfilled', () => {
        const result = authReducer(
          { ...initialState, isLoading: true },
          fetchCurrentUser.fulfilled(mockUser, 'requestId')
        );
        expect(result.isLoading).toBe(false);
        expect(result.isInitialized).toBe(true);
        expect(result.user).toEqual(mockUser);
        expect(result.isAuthenticated).toBe(true);
      });

      it('should clear user and set initialized when rejected', () => {
        const result = authReducer(
          { ...initialState, isLoading: true, user: mockUser },
          fetchCurrentUser.rejected(null, 'requestId')
        );
        expect(result.isLoading).toBe(false);
        expect(result.isInitialized).toBe(true);
        expect(result.user).toBeNull();
        expect(result.isAuthenticated).toBe(false);
      });
    });

    describe('updateProfile action', () => {
      it('should update user when fulfilled', () => {
        const authenticatedState = {
          ...initialState,
          user: mockUser,
          isAuthenticated: true,
        };
        const updatedUser = { ...mockUser, displayName: 'Updated Name' };
        const result = authReducer(
          authenticatedState,
          updateProfile.fulfilled(updatedUser, 'requestId', { displayName: 'Updated Name' })
        );
        expect(result.user?.displayName).toBe('Updated Name');
      });
    });
  });

  describe('selectors', () => {
    it('selectUser should return user from state', () => {
      const state = { auth: { ...initialState, user: mockUser } };
      expect(selectUser(state)).toEqual(mockUser);
    });

    it('selectUser should return null when no user', () => {
      const state = { auth: initialState };
      expect(selectUser(state)).toBeNull();
    });

    it('selectIsAuthenticated should return authentication status', () => {
      expect(selectIsAuthenticated({ auth: initialState })).toBe(false);
      expect(selectIsAuthenticated({ auth: { ...initialState, isAuthenticated: true } })).toBe(true);
    });

    it('selectIsLoading should return loading status', () => {
      expect(selectIsLoading({ auth: initialState })).toBe(false);
      expect(selectIsLoading({ auth: { ...initialState, isLoading: true } })).toBe(true);
    });

    it('selectIsInitialized should return initialized status', () => {
      expect(selectIsInitialized({ auth: initialState })).toBe(false);
      expect(selectIsInitialized({ auth: { ...initialState, isInitialized: true } })).toBe(true);
    });

    it('selectAuthError should return error from state', () => {
      const error = 'Test error';
      expect(selectAuthError({ auth: initialState })).toBeNull();
      expect(selectAuthError({ auth: { ...initialState, error } })).toBe(error);
    });

    it('selectSpoilerMode should return user spoiler mode or default Strict', () => {
      // No user - should return Strict default
      expect(selectSpoilerMode({ auth: initialState })).toBe('Strict');
      
      // User with None spoiler mode
      const userWithNone = { ...mockUser, spoilerMode: 'None' as const };
      expect(selectSpoilerMode({ auth: { ...initialState, user: userWithNone } })).toBe('None');
    });

    it('selectMembershipTier should return user tier or default Free', () => {
      // No user - should return Free default
      expect(selectMembershipTier({ auth: initialState })).toBe('Free');
      
      // PaddockPass user
      expect(selectMembershipTier({ auth: { ...initialState, user: mockPaddockPassUser } })).toBe('PaddockPass');
    });

    it('selectIsPaddockPass should return true for PaddockPass users', () => {
      expect(selectIsPaddockPass({ auth: initialState })).toBe(false);
      expect(selectIsPaddockPass({ auth: { ...initialState, user: mockUser } })).toBe(false);
      expect(selectIsPaddockPass({ auth: { ...initialState, user: mockPaddockPassUser } })).toBe(true);
    });
  });

  describe('async thunks with MSW', () => {
    let store: ReturnType<typeof setupStore>;

    beforeEach(() => {
      store = setupStore();
      vi.clearAllMocks();
      // Clear localStorage tokens before each test
      tokenStorage.clearTokens();
    });

    describe('login thunk', () => {
      it('should authenticate user with valid credentials', async () => {
        const credentials = { email: 'test@parcferme.com', password: 'TestP@ssw0rd!' };
        
        await store.dispatch(login(credentials));
        
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user).toBeDefined();
        expect(state.auth.user?.email).toBe('test@parcferme.com');
        expect(state.auth.error).toBeNull();
        expect(tokenStorage.getAccessToken()).toBe('mock-access-token');
        expect(tokenStorage.getRefreshToken()).toBe('mock-refresh-token');
      });

      it('should reject with invalid credentials', async () => {
        const credentials = { email: 'wrong@email.com', password: 'wrongpassword' };
        
        await store.dispatch(login(credentials));
        
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(state.auth.error).toBeTruthy();
      });

      it('should set loading state while pending', async () => {
        // Use runtime handler to delay response
        server.use(
          http.post('http://localhost/api/v1/auth/login', async () => {
            // Small delay to allow us to check pending state
            await new Promise(resolve => setTimeout(resolve, 10));
            return HttpResponse.json(mockAuthResponse);
          })
        );

        const credentials = { email: 'test@parcferme.com', password: 'TestP@ssw0rd!' };
        const promise = store.dispatch(login(credentials));
        
        // Check loading state immediately
        expect(store.getState().auth.isLoading).toBe(true);
        
        await promise;
        expect(store.getState().auth.isLoading).toBe(false);
      });
    });

    describe('register thunk', () => {
      it('should register new user successfully', async () => {
        const userData = { 
          email: 'newuser@parcferme.com', 
          password: 'SecureP@ss123!',
          displayName: 'New User'
        };
        
        await store.dispatch(register(userData));
        
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user).toBeDefined();
        expect(state.auth.user?.email).toBe('newuser@parcferme.com');
        expect(state.auth.user?.displayName).toBe('New User');
        expect(state.auth.error).toBeNull();
        expect(tokenStorage.getAccessToken()).toBe('mock-access-token');
      });

      it('should reject when email already exists', async () => {
        const userData = { 
          email: 'existing@parcferme.com', 
          password: 'SecureP@ss123!',
          displayName: 'Existing User'
        };
        
        await store.dispatch(register(userData));
        
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(state.auth.error).toBeTruthy();
      });

      it('should set loading state while pending', async () => {
        server.use(
          http.post('http://localhost/api/v1/auth/register', async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return HttpResponse.json(mockAuthResponse, { status: 201 });
          })
        );

        const userData = { 
          email: 'newuser@parcferme.com', 
          password: 'SecureP@ss123!',
          displayName: 'New User'
        };
        const promise = store.dispatch(register(userData));
        
        expect(store.getState().auth.isLoading).toBe(true);
        
        await promise;
        expect(store.getState().auth.isLoading).toBe(false);
      });
    });

    describe('logout thunk', () => {
      it('should clear authentication state', async () => {
        // Start with authenticated state
        tokenStorage.setTokens('mock-access-token', 'mock-refresh-token');
        store = setupStore({
          auth: {
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          }
        });
        
        await store.dispatch(logout());
        
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(tokenStorage.getAccessToken()).toBeNull();
        expect(tokenStorage.getRefreshToken()).toBeNull();
      });
    });

    describe('fetchCurrentUser thunk', () => {
      it('should fetch current user when authenticated', async () => {
        tokenStorage.setTokens('mock-access-token', 'mock-refresh-token');
        
        await store.dispatch(fetchCurrentUser());
        
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user?.email).toBe('test@parcferme.com');
        expect(state.auth.isInitialized).toBe(true);
      });

      it('should return PaddockPass user when premium token', async () => {
        tokenStorage.setTokens('mock-premium-access-token', 'mock-refresh-token');
        
        await store.dispatch(fetchCurrentUser());
        
        const state = store.getState();
        expect(state.auth.user?.membershipTier).toBe('PaddockPass');
      });
    });

    describe('updateProfile thunk', () => {
      it('should update user profile', async () => {
        tokenStorage.setTokens('mock-access-token', 'mock-refresh-token');
        store = setupStore({
          auth: {
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          }
        });
        
        const updates = { displayName: 'Updated Name' };
        await store.dispatch(updateProfile(updates));
        
        const state = store.getState();
        expect(state.auth.user?.displayName).toBe('Updated Name');
      });
    });
  });
});
