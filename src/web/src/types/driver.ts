/**
 * Driver types for API responses.
 * Keep in sync with backend DriverDtos.cs
 */

import type { TeamSummaryDto } from './spoiler';

// =========================
// Driver List Types
// =========================

/**
 * Driver list item for browse/discovery pages.
 */
export interface DriverListItemDto {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  abbreviation?: string;
  nationality?: string;
  headshotUrl?: string;
  driverNumber?: number;
  currentTeam?: TeamSummaryDto;
  seasonsCount: number;
  teamsCount: number;
}

/**
 * Paginated response for driver list.
 */
export interface DriverListResponse {
  items: DriverListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =========================
// Driver Detail Types
// =========================

/**
 * Full driver profile for the driver detail page.
 */
export interface DriverDetailDto {
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
  career: DriverCareerEntryDto[];
  stats: DriverStatsDto;
}

/**
 * Career entry showing a driver's team for a specific season/series.
 */
export interface DriverCareerEntryDto {
  year: number;
  seriesName: string;
  seriesSlug: string;
  team: TeamSummaryDto;
  roundsParticipated: number;
}

/**
 * Driver statistics across all series.
 */
export interface DriverStatsDto {
  totalSeasons: number;
  totalRounds: number;
  totalTeams: number;
  totalSeries: number;
  firstSeasonYear?: number;
  lastSeasonYear?: number;
}

/**
 * Season summary for a driver's participation.
 */
export interface DriverSeasonDto {
  seasonId: string;
  year: number;
  seriesName: string;
  seriesSlug: string;
  seriesLogoUrl?: string;
  team: TeamSummaryDto;
  roundsParticipated: number;
}

// =========================
// Utility Functions
// =========================

/**
 * Get the full display name for a driver.
 */
export function getDriverFullName(driver: { firstName: string; lastName: string }): string {
  return `${driver.firstName} ${driver.lastName}`;
}

/**
 * Get a short display name for a driver (first initial + last name).
 */
export function getDriverShortName(driver: { firstName: string; lastName: string }): string {
  return `${driver.firstName.charAt(0)}. ${driver.lastName}`;
}

/**
 * Get flag emoji for a nationality (basic mapping).
 * Returns a placeholder if nationality is unknown.
 */
export function getNationalityFlag(nationality?: string): string {
  if (!nationality) return '🏁';
  
  const flagMap: Record<string, string> = {
    // Common F1 nationalities
    'Dutch': '🇳🇱',
    'Netherlands': '🇳🇱',
    'British': '🇬🇧',
    'UK': '🇬🇧',
    'German': '🇩🇪',
    'Germany': '🇩🇪',
    'Spanish': '🇪🇸',
    'Spain': '🇪🇸',
    'French': '🇫🇷',
    'France': '🇫🇷',
    'Italian': '🇮🇹',
    'Italy': '🇮🇹',
    'Australian': '🇦🇺',
    'Australia': '🇦🇺',
    'Finnish': '🇫🇮',
    'Finland': '🇫🇮',
    'Mexican': '🇲🇽',
    'Mexico': '🇲🇽',
    'Japanese': '🇯🇵',
    'Japan': '🇯🇵',
    'Canadian': '🇨🇦',
    'Canada': '🇨🇦',
    'American': '🇺🇸',
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'Thai': '🇹🇭',
    'Thailand': '🇹🇭',
    'Chinese': '🇨🇳',
    'China': '🇨🇳',
    'Danish': '🇩🇰',
    'Denmark': '🇩🇰',
    'Monégasque': '🇲🇨',
    'Monaco': '🇲🇨',
    'Brazilian': '🇧🇷',
    'Brazil': '🇧🇷',
    'Argentine': '🇦🇷',
    'Argentina': '🇦🇷',
    'Austrian': '🇦🇹',
    'Austria': '🇦🇹',
    'Belgian': '🇧🇪',
    'Belgium': '🇧🇪',
    'Swiss': '🇨🇭',
    'Switzerland': '🇨🇭',
    'Swedish': '🇸🇪',
    'Sweden': '🇸🇪',
    'Polish': '🇵🇱',
    'Poland': '🇵🇱',
    'New Zealander': '🇳🇿',
    'New Zealand': '🇳🇿',
    'Russian': '🇷🇺',
    'Russia': '🇷🇺',
    'South African': '🇿🇦',
    'South Africa': '🇿🇦',
    'Indian': '🇮🇳',
    'India': '🇮🇳',
    'Indonesian': '🇮🇩',
    'Indonesia': '🇮🇩',
    'Colombian': '🇨🇴',
    'Colombia': '🇨🇴',
    'Venezuelan': '🇻🇪',
    'Venezuela': '🇻🇪',
    'Portuguese': '🇵🇹',
    'Portugal': '🇵🇹',
    'Irish': '🇮🇪',
    'Ireland': '🇮🇪',
  };
  
  return flagMap[nationality] ?? '🏁';
}

/**
 * Calculate approximate age from date of birth.
 */
export function calculateAge(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined;
  
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}
