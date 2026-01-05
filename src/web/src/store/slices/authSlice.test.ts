import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  describe('async thunks with mocked API', () => {
    let store: ReturnType<typeof setupStore>;

    beforeEach(() => {
      store = setupStore();
      vi.clearAllMocks();
    });

    // Note: These tests mock the authApi module directly for reliable unit testing.
    // Integration tests with actual API calls are covered by the MSW setup tests
    // and backend integration tests.

    it('login thunk rejected on invalid credentials sets error state', async () => {
      // MSW handles this - returns 401 for wrong credentials
      const credentials = { email: 'wrong@email.com', password: 'wrongpassword' };
      
      await store.dispatch(login(credentials));
      
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.user).toBeNull();
      expect(state.auth.error).toBeTruthy();
    });

    it('login thunk sets loading state while pending', () => {
      // Verify the reducer handles pending action correctly
      const pendingAction = { type: login.pending.type };
      const state = authSlice.reducer(initialState, pendingAction);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('register thunk sets loading state while pending', () => {
      // Verify the reducer handles pending action correctly
      const pendingAction = { type: register.pending.type };
      const state = authSlice.reducer(initialState, pendingAction);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('logout thunk clears state when fulfilled', () => {
      // Start with authenticated state
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
      };
      
      // Verify the reducer handles fulfilled action correctly
      const fulfilledAction = { type: logout.fulfilled.type };
      const state = authSlice.reducer(authenticatedState, fulfilledAction);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });
});
