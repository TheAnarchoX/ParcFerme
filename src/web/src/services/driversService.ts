import { apiClient } from '../lib/api';
import type {
  DriverListResponse,
  DriverDetailDto,
  DriverSeasonDto,
} from '../types/driver';

/**
 * Drivers API service.
 * Handles driver discovery and profile data retrieval.
 * All data is spoiler-safe (no result information).
 */
export const driversApi = {
  /**
   * Get paginated list of drivers with optional filtering.
   */
  getDrivers: (options?: {
    series?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DriverListResponse> => {
    const params = new URLSearchParams();
    if (options?.series) params.append('series', options.series);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    const queryString = params.toString();
    return apiClient.get<DriverListResponse>(
      `/drivers${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get a specific driver's full profile by slug.
   */
  getDriverBySlug: (slug: string): Promise<DriverDetailDto> =>
    apiClient.get<DriverDetailDto>(`/drivers/${slug}`),

  /**
   * Get all seasons a driver has participated in.
   */
  getDriverSeasons: (slug: string): Promise<DriverSeasonDto[]> =>
    apiClient.get<DriverSeasonDto[]>(`/drivers/${slug}/seasons`),
};
