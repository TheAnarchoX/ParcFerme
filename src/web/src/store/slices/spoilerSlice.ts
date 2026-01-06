import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { SpoilerMode } from '../../types/api';
import { spoilerApi } from '../../services/spoilerService';
import type { RootState } from '../index';

// =========================
// State Interface
// =========================

interface SpoilerSliceState {
  /**
   * User's global spoiler mode preference.
   */
  mode: SpoilerMode;
  
  /**
   * Session IDs that the user has logged (always revealed).
   */
  loggedSessionIds: string[];
  
  /**
   * Session IDs explicitly revealed in this browser session (not persisted).
   */
  tempRevealedIds: string[];
  
  /**
   * Loading state for async operations.
   */
  isLoading: boolean;
  
  /**
   * Error message if any.
   */
  error: string | null;
}

const initialState: SpoilerSliceState = {
  mode: 'Strict',
  loggedSessionIds: [],
  tempRevealedIds: [],
  isLoading: false,
  error: null,
};

// =========================
// Async Thunks
// =========================

/**
 * Fetch spoiler status for a list of sessions.
 */
export const fetchSpoilerStatus = createAsyncThunk(
  'spoiler/fetchStatus',
  async (sessionIds: string[], { rejectWithValue }) => {
    try {
      return await spoilerApi.getSpoilerStatus(sessionIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch spoiler status';
      return rejectWithValue(message);
    }
  }
);

/**
 * Reveal spoilers for a session (creates a log entry).
 */
export const revealSpoilers = createAsyncThunk(
  'spoiler/reveal',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      return await spoilerApi.revealSpoilers(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reveal spoilers';
      return rejectWithValue(message);
    }
  }
);

// =========================
// Slice
// =========================

export const spoilerSlice = createSlice({
  name: 'spoiler',
  initialState,
  reducers: {
    /**
     * Set the user's spoiler mode (from auth state).
     */
    setSpoilerMode: (state, action: PayloadAction<SpoilerMode>) => {
      state.mode = action.payload;
    },
    
    /**
     * Temporarily reveal a session (without logging it).
     * This is reset on page refresh.
     */
    tempRevealSession: (state, action: PayloadAction<string>) => {
      if (!state.tempRevealedIds.includes(action.payload)) {
        state.tempRevealedIds.push(action.payload);
      }
    },
    
    /**
     * Add a session to the logged list (e.g., after creating a log).
     */
    markSessionLogged: (state, action: PayloadAction<string>) => {
      if (!state.loggedSessionIds.includes(action.payload)) {
        state.loggedSessionIds.push(action.payload);
      }
      // Also remove from temp revealed if present
      state.tempRevealedIds = state.tempRevealedIds.filter(id => id !== action.payload);
    },
    
    /**
     * Clear all temp reveals (e.g., on logout).
     */
    clearTempReveals: (state) => {
      state.tempRevealedIds = [];
    },
    
    /**
     * Reset spoiler state (e.g., on logout).
     */
    resetSpoilerState: () => initialState,
    
    /**
     * Clear error.
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch spoiler status
    builder
      .addCase(fetchSpoilerStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSpoilerStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.mode = action.payload.spoilerMode as SpoilerMode;
        // Merge logged IDs (don't replace, in case we're fetching for different sessions)
        const newIds = action.payload.loggedSessionIds.filter(
          id => !state.loggedSessionIds.includes(id)
        );
        state.loggedSessionIds.push(...newIds);
      })
      .addCase(fetchSpoilerStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Reveal spoilers
    builder
      .addCase(revealSpoilers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(revealSpoilers.fulfilled, (state) => {
        state.isLoading = false;
        // The reveal creates a log, so add to logged list
        // We need the sessionId from the request, stored in meta
        // For now, handled by the component calling markSessionLogged
      })
      .addCase(revealSpoilers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// =========================
// Actions
// =========================

export const {
  setSpoilerMode,
  tempRevealSession,
  markSessionLogged,
  clearTempReveals,
  resetSpoilerState,
  clearError,
} = spoilerSlice.actions;

// =========================
// Selectors
// =========================

/**
 * Get the current spoiler mode.
 */
export const selectSpoilerMode = (state: RootState) => state.spoiler.mode;

/**
 * Check if spoilers should be shown for a session.
 */
export const selectShouldShowSpoilers = (state: RootState, sessionId: string): boolean => {
  const { mode, loggedSessionIds, tempRevealedIds } = state.spoiler;
  
  // SpoilerMode.None shows everything
  if (mode === 'None') {
    return true;
  }
  
  // Logged sessions are always revealed
  if (loggedSessionIds.includes(sessionId)) {
    return true;
  }
  
  // Temporarily revealed in this session
  if (tempRevealedIds.includes(sessionId)) {
    return true;
  }
  
  return false;
};

/**
 * Check if a session is logged.
 */
export const selectIsSessionLogged = (state: RootState, sessionId: string): boolean => {
  return state.spoiler.loggedSessionIds.includes(sessionId);
};

/**
 * Get loading state.
 */
export const selectSpoilerLoading = (state: RootState) => state.spoiler.isLoading;

/**
 * Get error state.
 */
export const selectSpoilerError = (state: RootState) => state.spoiler.error;

export default spoilerSlice.reducer;
