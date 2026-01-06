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
   */
  getSeasonByYear: (slug: string, year: number): Promise<SeasonDetailDto> =>
    apiClient.get<SeasonDetailDto>(`/series/${slug}/seasons/${year}`),
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
