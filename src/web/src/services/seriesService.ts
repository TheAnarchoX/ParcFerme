import { apiClient } from '../lib/api';
import type {
  SeriesSummaryDto,
  SeriesDetailDto,
  SeasonSummaryDto,
  SeasonDetailDto,
} from '../types/series';

/**
 * Series API service.
 * Handles series and season data retrieval.
 */
export const seriesApi = {
  /**
   * Get all available racing series.
   */
  getAllSeries: (): Promise<SeriesSummaryDto[]> =>
    apiClient.get<SeriesSummaryDto[]>('/series'),

  /**
   * Get a specific series by slug with full details.
   */
  getSeriesBySlug: (slug: string): Promise<SeriesDetailDto> =>
    apiClient.get<SeriesDetailDto>(`/series/${slug}`),

  /**
   * Get seasons for a specific series.
   */
  getSeasonsBySeriesSlug: (
    slug: string,
    options?: { fromYear?: number; toYear?: number }
  ): Promise<SeasonSummaryDto[]> => {
    const params = new URLSearchParams();
    if (options?.fromYear) params.append('fromYear', options.fromYear.toString());
    if (options?.toYear) params.append('toYear', options.toYear.toString());
    const queryString = params.toString();
    return apiClient.get<SeasonSummaryDto[]>(
      `/series/${slug}/seasons${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get a specific season by series slug and year.
   * @param slug - The series slug.
   * @param year - The season year.
   * @param filters - Optional filters for driver or team participation.
   */
  getSeasonByYear: (
    slug: string, 
    year: number, 
    filters?: { driverSlug?: string; teamSlug?: string }
  ): Promise<SeasonDetailDto> => {
    const params = new URLSearchParams();
    if (filters?.driverSlug) params.set('driverSlug', filters.driverSlug);
    if (filters?.teamSlug) params.set('teamSlug', filters.teamSlug);
    const queryString = params.toString();
    const url = `/series/${slug}/seasons/${year}${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<SeasonDetailDto>(url);
  },
};

/**
 * Seasons API service - alias for seriesApi season methods.
 */
export const seasonsApi = {
  /**
   * Get all seasons for a series.
   */
  getBySeries: seriesApi.getSeasonsBySeriesSlug,

  /**
   * Get a specific season.
   */
  getByYear: seriesApi.getSeasonByYear,
};
