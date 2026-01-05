import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { tokenStorage } from '../lib/api';
import {
  login,
  register,
  logout,
  fetchCurrentUser,
  updateProfile,
  forceLogout,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsInitialized,
  selectAuthError,
  selectSpoilerMode,
  selectMembershipTier,
  selectIsPaddockPass,
} from '../store/slices/authSlice';
import type { LoginRequest, RegisterRequest, UpdateProfileRequest } from '../types/api';
import type { AppDispatch } from '../store';

/**
 * Hook for accessing auth state and actions.
 */
export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const isInitialized = useSelector(selectIsInitialized);
  const error = useSelector(selectAuthError);
  const spoilerMode = useSelector(selectSpoilerMode);
  const membershipTier = useSelector(selectMembershipTier);
  const isPaddockPass = useSelector(selectIsPaddockPass);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    spoilerMode,
    membershipTier,
    isPaddockPass,
    
    login: (credentials: LoginRequest) => dispatch(login(credentials)),
    register: (data: RegisterRequest) => dispatch(register(data)),
    logout: () => dispatch(logout()),
    updateProfile: (data: UpdateProfileRequest) => dispatch(updateProfile(data)),
  };
}

/**
 * Hook to initialize auth state on app load.
 * Checks for existing tokens and fetches user if found.
 */
export function useAuthInitializer() {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector(selectIsInitialized);

  useEffect(() => {
    if (!isInitialized && tokenStorage.hasTokens()) {
      dispatch(fetchCurrentUser());
    } else if (!isInitialized) {
      // No tokens, mark as initialized with no user
      dispatch(forceLogout());
    }
  }, [dispatch, isInitialized]);

  // Listen for forced logout events (e.g., from API interceptor)
  useEffect(() => {
    const handleLogout = () => {
      dispatch(forceLogout());
    };
    
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [dispatch]);

  return isInitialized;
}

/**
 * Hook that returns true if user has PaddockPass membership.
 * Useful for conditionally showing premium features.
 */
export function usePaddockPass(): boolean {
  return useSelector(selectIsPaddockPass);
}

/**
 * Hook to get current spoiler mode setting.
 */
export function useSpoilerMode() {
  return useSelector(selectSpoilerMode);
}
