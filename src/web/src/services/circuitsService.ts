/**
 * Circuit API service.
 * Handles all circuit discovery and profile operations.
 */

import apiClient from '@/lib/api';
import type { CircuitListResponse, CircuitDiscoveryDetailDto, CircuitSeasonDto } from '@/types/circuit';

/**
 * Options for fetching the circuit list.
 */
export interface GetCircuitsOptions {
  page?: number;
  pageSize?: number;
  series?: string;
  country?: string;
  region?: 'europe' | 'americas' | 'asia' | 'oceania' | 'middle-east';
  search?: string;
}

/**
 * Get paginated list of circuits.
 */
export async function getCircuits(options?: GetCircuitsOptions): Promise<CircuitListResponse> {
  const params = new URLSearchParams();
  
  if (options?.page) params.append('page', options.page.toString());
  if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options?.series) params.append('series', options.series);
  if (options?.country) params.append('country', options.country);
  if (options?.region) params.append('region', options.region);
  if (options?.search) params.append('search', options.search);
  
  const queryString = params.toString();
  const url = queryString ? `/circuits?${queryString}` : '/circuits';
  
  const response = await apiClient.get<CircuitListResponse>(url);
  return response.data;
}

/**
 * Get full circuit profile by slug.
 */
export async function getCircuitBySlug(slug: string): Promise<CircuitDiscoveryDetailDto> {
  const response = await apiClient.get<CircuitDiscoveryDetailDto>(`/circuits/${encodeURIComponent(slug)}`);
  return response.data;
}

/**
 * Get all seasons/rounds hosted at a circuit.
 */
export async function getCircuitSeasons(slug: string): Promise<CircuitSeasonDto[]> {
  const response = await apiClient.get<CircuitSeasonDto[]>(`/circuits/${encodeURIComponent(slug)}/seasons`);
  return response.data;
}

/**
 * Exported API object for named imports.
 */
export const circuitsApi = {
  getCircuits,
  getCircuitBySlug,
  getCircuitSeasons,
};

export default circuitsApi;
