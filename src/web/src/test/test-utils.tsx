import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import type { User } from '../types/api';

// Define the root state type
export interface RootState {
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
  };
}

const rootReducer = combineReducers({
  auth: authReducer,
});

export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
}

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];

// Render function with all providers
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState,
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<object>): React.JSX.Element {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Mock user data for tests
export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@parcferme.com',
  displayName: 'Test Driver',
  spoilerMode: 'Strict',
  membershipTier: 'Free',
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockPaddockPassUser: User = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'premium@parcferme.com',
  displayName: 'Premium Driver',
  membershipTier: 'PaddockPass',
  membershipExpiresAt: '2027-01-01T00:00:00Z',
};

// Pre-configured states for common test scenarios
export const authenticatedState: Partial<RootState> = {
  auth: {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    error: null,
  },
};

export const paddockPassState: Partial<RootState> = {
  auth: {
    user: mockPaddockPassUser,
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    error: null,
  },
};

export const unauthenticatedState: Partial<RootState> = {
  auth: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    error: null,
  },
};

export const loadingState: Partial<RootState> = {
  auth: {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
    error: null,
  },
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
