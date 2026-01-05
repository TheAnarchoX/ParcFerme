import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { useAuth, usePaddockPass, useSpoilerMode } from './useAuth';
import { 
  setupStore, 
  mockUser, 
  authenticatedState, 
  paddockPassState,
  unauthenticatedState 
} from '../test/test-utils';
import { tokenStorage } from '../lib/api';

// Helper to create wrapper with specific state
function createWrapper(preloadedState?: Parameters<typeof setupStore>[0]) {
  const store = setupStore(preloadedState);
  return function Wrapper({ children }: PropsWithChildren<object>) {
    return <Provider store={store}>{children}</Provider>;
  };
}

// Helper that returns both store and wrapper
function createWrapperWithStore(preloadedState?: Parameters<typeof setupStore>[0]) {
  const store = setupStore(preloadedState);
  const wrapper = ({ children }: PropsWithChildren<object>) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, wrapper };
}

describe('useAuth', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
  });

  describe('state selectors', () => {
    it('should return null user when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(unauthenticatedState),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return user when authenticated', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(authenticatedState),
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return correct spoiler mode', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(authenticatedState),
      });

      expect(result.current.spoilerMode).toBe('Strict');
    });

    it('should return correct membership tier', () => {
      const { result: freeResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(authenticatedState),
      });
      expect(freeResult.current.membershipTier).toBe('Free');
      expect(freeResult.current.isPaddockPass).toBe(false);

      const { result: premiumResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(paddockPassState),
      });
      expect(premiumResult.current.membershipTier).toBe('PaddockPass');
      expect(premiumResult.current.isPaddockPass).toBe(true);
    });

    it('should return loading state', () => {
      const loadingState = {
        auth: {
          user: null,
          isAuthenticated: false,
          isLoading: true,
          isInitialized: false,
          error: null,
        },
      };
      
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(loadingState),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isInitialized).toBe(false);
    });

    it('should return error state', () => {
      const errorState = {
        auth: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: 'Login failed',
        },
      };
      
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(errorState),
      });

      expect(result.current.error).toBe('Login failed');
    });
  });

  describe('actions with MSW', () => {
    it('should login successfully and update state', async () => {
      const { store, wrapper } = createWrapperWithStore(unauthenticatedState);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);

      await act(async () => {
        await result.current.login({ 
          email: 'test@parcferme.com', 
          password: 'TestP@ssw0rd!' 
        });
      });

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user?.email).toBe('test@parcferme.com');
      expect(tokenStorage.getAccessToken()).toBe('mock-access-token');
    });

    it('should register successfully and update state', async () => {
      const { wrapper } = createWrapperWithStore(unauthenticatedState);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register({ 
          email: 'newuser@parcferme.com', 
          password: 'SecureP@ss123!',
          displayName: 'New User'
        });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user?.email).toBe('newuser@parcferme.com');
      expect(result.current.user?.displayName).toBe('New User');
    });

    it('should logout and clear authentication state', async () => {
      tokenStorage.setTokens('mock-access-token', 'mock-refresh-token');
      const { store, wrapper } = createWrapperWithStore(authenticatedState);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it('should update profile successfully', async () => {
      tokenStorage.setTokens('mock-access-token', 'mock-refresh-token');
      const { store, wrapper } = createWrapperWithStore(authenticatedState);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user?.displayName).toBe('Test Driver');

      await act(async () => {
        await result.current.updateProfile({ displayName: 'Updated Driver' });
      });

      await waitFor(() => {
        expect(result.current.user?.displayName).toBe('Updated Driver');
      });
    });

    it('should set error on login failure', async () => {
      const { store, wrapper } = createWrapperWithStore(unauthenticatedState);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ 
          email: 'wrong@email.com', 
          password: 'wrongpassword' 
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear error by logging in successfully after failure', async () => {
      const errorState = {
        auth: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: 'Previous error',
        },
      };
      const { store, wrapper } = createWrapperWithStore(errorState);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.error).toBe('Previous error');

      // A successful login should clear the error
      await act(async () => {
        await result.current.login({ 
          email: 'test@parcferme.com', 
          password: 'TestP@ssw0rd!' 
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });
});

describe('usePaddockPass', () => {
  it('should return false for free tier users', () => {
    const { result } = renderHook(() => usePaddockPass(), {
      wrapper: createWrapper(authenticatedState),
    });

    expect(result.current).toBe(false);
  });

  it('should return true for PaddockPass users', () => {
    const { result } = renderHook(() => usePaddockPass(), {
      wrapper: createWrapper(paddockPassState),
    });

    expect(result.current).toBe(true);
  });

  it('should return false when not authenticated', () => {
    const { result } = renderHook(() => usePaddockPass(), {
      wrapper: createWrapper(unauthenticatedState),
    });

    expect(result.current).toBe(false);
  });
});

describe('useSpoilerMode', () => {
  it('should return Strict as default when not authenticated', () => {
    const { result } = renderHook(() => useSpoilerMode(), {
      wrapper: createWrapper(unauthenticatedState),
    });

    expect(result.current).toBe('Strict');
  });

  it('should return user spoiler mode when authenticated', () => {
    const { result } = renderHook(() => useSpoilerMode(), {
      wrapper: createWrapper(authenticatedState),
    });

    expect(result.current).toBe('Strict');
  });

  it('should return None for users with spoiler mode disabled', () => {
    const noSpoilerState = {
      auth: {
        user: { ...mockUser, spoilerMode: 'None' as const },
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      },
    };

    const { result } = renderHook(() => useSpoilerMode(), {
      wrapper: createWrapper(noSpoilerState),
    });

    expect(result.current).toBe('None');
  });
});
