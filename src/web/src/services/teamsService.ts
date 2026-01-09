/**
 * Team API service.
 * Handles all team discovery and profile operations.
 */

import apiClient from '@/lib/api';
import type { TeamListResponse, TeamDetailDto, TeamSeasonDto } from '@/types/team';

/**
 * Options for fetching the team list.
 */
export interface GetTeamsOptions {
  page?: number;
  pageSize?: number;
  series?: string;
  search?: string;
  nationality?: string;
  status?: 'active' | 'historical';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get paginated list of teams.
 */
export async function getTeams(options?: GetTeamsOptions): Promise<TeamListResponse> {
  const params = new URLSearchParams();
  
  if (options?.page) params.append('page', options.page.toString());
  if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options?.series) params.append('series', options.series);
  if (options?.search) params.append('search', options.search);
  if (options?.nationality) params.append('nationality', options.nationality);
  if (options?.status) params.append('status', options.status);
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
  
  const queryString = params.toString();
  const url = queryString ? `/teams?${queryString}` : '/teams';
  
  const response = await apiClient.get<TeamListResponse>(url);
  return response.data;
}

/**
 * Get full team profile by slug.
 */
export async function getTeamBySlug(slug: string): Promise<TeamDetailDto> {
  const response = await apiClient.get<TeamDetailDto>(`/teams/${encodeURIComponent(slug)}`);
  return response.data;
}

/**
 * Get all seasons a team has participated in.
 */
export async function getTeamSeasons(slug: string): Promise<TeamSeasonDto[]> {
  const response = await apiClient.get<TeamSeasonDto[]>(`/teams/${encodeURIComponent(slug)}/seasons`);
  return response.data;
}

/**
 * Exported API object for named imports.
 */
export const teamsApi = {
  getTeams,
  getTeamBySlug,
  getTeamSeasons,
};

export default teamsApi;
