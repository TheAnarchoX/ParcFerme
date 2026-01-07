/**
 * Round types for API responses.
 * Keep in sync with backend RoundDtos.cs
 */

import type { CircuitDetailDto, EntrantDto } from './spoiler';

// =========================
// Round Page Types
// =========================

export interface RoundPageDetailDto {
  id: string;
  name: string;
  slug: string;
  roundNumber: number;
  dateStart: string;
  dateEnd: string;
  openF1MeetingKey?: number;
  series: SeriesBrandDto;
  year: number;
  circuit: CircuitDetailDto;
  sessions: SessionTimelineDto[];
  entrants: EntrantDto[];
  stats: RoundStatsDto;
  isCompleted: boolean;
  isCurrent: boolean;
  isUpcoming: boolean;
}

export interface SeriesBrandDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  brandColors: string[];
}

export interface SessionTimelineDto {
  id: string;
  type: string;
  displayName: string;
  startTimeUtc: string;
  status: string;
  isLogged: boolean;
  hasResults: boolean;
}

export interface RoundStatsDto {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalEntrants: number;
  totalLogs: number;
  averageExcitement?: number;
}

export interface AdjacentRoundDto {
  id: string;
  name: string;
  slug: string;
  roundNumber: number;
  dateStart: string;
}

export interface RoundPageResponse {
  round: RoundPageDetailDto;
  previousRound?: AdjacentRoundDto;
  nextRound?: AdjacentRoundDto;
}

// =========================
// Round Summary Types (for listings)
// =========================

export interface RoundSummaryForSeasonDto {
  id: string;
  name: string;
  slug: string;
  roundNumber: number;
  dateStart: string;
  dateEnd: string;
  circuit: CircuitSummaryForRoundDto;
  sessionCount: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isUpcoming: boolean;
}

export interface CircuitSummaryForRoundDto {
  id: string;
  name: string;
  slug: string;
  country: string;
  countryCode?: string;
}

// =========================
// Utility Functions
// =========================

/**
 * Get the primary brand color from a series.
 */
export function getSeriesPrimaryColor(series: SeriesBrandDto): string {
  return series.brandColors?.[0] ?? '#666666';
}

/**
 * Clean up round name by removing series prefix and year suffix.
 * e.g., "FORMULA 1 ROLEX AUSTRALIAN GRAND PRIX 2023" -> "Rolex Australian Grand Prix"
 */
export function cleanRoundName(name: string, seriesName: string, year: number): string {
  let cleaned = name;
  
  // Remove common series prefixes (case-insensitive)
  const prefixes = [
    `${seriesName} `,
    'FORMULA 1 ',
    'FORMULA ONE ',
    'F1 ',
    'MOTOGP ',
    'MOTO GP ',
    'WEC ',
    'INDYCAR ',
  ];
  
  for (const prefix of prefixes) {
    if (cleaned.toUpperCase().startsWith(prefix.toUpperCase())) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }
  
  // Remove year suffix (e.g., " 2023" at the end)
  const yearSuffix = ` ${year}`;
  if (cleaned.endsWith(yearSuffix)) {
    cleaned = cleaned.slice(0, -yearSuffix.length);
  }
  
  // Convert to title case if all uppercase
  if (cleaned === cleaned.toUpperCase()) {
    cleaned = cleaned.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  
  return cleaned.trim();
}

/**
 * Format a date range for display.
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // If same month, show: "Jul 5-7, 2024"
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startStr.split(' ')[0]} ${startDate.getDate()}-${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  // Different months: "Jun 30 - Jul 2, 2024"
  return `${startStr} - ${endStr}`;
}
