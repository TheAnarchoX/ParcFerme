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
 * Driver role type (matches team.ts for consistency).
 */
export type DriverRole = 'regular' | 'reserve' | 'fp1_only' | 'test';

/**
 * Career entry showing a driver's team for a specific season/series.
 */
export interface DriverCareerEntryDto {
  year: number;
  seriesName: string;
  seriesSlug: string;
  team: TeamSummaryDto;
  roundsParticipated: number;
  /** Driver's role for this team/season: "regular", "reserve", "fp1_only", "test" */
  role: DriverRole;
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

// Re-export the centralized flag utility for backwards compatibility
export { nationalityToFlag as getNationalityFlag } from '../lib/flags';

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
