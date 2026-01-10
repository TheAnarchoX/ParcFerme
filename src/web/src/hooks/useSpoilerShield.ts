import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  selectSpoilerMode,
  selectShouldShowSpoilers,
  selectIsSessionLogged,
  selectSpoilerLoading,
  selectSpoilerError,
  fetchSpoilerStatus,
  revealSpoilers,
  tempRevealSession,
  markSessionLogged,
  markSessionUnlogged,
  clearTempReveals,
  setSpoilerMode,
} from '../store/slices/spoilerSlice';
import type { SpoilerMode } from '../types/api';
import type { SpoilerVisibility } from '../types/spoiler';

/**
 * Hook for accessing and managing spoiler state.
 */
export function useSpoilerShield() {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector(selectSpoilerMode);
  const isLoading = useSelector(selectSpoilerLoading);
  const error = useSelector(selectSpoilerError);

  /**
   * Fetch spoiler status for a list of sessions.
   */
  const checkSpoilerStatus = useCallback(
    (sessionIds: string[]) => {
      return dispatch(fetchSpoilerStatus(sessionIds));
    },
    [dispatch]
  );

  /**
   * Reveal spoilers for a session (creates a log entry).
   */
  const reveal = useCallback(
    async (sessionId: string) => {
      const result = await dispatch(revealSpoilers(sessionId));
      if (revealSpoilers.fulfilled.match(result)) {
        dispatch(markSessionLogged(sessionId));
      }
      return result;
    },
    [dispatch]
  );

  /**
   * Temporarily reveal a session without logging it.
   */
  const tempReveal = useCallback(
    (sessionId: string) => {
      dispatch(tempRevealSession(sessionId));
    },
    [dispatch]
  );

  /**
   * Mark a session as logged (e.g., after creating a log).
   */
  const markLogged = useCallback(
    (sessionId: string) => {
      dispatch(markSessionLogged(sessionId));
    },
    [dispatch]
  );

  /**
   * Mark a session as unlogged (e.g., after deleting a log).
   */
  const markUnlogged = useCallback(
    (sessionId: string) => {
      dispatch(markSessionUnlogged(sessionId));
    },
    [dispatch]
  );

  /**
   * Clear temporary reveals.
   */
  const clearReveals = useCallback(() => {
    dispatch(clearTempReveals());
  }, [dispatch]);

  /**
   * Update spoiler mode.
   */
  const setMode = useCallback(
    (newMode: SpoilerMode) => {
      dispatch(setSpoilerMode(newMode));
    },
    [dispatch]
  );

  return {
    mode,
    isLoading,
    error,
    checkSpoilerStatus,
    reveal,
    tempReveal,
    markLogged,
    markUnlogged,
    clearReveals,
    setMode,
  };
}

/**
 * Hook to check spoiler visibility for a specific session.
 */
export function useSpoilerVisibility(sessionId: string): {
  shouldShow: boolean;
  visibility: SpoilerVisibility;
  isLogged: boolean;
} {
  const shouldShow = useSelector((state: RootState) => 
    selectShouldShowSpoilers(state, sessionId)
  );
  const isLogged = useSelector((state: RootState) => 
    selectIsSessionLogged(state, sessionId)
  );
  const mode = useSelector(selectSpoilerMode);

  const visibility: SpoilerVisibility = useMemo(() => {
    if (shouldShow) {
      return 'full';
    }
    if (mode === 'Moderate') {
      return 'partial';
    }
    return 'hidden';
  }, [shouldShow, mode]);

  return {
    shouldShow,
    visibility,
    isLogged,
  };
}

/**
 * Hook for managing spoiler reveal confirmation dialog.
 */
export function useSpoilerRevealDialog() {
  const { reveal, tempReveal, isLoading } = useSpoilerShield();

  /**
   * Handle reveal with optional confirmation.
   * @param sessionId The session to reveal
   * @param permanent If true, creates a log entry. If false, only temp reveals.
   */
  const handleReveal = useCallback(
    async (sessionId: string, permanent: boolean = true) => {
      if (permanent) {
        return reveal(sessionId);
      } else {
        tempReveal(sessionId);
        return { success: true };
      }
    },
    [reveal, tempReveal]
  );

  return {
    handleReveal,
    isLoading,
  };
}
