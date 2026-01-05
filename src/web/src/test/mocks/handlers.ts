import { http, HttpResponse } from 'msw';
import type { AuthResponse, User, LoginRequest, RegisterRequest } from '../../types/api';

// Base URL for API requests - matches what axios uses in test environment
const API_BASE_URL = 'http://localhost/api/v1';

// Test user data
export const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@parcferme.com',
  displayName: 'Test Driver',
  spoilerMode: 'Strict',
  membershipTier: 'Free',
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockPaddockPassUser: User = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'premium@parcferme.com',
  displayName: 'Premium Driver',
  membershipTier: 'PaddockPass',
  membershipExpiresAt: '2027-01-01T00:00:00Z',
};

export const mockAuthResponse: AuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min from now
  user: mockUser,
};

export const handlers = [
  // Register
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as RegisterRequest;
    
    if (body.email === 'existing@parcferme.com') {
      return HttpResponse.json(
        { title: 'Email already registered', detail: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const response: AuthResponse = {
      ...mockAuthResponse,
      user: {
        ...mockUser,
        email: body.email,
        displayName: body.displayName,
      },
    };
    return HttpResponse.json(response, { status: 201 });
  }),

  // Login
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as LoginRequest;
    
    if (body.email === 'test@parcferme.com' && body.password === 'TestP@ssw0rd!') {
      return HttpResponse.json(mockAuthResponse);
    }
    
    return HttpResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 }
    );
  }),

  // Refresh token
  http.post(`${API_BASE_URL}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as { refreshToken: string };
    
    if (body.refreshToken === 'mock-refresh-token') {
      return HttpResponse.json({
        ...mockAuthResponse,
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid or expired refresh token' },
      { status: 401 }
    );
  }),

  // Logout
  http.post(`${API_BASE_URL}/auth/logout`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json({}, { status: 401 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Get current user
  http.get(`${API_BASE_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json({}, { status: 401 });
    }
    
    // Return PaddockPass user if token indicates premium
    if (authHeader.includes('premium')) {
      return HttpResponse.json(mockPaddockPassUser);
    }
    
    return HttpResponse.json(mockUser);
  }),

  // Update profile
  http.patch(`${API_BASE_URL}/auth/me`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json({}, { status: 401 });
    }

    const body = await request.json() as Partial<User>;
    return HttpResponse.json({
      ...mockUser,
      ...body,
    });
  }),
];
