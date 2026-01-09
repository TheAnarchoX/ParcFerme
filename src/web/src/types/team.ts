/**
 * Team types for API responses.
 * Keep in sync with backend TeamDtos.cs
 */

// =========================
// Driver Role Type
// =========================

/**
 * Driver's role within a team.
 */
export type DriverRole = 'regular' | 'reserve' | 'fp1_only' | 'test';

/**
 * Driver info within a team context - includes role.
 */
export interface TeamDriverDto {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  abbreviation?: string;
  nationality?: string;
  headshotUrl?: string;
  driverNumber?: number;
  dateOfBirth?: string;
  wikipediaUrl?: string;
  /** Driver's role: "regular", "reserve", "fp1_only", "test" */
  role: DriverRole;
  /** Number of rounds this driver participated in (for the season context) */
  roundsParticipated: number;
}

// =========================
// Team List Types
// =========================

/**
 * Team list item for browse/discovery pages.
 */
export interface TeamListItemDto {
  id: string;
  name: string;
  slug: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
  nationality?: string;
  seasonsCount: number;
  driversCount: number;
}

/**
 * Paginated response for team list.
 */
export interface TeamListResponse {
  items: TeamListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =========================
// Team Detail Types
// =========================

/**
 * Full team profile for the team detail page.
 */
export interface TeamDetailDto {
  id: string;
  name: string;
  slug: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
  nationality?: string;
  wikipediaUrl?: string;
  currentDrivers: TeamDriverDto[];
  seasonHistory: TeamSeasonRosterDto[];
  stats: TeamStatsDto;
}

/**
 * Team's driver roster for a specific season.
 */
export interface TeamSeasonRosterDto {
  year: number;
  seriesName: string;
  seriesSlug: string;
  seriesLogoUrl?: string;
  drivers: TeamDriverDto[];
  roundsParticipated: number;
}

/**
 * Team statistics across all series.
 */
export interface TeamStatsDto {
  totalSeasons: number;
  totalRounds: number;
  totalDrivers: number;
  totalSeries: number;
  firstSeasonYear?: number;
  lastSeasonYear?: number;
}

/**
 * Season summary for a team's participation.
 */
export interface TeamSeasonDto {
  seasonId: string;
  year: number;
  seriesName: string;
  seriesSlug: string;
  seriesLogoUrl?: string;
  drivers: TeamDriverDto[];
  roundsParticipated: number;
}

// =========================
// Utility Functions
// =========================

/**
 * Get a short display name for a team (initials or short name).
 */
export function getTeamShortName(team: { name: string; shortName?: string }): string {
  if (team.shortName) return team.shortName;
  // Generate initials from name
  return team.name
    .split(' ')
    .filter(word => !['racing', 'f1', 'team', 'scuderia'].includes(word.toLowerCase()))
    .map(word => word.charAt(0))
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

// Re-export the centralized flag utility for backwards compatibility
export { nationalityToFlag as getTeamNationalityFlag } from '../lib/flags';

/**
 * Generate a placeholder color for teams without a primary color.
 */
export function getTeamPlaceholderColor(teamName: string): string {
  // Generate a deterministic color based on team name
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 40%)`;
}

/**
 * Get a human-readable label for a driver role.
 */
export function getDriverRoleLabel(role: DriverRole): string {
  switch (role) {
    case 'regular':
      return 'Driver';
    case 'reserve':
      return 'Reserve';
    case 'fp1_only':
      return 'FP1 Driver';
    case 'test':
      return 'Test Driver';
    default:
      return 'Driver';
  }
}

/**
 * Get CSS classes for a driver role badge.
 */
export function getDriverRoleBadgeClasses(role: DriverRole): string {
  switch (role) {
    case 'regular':
      return ''; // No badge for regular drivers
    case 'reserve':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'fp1_only':
      return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
    case 'test':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    default:
      return '';
  }
}
