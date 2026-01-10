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

/**
 * Session participation with optional team info.
 * Team info is included when driver drove for multiple teams in a season.
 */
export interface SessionParticipationDto {
  sessionType: string;
  teamName?: string;
  teamSlug?: string;
}

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
  /** When a driver/team filter is applied, shows which sessions they participated in. */
  featuringSessions?: string[];
  /** When driver had multiple teams in a season, provides session-team mapping. */
  featuringSessionsWithTeam?: SessionParticipationDto[];
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

// =========================
// Color Contrast Utilities
// =========================

/**
 * Calculate relative luminance of a color.
 * Based on WCAG 2.0 formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(hexColor: string): number {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const gammaCorrect = (c: number) => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  const rLinear = gammaCorrect(r);
  const gLinear = gammaCorrect(g);
  const bLinear = gammaCorrect(b);
  
  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Determine if a color is "light" (should use dark text) or "dark" (should use light text).
 * Uses relative luminance threshold of 0.179 (WCAG recommendation).
 */
export function isLightColor(hexColor: string): boolean {
  return getLuminance(hexColor) > 0.179;
}

/**
 * Get the appropriate contrasting text color (black or white) for a given background color.
 * Uses WCAG luminance calculation to ensure readable text.
 * 
 * @param backgroundColor - Hex color (e.g., "#E10600" or "E10600")
 * @returns "#000000" for light backgrounds, "#FFFFFF" for dark backgrounds
 */
export function getContrastColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

/**
 * Get contrasting text color with optional custom light/dark values.
 * 
 * @param backgroundColor - Hex color for the background
 * @param lightText - Color to use for light text (default: white)
 * @param darkText - Color to use for dark text (default: black)
 */
export function getContrastColorCustom(
  backgroundColor: string,
  lightText: string = '#FFFFFF',
  darkText: string = '#000000'
): string {
  return isLightColor(backgroundColor) ? darkText : lightText;
}
