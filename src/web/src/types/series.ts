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
  brandColors: string[];
}

export interface SeriesDetailDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  brandColors: string[];
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

/**
 * Default brand colors for series when not provided by API.
 * First color is primary (used for text), additional colors for gradients/accents.
 */
export const SERIES_COLORS: Record<string, string[]> = {
  'f1': ['#E10600', '#FFFFFF', '#000000'],
  'formula-1': ['#E10600', '#FFFFFF', '#000000'],
  'motogp': ['#FF6B00'],
  'wec': ['#01b9ff'],
  'indycar': ['#e51937', '#000000'],
  'formula-e': ['#00BCD4'],
  'nascar': ['#FFD659', '#E4002B', '#007AC2', '#000000'],
};

/**
 * Get brand colors for a series.
 * Returns array of colors - first is primary (for text), rest for accents/gradients.
 */
export function getSeriesColors(slug: string | undefined): string[] {
  if (!slug) return ['#666666'];
  return SERIES_COLORS[slug.toLowerCase()] ?? ['#666666'];
}

/**
 * Get the primary brand color for a series (for text, single-color usage).
 * @deprecated Use getSeriesColors() for full multi-color support
 */
export function getSeriesColor(slug: string | undefined): string {
  const colors = getSeriesColors(slug);
  return colors[0] ?? '#666666';
}
