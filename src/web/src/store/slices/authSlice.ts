import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type SpoilerMode = 'strict' | 'moderate' | 'none'

interface User {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
  spoilerMode: SpoilerMode
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setSpoilerMode: (state, action: PayloadAction<SpoilerMode>) => {
      if (state.user) {
        state.user.spoilerMode = action.payload
      }
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.error = null
    },
  },
})

export const { setUser, setToken, setLoading, setError, setSpoilerMode, logout } = authSlice.actions
