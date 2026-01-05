import { apiClient, tokenStorage } from '../lib/api';
import type { 
  AuthResponse, 
  User, 
  LoginRequest, 
  RegisterRequest, 
  UpdateProfileRequest 
} from '../types/api';

/**
 * Authentication API service.
 */
export const authApi = {
  /**
   * Register a new user account.
   */
  register: (data: RegisterRequest): Promise<AuthResponse> => 
    apiClient.post<AuthResponse>('/auth/register', data),

  /**
   * Login with email and password.
   */
  login: (data: LoginRequest): Promise<AuthResponse> => 
    apiClient.post<AuthResponse>('/auth/login', data),

  /**
   * Logout and invalidate tokens.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      tokenStorage.clearTokens();
    }
  },

  /**
   * Get the current authenticated user's profile.
   */
  getCurrentUser: (): Promise<User> => 
    apiClient.get<User>('/auth/me'),

  /**
   * Update the current user's profile.
   */
  updateProfile: (data: UpdateProfileRequest): Promise<User> => 
    apiClient.patch<User>('/auth/me', data),

  /**
   * Change the current user's password.
   */
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),
};
