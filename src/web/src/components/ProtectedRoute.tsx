import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  /** If true, requires PaddockPass membership */
  requirePaddockPass?: boolean;
  /** Redirect path when not authenticated */
  redirectTo?: string;
}

/**
 * Route wrapper that requires authentication.
 * Optionally can require PaddockPass (premium) membership.
 */
export function ProtectedRoute({ 
  children, 
  requirePaddockPass = false,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, isPaddockPass } = useAuth();
  const location = useLocation();

  // Show nothing while checking auth status
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pf-green" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check PaddockPass requirement
  if (requirePaddockPass && !isPaddockPass) {
    return <Navigate to="/upgrade" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface GuestOnlyRouteProps {
  children: ReactNode;
  /** Redirect path when already authenticated */
  redirectTo?: string;
}

/**
 * Route wrapper that only allows non-authenticated users.
 * Useful for login/register pages.
 */
export function GuestOnlyRoute({ 
  children, 
  redirectTo = '/' 
}: GuestOnlyRouteProps) {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pf-green" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to the page they came from, or home
    const from = (location.state as { from?: Location })?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
