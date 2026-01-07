import { apiClient } from '../lib/api';
import type {
  RoundPageResponse,
  RoundSummaryForSeasonDto,
} from '../types/round';

/**
 * Rounds API service.
 * Handles round (race weekend) data retrieval.
 */
export const roundsApi = {
  /**
   * Get round details by series slug, year, and round slug.
   */
  getRoundBySlug: (
    seriesSlug: string,
    year: number,
    roundSlug: string
  ): Promise<RoundPageResponse> =>
    apiClient.get<RoundPageResponse>(`/rounds/${seriesSlug}/${year}/${roundSlug}`),

  /**
   * Get rounds for a season.
   */
  getRoundsBySeason: (
    seriesSlug: string,
    year: number
  ): Promise<RoundSummaryForSeasonDto[]> =>
    apiClient.get<RoundSummaryForSeasonDto[]>(`/rounds/${seriesSlug}/${year}`),
};
