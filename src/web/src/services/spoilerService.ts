import { apiClient } from '../lib/api';
import type { 
  SessionDetailDto,
  SessionSummaryDto,
  SpoilerStatusResponse,
  RevealSpoilersResponse,
} from '../types/spoiler';

/**
 * Spoiler Shield API service.
 * Handles spoiler-protected session data and reveal operations.
 */
export const spoilerApi = {
  /**
   * Get a session by ID with spoiler-protected results.
   */
  getSession: (id: string): Promise<SessionDetailDto> =>
    apiClient.get<SessionDetailDto>(`/sessions/${id}`),

  /**
   * Get sessions for a round (race weekend).
   */
  getSessionsByRound: (roundId: string): Promise<SessionSummaryDto[]> =>
    apiClient.get<SessionSummaryDto[]>(`/sessions/by-round/${roundId}`),

  /**
   * Get sessions for a season.
   */
  getSessionsBySeason: (seasonId: string, type?: string): Promise<SessionSummaryDto[]> => {
    const params = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiClient.get<SessionSummaryDto[]>(`/sessions/by-season/${seasonId}${params}`);
  },

  /**
   * Get recent sessions (last N days).
   */
  getRecentSessions: (days: number = 7, type?: string): Promise<SessionSummaryDto[]> => {
    const params = new URLSearchParams({ days: days.toString() });
    if (type) params.append('type', type);
    return apiClient.get<SessionSummaryDto[]>(`/sessions/recent?${params}`);
  },

  /**
   * Check spoiler status for multiple sessions.
   */
  getSpoilerStatus: (sessionIds: string[]): Promise<SpoilerStatusResponse> =>
    apiClient.post<SpoilerStatusResponse>('/sessions/spoiler-status', { sessionIds }),

  /**
   * Reveal spoilers for a session.
   * This creates a minimal log entry marking the session as viewed.
   */
  revealSpoilers: (sessionId: string): Promise<RevealSpoilersResponse> =>
    apiClient.post<RevealSpoilersResponse>(`/sessions/${sessionId}/reveal`, {
      sessionId,
      confirmed: true,
    }),
};

/**
 * Sessions API service.
 * Alias for spoilerApi with additional utility methods.
 */
export const sessionsApi = {
  ...spoilerApi,
  
  /**
   * Get all race sessions for a season (excludes practice/quali).
   */
  getRacesBySeason: (seasonId: string): Promise<SessionSummaryDto[]> =>
    spoilerApi.getSessionsBySeason(seasonId, 'Race'),

  /**
   * Get all qualifying sessions for a season.
   */
  getQualifyingBySeason: (seasonId: string): Promise<SessionSummaryDto[]> =>
    spoilerApi.getSessionsBySeason(seasonId, 'Qualifying'),
};
