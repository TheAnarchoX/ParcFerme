import { apiClient } from '../lib/api';
import type {
  LogDetailDto,
  CreateLogRequest,
  UpdateLogRequest,
  UserLogsResponse,
  UserLogStatsDto,
  LogWeekendRequest,
  LogWeekendResponse,
  ReviewDto,
  CreateReviewRequest,
  UpdateReviewRequest,
  SessionReviewsResponse,
} from '../types/log';

/**
 * Logging API service.
 * Handles creating, reading, updating, and deleting race logs.
 */
export const logsApi = {
  // =========================
  // Log CRUD Operations
  // =========================

  /**
   * Create a new log entry for a session.
   */
  createLog: (data: CreateLogRequest): Promise<LogDetailDto> =>
    apiClient.post<LogDetailDto>('/logs', data),

  /**
   * Get a log by ID.
   */
  getLog: (id: string): Promise<LogDetailDto> =>
    apiClient.get<LogDetailDto>(`/logs/${id}`),

  /**
   * Get current user's log for a specific session.
   */
  getLogBySession: (sessionId: string): Promise<LogDetailDto> =>
    apiClient.get<LogDetailDto>(`/logs/session/${sessionId}`),

  /**
   * Update an existing log.
   */
  updateLog: (id: string, data: UpdateLogRequest): Promise<LogDetailDto> =>
    apiClient.put<LogDetailDto>(`/logs/${id}`, data),

  /**
   * Delete a log and associated review/experience.
   */
  deleteLog: (id: string): Promise<void> =>
    apiClient.delete(`/logs/${id}`),

  // =========================
  // User Logs Listing
  // =========================

  /**
   * Get current user's logs with pagination.
   */
  getMyLogs: (params?: {
    page?: number;
    pageSize?: number;
    sessionType?: string;
    isAttended?: boolean;
  }): Promise<UserLogsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.sessionType) searchParams.set('sessionType', params.sessionType);
    if (params?.isAttended !== undefined) searchParams.set('isAttended', params.isAttended.toString());
    
    const queryString = searchParams.toString();
    return apiClient.get<UserLogsResponse>(`/logs/me${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a user's public logs with pagination.
   */
  getUserLogs: (userId: string, params?: {
    page?: number;
    pageSize?: number;
    sessionType?: string;
    isAttended?: boolean;
  }): Promise<UserLogsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.sessionType) searchParams.set('sessionType', params.sessionType);
    if (params?.isAttended !== undefined) searchParams.set('isAttended', params.isAttended.toString());
    
    const queryString = searchParams.toString();
    return apiClient.get<UserLogsResponse>(`/logs/user/${userId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get user's log statistics.
   */
  getMyLogStats: (): Promise<UserLogStatsDto> =>
    apiClient.get<UserLogStatsDto>('/logs/me/stats'),

  /**
   * Get a user's public log statistics.
   */
  getUserLogStats: (userId: string): Promise<UserLogStatsDto> =>
    apiClient.get<UserLogStatsDto>(`/logs/user/${userId}/stats`),

  // =========================
  // Weekend Logging
  // =========================

  /**
   * Log multiple sessions at once (Weekend Wrapper).
   */
  logWeekend: (data: LogWeekendRequest): Promise<LogWeekendResponse> =>
    apiClient.post<LogWeekendResponse>('/logs/weekend', data),

  // =========================
  // Session Logs
  // =========================

  /**
   * Get all public logs for a session with pagination.
   */
  getSessionLogs: (sessionId: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<UserLogsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    
    const queryString = searchParams.toString();
    return apiClient.get<UserLogsResponse>(`/logs/session/${sessionId}/all${queryString ? `?${queryString}` : ''}`);
  },
};

/**
 * Reviews API service.
 * Handles creating, reading, updating, and deleting reviews.
 */
export const reviewsApi = {
  // =========================
  // Review CRUD
  // =========================

  /**
   * Add a review to an existing log.
   */
  createReview: (logId: string, data: CreateReviewRequest): Promise<ReviewDto> =>
    apiClient.post<ReviewDto>(`/reviews/log/${logId}`, data),

  /**
   * Get a review by ID.
   */
  getReview: (id: string): Promise<ReviewDto> =>
    apiClient.get<ReviewDto>(`/reviews/${id}`),

  /**
   * Update an existing review.
   */
  updateReview: (id: string, data: UpdateReviewRequest): Promise<ReviewDto> =>
    apiClient.put<ReviewDto>(`/reviews/${id}`, data),

  /**
   * Delete a review.
   */
  deleteReview: (id: string): Promise<void> =>
    apiClient.delete(`/reviews/${id}`),

  // =========================
  // Review Interactions
  // =========================

  /**
   * Like a review.
   */
  likeReview: (id: string): Promise<{ likeCount: number }> =>
    apiClient.post<{ likeCount: number }>(`/reviews/${id}/like`),

  /**
   * Unlike a review.
   */
  unlikeReview: (id: string): Promise<{ likeCount: number }> =>
    apiClient.delete(`/reviews/${id}/like`) as Promise<{ likeCount: number }>,

  // =========================
  // Session Reviews
  // =========================

  /**
   * Get all public reviews for a session.
   */
  getSessionReviews: (sessionId: string, params?: {
    page?: number;
    pageSize?: number;
    includeSpoilers?: boolean;
  }): Promise<SessionReviewsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.includeSpoilers !== undefined) searchParams.set('includeSpoilers', params.includeSpoilers.toString());
    
    const queryString = searchParams.toString();
    return apiClient.get<SessionReviewsResponse>(`/reviews/session/${sessionId}${queryString ? `?${queryString}` : ''}`);
  },
};
