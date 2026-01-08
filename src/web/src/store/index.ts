import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from './slices/authSlice'
import { spoilerSlice, setSpoilerMode } from './slices/spoilerSlice'
import { navigationSlice } from './slices/navigationSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    spoiler: spoilerSlice.reducer,
    navigation: navigationSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat((storeAPI) => (next) => (action) => {
      const result = next(action);
      
      // Sync spoiler mode when auth state updates
      if (
        action.type === 'auth/login/fulfilled' ||
        action.type === 'auth/register/fulfilled' ||
        action.type === 'auth/fetchCurrentUser/fulfilled' ||
        action.type === 'auth/updateProfile/fulfilled'
      ) {
        const state = storeAPI.getState();
        const user = state.auth.user;
        if (user?.spoilerMode) {
          storeAPI.dispatch(setSpoilerMode(user.spoilerMode));
        }
      }
      
      return result;
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
