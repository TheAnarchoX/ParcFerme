/**
 * Team types for API responses.
 * Keep in sync with backend TeamDtos.cs
 */

import type { DriverSummaryDto } from './spoiler';

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
  currentDrivers: DriverSummaryDto[];
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
  drivers: DriverSummaryDto[];
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
  drivers: DriverSummaryDto[];
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

/**
 * Get nationality flag for a team.
 */
export function getTeamNationalityFlag(nationality?: string): string {
  if (!nationality) return '🏁';
  
  const flagMap: Record<string, string> = {
    'Austrian': '🇦🇹',
    'Austria': '🇦🇹',
    'British': '🇬🇧',
    'UK': '🇬🇧',
    'United Kingdom': '🇬🇧',
    'German': '🇩🇪',
    'Germany': '🇩🇪',
    'Italian': '🇮🇹',
    'Italy': '🇮🇹',
    'French': '🇫🇷',
    'France': '🇫🇷',
    'American': '🇺🇸',
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'Swiss': '🇨🇭',
    'Switzerland': '🇨🇭',
    'Japanese': '🇯🇵',
    'Japan': '🇯🇵',
    'Dutch': '🇳🇱',
    'Netherlands': '🇳🇱',
    'Indian': '🇮🇳',
    'India': '🇮🇳',
    'Malaysian': '🇲🇾',
    'Malaysia': '🇲🇾',
    'Chinese': '🇨🇳',
    'China': '🇨🇳',
  };
  
  return flagMap[nationality] ?? '🏁';
}

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
