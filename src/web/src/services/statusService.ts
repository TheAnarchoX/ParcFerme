import api from '../lib/api';

// =========================
// Types
// =========================

export interface DependencyHealth {
  name: string;
  healthy: boolean;
  responseTimeMs: number;
  error: string | null;
}

export interface DependencyHealthList {
  database: DependencyHealth;
  redis: DependencyHealth;
  openF1: DependencyHealth;
}

export interface StatusResponse {
  service: string;
  version: string;
  status: string;
  timestamp: string;
}

export interface DetailedHealthResponse extends StatusResponse {
  dependencies: DependencyHealthList;
}

// =========================
// API Functions
// =========================

/**
 * Get basic API status.
 */
export async function getStatus(): Promise<StatusResponse> {
  const response = await api.get<StatusResponse>('/status');
  return response.data;
}

/**
 * Get detailed health check with all dependencies.
 * Note: This may return 503 status code if dependencies are unhealthy,
 * but will still include the response body.
 */
export async function getHealth(): Promise<DetailedHealthResponse> {
  try {
    const response = await api.get<DetailedHealthResponse>('/status/health');
    return response.data;
  } catch (error: unknown) {
    // axios throws on non-2xx status codes, but 503 still has valid response
    if (isAxiosErrorWithData(error)) {
      return error.response.data as DetailedHealthResponse;
    }
    throw error;
  }
}

// Type guard for axios error with response data
function isAxiosErrorWithData(error: unknown): error is { response: { data: unknown } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null &&
    'data' in ((error as { response: object }).response)
  );
}

// =========================
// Export
// =========================

export const statusApi = {
  getStatus,
  getHealth,
};
