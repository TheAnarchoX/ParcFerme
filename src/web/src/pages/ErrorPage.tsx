import { Link, useLocation, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { MainLayout, Section } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../types/navigation';

interface ErrorPageProps {
  /** Override the error code (useful for wrapping components) */
  statusCode?: number;
  /** Override the error title */
  title?: string;
  /** Override the error message */
  message?: string;
}

/**
 * Generic error page - handles 4xx and 5xx errors with navigation intact.
 * Can be used as a route error boundary or standalone error display.
 */
export function ErrorPage({ statusCode, title, message }: ErrorPageProps) {
  const location = useLocation();
  const routeError = useRouteError?.();
  
  // Determine error details
  let errorCode = statusCode || 500;
  let errorTitle = title || 'Something Went Wrong';
  let errorMessage = message || 'We encountered an unexpected error. Please try again later.';
  
  // Handle route error responses
  if (isRouteErrorResponse?.(routeError)) {
    errorCode = routeError.status;
    if (routeError.status === 404) {
      errorTitle = 'Page Not Found';
      errorMessage = 'The page you\'re looking for doesn\'t exist or has been moved.';
    } else if (routeError.status === 403) {
      errorTitle = 'Access Denied';
      errorMessage = 'You don\'t have permission to view this page.';
    } else if (routeError.status === 401) {
      errorTitle = 'Authentication Required';
      errorMessage = 'Please sign in to access this page.';
    } else if (routeError.status >= 500) {
      errorTitle = 'Server Error';
      errorMessage = 'Our servers are having trouble. Please try again in a few moments.';
    }
  }
  
  // Error type styling
  const isClientError = errorCode >= 400 && errorCode < 500;
  const errorColor = isClientError ? 'text-pf-yellow' : 'text-pf-red';
  const errorEmoji = isClientError ? '🚧' : '🔧';
  
  return (
    <MainLayout>
      <Section>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Error Icon */}
          <div className="mb-4">
            <span className="text-6xl">{errorEmoji}</span>
          </div>
          
          {/* Error Code */}
          <div className="mb-4">
            <span className={`text-7xl font-racing ${errorColor}`}>
              {errorCode}
            </span>
          </div>
          
          {/* Error Message */}
          <h1 className="text-3xl font-bold text-neutral-100 mb-4">
            {errorTitle}
          </h1>
          <p className="text-neutral-400 max-w-md mb-2">
            {errorMessage}
          </p>
          {errorCode >= 500 && (
            <p className="text-sm text-neutral-500 mb-8">
              Our pit crew has been notified and is working on it.
            </p>
          )}
          {errorCode < 500 && (
            <p className="text-sm text-neutral-500 mb-8 font-mono">
              {location.pathname}
            </p>
          )}
          
          {/* Navigation Options */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to={ROUTES.HOME}>
              <Button variant="primary">
                🏠 Back to Home
              </Button>
            </Link>
            {errorCode === 401 ? (
              <Link to="/login">
                <Button variant="ghost">
                  🔐 Sign In
                </Button>
              </Link>
            ) : (
              <Button 
                variant="ghost" 
                onClick={() => window.location.reload()}
              >
                🔄 Try Again
              </Button>
            )}
          </div>
          
          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-neutral-800 w-full max-w-lg">
            <p className="text-sm text-neutral-500 mb-4">Quick links</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                to={ROUTES.SERIES_LIST} 
                className="text-neutral-300 hover:text-accent-green transition-colors text-sm"
              >
                Series
              </Link>
              <Link 
                to={ROUTES.DRIVERS} 
                className="text-neutral-300 hover:text-accent-green transition-colors text-sm"
              >
                Drivers
              </Link>
              <Link 
                to={ROUTES.TEAMS} 
                className="text-neutral-300 hover:text-accent-green transition-colors text-sm"
              >
                Teams
              </Link>
              <Link 
                to={ROUTES.CIRCUITS} 
                className="text-neutral-300 hover:text-accent-green transition-colors text-sm"
              >
                Circuits
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </MainLayout>
  );
}

/**
 * 403 Forbidden page.
 */
export function ForbiddenPage() {
  return (
    <ErrorPage 
      statusCode={403}
      title="Access Denied"
      message="You don't have permission to access this page. This might require a higher membership tier."
    />
  );
}

/**
 * 500 Internal Server Error page.
 */
export function ServerErrorPage() {
  return (
    <ErrorPage 
      statusCode={500}
      title="Server Error"
      message="Something went wrong on our end. Our pit crew has been notified."
    />
  );
}

/**
 * 503 Service Unavailable page.
 */
export function MaintenancePage() {
  return (
    <ErrorPage 
      statusCode={503}
      title="Under Maintenance"
      message="We're currently performing scheduled maintenance. We'll be back on track shortly!"
    />
  );
}
