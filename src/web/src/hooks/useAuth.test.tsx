import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { useAuth, usePaddockPass, useSpoilerMode } from './useAuth';
import { 
  setupStore, 
  mockUser, 
  mockPaddockPassUser,
  authenticatedState, 
  paddockPassState,
  unauthenticatedState 
} from '../test/test-utils';

// Helper to create wrapper with specific state
function createWrapper(preloadedState?: Parameters<typeof setupStore>[0]) {
  const store = setupStore(preloadedState);
  return function Wrapper({ children }: PropsWithChildren<object>) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useAuth', () => {
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

  describe('actions', () => {
    // Note: Action dispatch tests verify that the hook provides the expected action creators.
    // The actual async behavior of the actions is tested in authSlice.test.ts.
    // These tests verify the hook interface without relying on MSW which has 
    // compatibility issues with axios in the test environment.

    it('should provide login action function', () => {
      const store = setupStore(unauthenticatedState);
      const wrapper = ({ children }: PropsWithChildren<object>) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.login).toBe('function');
    });

    it('should provide register action function', () => {
      const store = setupStore(unauthenticatedState);
      const wrapper = ({ children }: PropsWithChildren<object>) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.register).toBe('function');
    });

    it('should provide logout action function', () => {
      const store = setupStore(authenticatedState);
      const wrapper = ({ children }: PropsWithChildren<object>) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.logout).toBe('function');
    });

    it('should provide updateProfile action function', () => {
      const store = setupStore(authenticatedState);
      const wrapper = ({ children }: PropsWithChildren<object>) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.updateProfile).toBe('function');
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
