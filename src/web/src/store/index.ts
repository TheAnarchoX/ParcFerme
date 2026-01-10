import { configureStore, Middleware } from '@reduxjs/toolkit'
import { authSlice } from './slices/authSlice'
import { spoilerSlice, setSpoilerMode } from './slices/spoilerSlice'
import { navigationSlice } from './slices/navigationSlice'

// Custom middleware to sync spoiler mode when auth state changes
const spoilerSyncMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  const result = next(action);
  
  // Sync spoiler mode when auth state updates
  const actionType = (action as { type?: string }).type;
  if (
    actionType === 'auth/login/fulfilled' ||
    actionType === 'auth/register/fulfilled' ||
    actionType === 'auth/fetchCurrentUser/fulfilled' ||
    actionType === 'auth/updateProfile/fulfilled'
  ) {
    const state = storeAPI.getState() as RootState;
    const user = state.auth.user;
    if (user?.spoilerMode) {
      storeAPI.dispatch(setSpoilerMode(user.spoilerMode));
    }
  }
  
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    spoiler: spoilerSlice.reducer,
    navigation: navigationSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(spoilerSyncMiddleware),
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
