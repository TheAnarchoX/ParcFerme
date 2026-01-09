/**
 * Circuit types for API responses.
 * Keep in sync with backend CircuitDtos.cs
 */

// =========================
// Circuit List Types
// =========================

/**
 * Circuit list item for browse/discovery pages.
 */
export interface CircuitListItemDto {
  id: string;
  name: string;
  slug: string;
  location: string;
  country: string;
  countryCode?: string;
  layoutMapUrl?: string;
  roundsHosted: number;
  lengthMeters?: number;
}

/**
 * Paginated response for circuit list.
 */
export interface CircuitListResponse {
  items: CircuitListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =========================
// Circuit Detail Types
// =========================

/**
 * Full circuit profile for the circuit detail page.
 */
export interface CircuitDiscoveryDetailDto {
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
  altitude?: number;
  wikipediaUrl?: string;
  grandstands: GrandstandDto[];
  seasonHistory: CircuitSeasonSummaryDto[];
  stats: CircuitStatsDto;
}

/**
 * Grandstand information for venue ratings.
 */
export interface GrandstandDto {
  id: string;
  name: string;
  description?: string;
}

/**
 * Circuit statistics across all series.
 */
export interface CircuitStatsDto {
  totalRounds: number;
  totalSeries: number;
  totalSeasons: number;
  firstSeasonYear?: number;
  lastSeasonYear?: number;
}

/**
 * Season summary for circuit hosting history.
 */
export interface CircuitSeasonSummaryDto {
  year: number;
  seriesName: string;
  seriesSlug: string;
  seriesLogoUrl?: string;
  roundName: string;
  roundSlug: string;
  roundNumber: number;
}

/**
 * Season detail for circuit endpoint.
 */
export interface CircuitSeasonDto {
  seasonId: string;
  year: number;
  seriesName: string;
  seriesSlug: string;
  seriesLogoUrl?: string;
  roundName: string;
  roundSlug: string;
  roundNumber: number;
  sessionsCount: number;
}

// =========================
// Utility Functions
// =========================

/**
 * Get country flag emoji from country name or code.
 */
export function getCountryFlag(country?: string, countryCode?: string): string {
  if (!country && !countryCode) return '🏁';
  
  // Try country code first (2-letter ISO)
  if (countryCode && countryCode.length === 2) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  
  // Fallback to country name mapping
  const flagMap: Record<string, string> = {
    'Australia': '🇦🇺',
    'Austria': '🇦🇹',
    'Azerbaijan': '🇦🇿',
    'Bahrain': '🇧🇭',
    'Belgium': '🇧🇪',
    'Brazil': '🇧🇷',
    'Canada': '🇨🇦',
    'China': '🇨🇳',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Hungary': '🇭🇺',
    'Italy': '🇮🇹',
    'Japan': '🇯🇵',
    'Mexico': '🇲🇽',
    'Monaco': '🇲🇨',
    'Netherlands': '🇳🇱',
    'Portugal': '🇵🇹',
    'Qatar': '🇶🇦',
    'Russia': '🇷🇺',
    'Saudi Arabia': '🇸🇦',
    'Singapore': '🇸🇬',
    'Spain': '🇪🇸',
    'UAE': '🇦🇪',
    'United Arab Emirates': '🇦🇪',
    'UK': '🇬🇧',
    'United Kingdom': '🇬🇧',
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'Vietnam': '🇻🇳',
  };
  
  return country ? (flagMap[country] ?? '🏁') : '🏁';
}

/**
 * Format circuit length in a readable way.
 */
export function formatCircuitLength(lengthMeters?: number): string {
  if (!lengthMeters) return 'N/A';
  
  const km = lengthMeters / 1000;
  const miles = km * 0.621371;
  
  return `${km.toFixed(3)} km (${miles.toFixed(3)} mi)`;
}

/**
 * Format altitude in a readable way.
 */
export function formatAltitude(altitude?: number): string {
  if (altitude === undefined || altitude === null) return 'N/A';
  
  const feet = altitude * 3.28084;
  return `${altitude} m (${Math.round(feet)} ft)`;
}

/**
 * Generate Google Maps URL for circuit location.
 */
export function getGoogleMapsUrl(latitude?: number, longitude?: number): string | null {
  if (latitude === undefined || longitude === undefined) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
