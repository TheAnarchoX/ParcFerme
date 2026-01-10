/**
 * Spoiler Shield Types
 * 
 * Types for the spoiler protection system. Results are hidden by default
 * and only revealed when a user has logged the session or has SpoilerMode.None.
 */

// =========================
// Session DTOs (Spoiler-Aware)
// =========================

/**
 * Session summary for lists (minimal spoiler risk).
 */
export interface SessionSummaryDto {
  id: string;
  name: string;
  type: string;
  startTimeUtc: string;
  status: string;
  round: RoundSummaryDto;
  isLogged: boolean;
}

/**
 * Full session details with spoiler-protected results.
 */
export interface SessionDetailDto {
  id: string;
  name: string;
  type: string;
  startTimeUtc: string;
  status: string;
  openF1SessionKey?: number;
  round: RoundDetailDto;
  isLogged: boolean;
  spoilersRevealed: boolean;
  results?: SessionResultsDto;
  stats: SessionStatsDto;
}

/**
 * Results data - only populated when spoilers are revealed.
 */
export interface SessionResultsDto {
  classification: ResultDto[];
  winner?: ResultDto;
  fastestLap?: ResultDto;
}

/**
 * Individual result entry.
 */
export interface ResultDto {
  position: number;
  gridPosition?: number;
  status: string;
  points?: number;
  time?: string;
  laps?: number;
  fastestLap: boolean;
  driver: DriverSummaryDto;
  team: TeamSummaryDto;
  // Ergast detailed timing fields
  timeMilliseconds?: number;
  fastestLapNumber?: number;
  fastestLapRank?: number;
  fastestLapTime?: string;
  fastestLapSpeed?: string;
  statusDetail?: string;
  // Qualifying times (1994+)
  q1Time?: string;
  q2Time?: string;
  q3Time?: string;
}

/**
 * Spoiler-safe session statistics.
 * Aggregate data that doesn't reveal specific results.
 */
export interface SessionStatsDto {
  totalEntrants: number;
  finishedCount: number;
  dnfCount: number;
  averageExcitement?: number;
  totalLogs: number;
  totalReviews: number;
}

// =========================
// Round DTOs
// =========================

export interface RoundSummaryDto {
  id: string;
  name: string;
  slug: string;
  roundNumber: number;
  dateStart: string;
  dateEnd: string;
  circuit: CircuitSummaryDto;
  year: number;
  seriesName: string;
}

export interface RoundDetailDto {
  id: string;
  name: string;
  slug: string;
  roundNumber: number;
  dateStart: string;
  dateEnd: string;
  circuit: CircuitDetailDto;
  year: number;
  seriesSlug: string;
  seriesName: string;
  sessions: SessionSummaryDto[];
}

// =========================
// Circuit DTOs
// =========================

export interface CircuitSummaryDto {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode?: string;
}

export interface CircuitDetailDto {
  id: string;
  name: string;
  slug: string;
  location: string;
  country: string;
  countryCode?: string;
  layoutMapUrl?: string;
  latitude?: number;
  longitude?: number;
  lengthMeters?: number;
}

// =========================
// Driver/Team DTOs
// =========================

export interface DriverSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  abbreviation?: string;
  nationality?: string;
  headshotUrl?: string;
  driverNumber?: number;
}

export interface TeamSummaryDto {
  id: string;
  name: string;
  slug: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

// =========================
// Entrant DTOs
// =========================

export interface EntrantDto {
  id: string;
  driver: DriverSummaryDto;
  team: TeamSummaryDto;
  /** Driver's role: 'reserve', 'fp1_only', 'test', or null for regular */
  role?: string;
}

// =========================
// Log DTOs
// =========================

export interface LogSummaryDto {
  id: string;
  sessionId: string;
  starRating?: number;
  excitementRating?: number;
  liked: boolean;
  isAttended: boolean;
  loggedAt: string;
  dateWatched?: string;
}

export interface CreateLogRequest {
  sessionId: string;
  starRating?: number;
  excitementRating?: number;
  liked: boolean;
  isAttended: boolean;
  dateWatched?: string;
}

// =========================
// Spoiler Reveal DTOs
// =========================

/**
 * Request to reveal spoilers for a session.
 */
export interface RevealSpoilersRequest {
  sessionId: string;
  confirmed: boolean;
}

/**
 * Response after revealing spoilers.
 */
export interface RevealSpoilersResponse {
  success: boolean;
  message?: string;
  results?: SessionResultsDto;
}

/**
 * Request to check spoiler status for multiple sessions.
 */
export interface SpoilerStatusRequest {
  sessionIds: string[];
}

/**
 * Response with user's spoiler status.
 */
export interface SpoilerStatusResponse {
  spoilerMode: string;
  loggedSessionIds: string[];
  revealedCount: number;
}

// =========================
// Spoiler UI State
// =========================

/**
 * Visibility level for spoiler content.
 */
export type SpoilerVisibility = 'hidden' | 'partial' | 'full';

/**
 * Local state for tracking revealed spoilers in the UI.
 */
export interface SpoilerState {
  /**
   * User's global spoiler mode preference.
   */
  mode: 'Strict' | 'Moderate' | 'None';
  
  /**
   * Session IDs that the user has logged (always revealed).
   */
  loggedSessionIds: Set<string>;
  
  /**
   * Session IDs explicitly revealed in this browser session (not logged).
   */
  tempRevealedIds: Set<string>;
}

/**
 * Check if spoilers should be shown for a session.
 */
export function shouldShowSpoilers(
  sessionId: string, 
  state: SpoilerState
): boolean {
  // SpoilerMode.None shows everything
  if (state.mode === 'None') {
    return true;
  }
  
  // Logged sessions are always revealed
  if (state.loggedSessionIds.has(sessionId)) {
    return true;
  }
  
  // Temporarily revealed in this session
  if (state.tempRevealedIds.has(sessionId)) {
    return true;
  }
  
  return false;
}

/**
 * Get visibility level based on spoiler mode and reveal state.
 */
export function getSpoilerVisibility(
  sessionId: string,
  state: SpoilerState
): SpoilerVisibility {
  if (shouldShowSpoilers(sessionId, state)) {
    return 'full';
  }
  
  // Moderate mode shows partial info (excitement ratings, etc.)
  if (state.mode === 'Moderate') {
    return 'partial';
  }
  
  return 'hidden';
}
