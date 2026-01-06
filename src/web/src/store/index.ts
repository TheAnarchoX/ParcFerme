import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from './slices/authSlice'
import { spoilerSlice } from './slices/spoilerSlice'
import { navigationSlice } from './slices/navigationSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    spoiler: spoilerSlice.reducer,
    navigation: navigationSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
