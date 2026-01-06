/**
 * Series and Season types for API responses.
 * Keep in sync with backend SeriesDtos.cs
 */

// =========================
// Series Types
// =========================

export interface SeriesSummaryDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  seasonCount: number;
  latestSeasonYear?: number;
  currentSeasonRoundCount?: number;
}

export interface SeriesDetailDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  seasons: SeasonSummaryDto[];
  stats: SeriesStatsDto;
}

export interface SeriesStatsDto {
  totalSeasons: number;
  totalRounds: number;
  totalSessions: number;
  totalDrivers: number;
  totalTeams: number;
  totalCircuits: number;
}

// =========================
// Season Types
// =========================

export interface SeasonSummaryDto {
  id: string;
  year: number;
  seriesName: string;
  seriesSlug: string;
  roundCount: number;
  isCurrent: boolean;
  isCompleted: boolean;
}

export interface SeasonDetailDto {
  id: string;
  year: number;
  series: SeriesSummaryDto;
  rounds: RoundSummaryForSeasonDto[];
  stats: SeasonStatsDto;
}

export interface SeasonStatsDto {
  totalRounds: number;
  completedRounds: number;
  upcomingRounds: number;
  totalSessions: number;
  totalEntrants: number;
  seasonStart?: string;
  seasonEnd?: string;
}

// =========================
// Round Types (for Season context)
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
// Color Mapping for Series
// =========================

export const SERIES_COLORS: Record<string, string> = {
  'f1': '#E10600',
  'formula-1': '#E10600',
  'motogp': '#FF6B00',
  'wec': '#0066CC',
  'indycar': '#1E1E1E',
  'formula-e': '#00BCD4',
  'nascar': '#FEBD30',
};

export function getSeriesColor(slug: string): string {
  return SERIES_COLORS[slug.toLowerCase()] ?? '#666666';
}
