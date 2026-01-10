/**
 * Log Types - Core Logging Flow
 * 
 * Types for the logging system. Users can log sessions they've watched
 * or attended, with optional reviews and experience data.
 */

import type { RoundSummaryDto, CircuitDetailDto } from './spoiler';

// =========================
// Log DTOs
// =========================

/**
 * Summary of a log entry for lists/feeds.
 */
export interface LogSummaryDto {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  round: RoundSummaryDto;
  isAttended: boolean;
  starRating?: number;
  excitementRating?: number;
  liked: boolean;
  loggedAt: string;
  dateWatched?: string;
  hasReview: boolean;
}

/**
 * Round info for log detail (includes full circuit and series data).
 */
export interface LogRoundDto {
  id: string;
  name: string;
  slug: string;
  roundNumber: number;
  dateStart: string;
  dateEnd: string;
  circuit: CircuitDetailDto;
  year: number;
  seriesName: string;
  seriesSlug: string;
  seriesBrandColors: string[];
}

/**
 * Full log details including review and experience.
 */
export interface LogDetailDto {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  round: LogRoundDto;
  isAttended: boolean;
  starRating?: number;
  excitementRating?: number;
  liked: boolean;
  loggedAt: string;
  dateWatched?: string;
  review?: ReviewDto;
  experience?: ExperienceDto;
}

// =========================
// Review DTOs
// =========================

/**
 * Review details.
 */
export interface ReviewDto {
  id: string;
  logId: string;
  body: string;
  containsSpoilers: boolean;
  language?: string;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
}

/**
 * Review with associated log data for session review lists.
 */
export interface ReviewWithLogDto extends ReviewDto {
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  starRating?: number;
  excitementRating?: number;
  liked: boolean;
  isAttended: boolean;
}

// =========================
// Experience DTOs
// =========================

/**
 * Experience details for attended logs.
 */
export interface ExperienceDto {
  id: string;
  logId: string;
  grandstandId?: string;
  grandstandName?: string;
  seatDescription?: string;
  venueRating?: number;
  viewRating?: number;
  accessRating?: number;
  facilitiesRating?: number;
  atmosphereRating?: number;
  viewPhotoUrl?: string;
}

// =========================
// Request Types
// =========================

/**
 * Request to create a new log.
 */
export interface CreateLogRequest {
  sessionId: string;
  isAttended: boolean;
  starRating?: number;
  excitementRating?: number;
  liked?: boolean;
  dateWatched?: string;
  review?: CreateReviewRequest;
  experience?: CreateExperienceRequest;
}

/**
 * Request to update an existing log.
 */
export interface UpdateLogRequest {
  isAttended?: boolean;
  starRating?: number;
  excitementRating?: number;
  liked?: boolean;
  dateWatched?: string;
}

/**
 * Request to create a review.
 */
export interface CreateReviewRequest {
  body: string;
  containsSpoilers?: boolean;
  language?: string;
}

/**
 * Request to update a review.
 */
export interface UpdateReviewRequest {
  body?: string;
  containsSpoilers?: boolean;
  language?: string;
}

/**
 * Request to create an experience entry.
 */
export interface CreateExperienceRequest {
  grandstandId?: string;
  seatDescription?: string;
  venueRating?: number;
  viewRating?: number;
  accessRating?: number;
  facilitiesRating?: number;
  atmosphereRating?: number;
  viewPhotoUrl?: string;
}

/**
 * Request to update an experience entry.
 */
export interface UpdateExperienceRequest {
  grandstandId?: string;
  seatDescription?: string;
  venueRating?: number;
  viewRating?: number;
  accessRating?: number;
  facilitiesRating?: number;
  atmosphereRating?: number;
  viewPhotoUrl?: string;
}

// =========================
// Weekend Logging Types
// =========================

/**
 * Request to log multiple sessions at once (Weekend Wrapper).
 */
export interface LogWeekendRequest {
  roundId: string;
  sessions: LogSessionEntry[];
  isAttended: boolean;
  dateWatched?: string;
  experience?: CreateExperienceRequest;
}

/**
 * Individual session entry within a weekend log request.
 */
export interface LogSessionEntry {
  sessionId: string;
  starRating?: number;
  excitementRating?: number;
  liked?: boolean;
}

/**
 * Response from weekend logging.
 */
export interface LogWeekendResponse {
  logs: LogSummaryDto[];
  totalLogged: number;
  weekendAverageRating?: number;
}

// =========================
// User Activity Types
// =========================

/**
 * User's log history with pagination.
 */
export interface UserLogsResponse {
  logs: LogSummaryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * User statistics summary.
 */
export interface UserLogStatsDto {
  totalLogs: number;
  totalReviews: number;
  totalAttended: number;
  totalWatched: number;
  uniqueCircuits: number;
  uniqueDriversFollowed: number;
  averageRating?: number;
  totalHoursWatched?: number;
}

/**
 * Session reviews with pagination.
 */
export interface SessionReviewsResponse {
  reviews: ReviewWithLogDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =========================
// Utility Functions
// =========================

/**
 * Format star rating for display (e.g., 4.5 → "4.5/5").
 */
export function formatStarRating(rating?: number): string {
  if (rating === undefined || rating === null) return '-';
  return `${rating.toFixed(1)}/5`;
}

/**
 * Format excitement rating for display (e.g., 8 → "8/10").
 */
export function formatExcitementRating(rating?: number): string {
  if (rating === undefined || rating === null) return '-';
  return `${rating}/10`;
}

/**
 * Get color class for excitement rating.
 */
export function getExcitementColor(rating?: number): string {
  if (rating === undefined || rating === null) return 'text-neutral-500';
  if (rating >= 8) return 'text-green-500';
  if (rating >= 6) return 'text-yellow-500';
  if (rating >= 4) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get rating label (like "Boring", "Average", "Exciting", "Thriller").
 */
export function getExcitementLabel(rating?: number): string {
  if (rating === undefined || rating === null) return 'Not rated';
  if (rating >= 9) return 'Thriller';
  if (rating >= 7) return 'Exciting';
  if (rating >= 5) return 'Good';
  if (rating >= 3) return 'Average';
  return 'Boring';
}

/**
 * Format date watched for display.
 */
export function formatDateWatched(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Check if a date is within the spoiler window (< 7 days old).
 */
export function isWithinSpoilerWindow(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < 7;
}
