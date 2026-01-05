/**
 * Shared TypeScript types for API responses and domain models.
 * Keep in sync with backend DTOs.
 */

// =========================
// Enums (match backend exactly)
// =========================

export type SpoilerMode = 'Strict' | 'Moderate' | 'None';
export type MembershipTier = 'Free' | 'PaddockPass';
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Qualifying' | 'Sprint' | 'Race';

// =========================
// Auth Types
// =========================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  spoilerMode: SpoilerMode;
  membershipTier: MembershipTier;
  membershipExpiresAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  spoilerMode?: SpoilerMode;
}

// =========================
// Event Types
// =========================

export interface Series {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface Season {
  id: string;
  seriesId: string;
  year: number;
  name: string;
}

export interface Round {
  id: string;
  seasonId: string;
  circuitId: string;
  name: string;
  slug: string;
  roundNumber: number;
  startDate: string;
  endDate: string;
  circuit?: Circuit;
}

export interface Session {
  id: string;
  roundId: string;
  type: SessionType;
  name: string;
  startTime: string;
  endTime?: string;
  isCompleted: boolean;
}

export interface Circuit {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  mapImageUrl?: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  nationality: string;
  nationalityCode: string;
  number?: number;
  headshotUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  color?: string;
  logoUrl?: string;
}

// =========================
// Social Types
// =========================

export interface Log {
  id: string;
  userId: string;
  sessionId: string;
  isAttended: boolean;
  starRating?: number;
  excitementRating?: number;
  loggedAt: string;
  session?: Session;
  review?: Review;
}

export interface Review {
  id: string;
  logId: string;
  content: string;
  containsSpoilers: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Experience {
  id: string;
  logId: string;
  grandstandId?: string;
  viewRating?: number;
  accessRating?: number;
  facilitiesRating?: number;
  viewPhotoUrl?: string;
  notes?: string;
}

// =========================
// API Response Wrappers
// =========================

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
