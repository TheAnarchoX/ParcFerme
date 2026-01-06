import { Link, useLocation } from 'react-router-dom';
import { MainLayout, Section } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../types/navigation';

/**
 * 404 Not Found page - displayed when a route doesn't exist.
 */
export function NotFoundPage() {
  const location = useLocation();
  
  return (
    <MainLayout>
      <Section>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Error Code */}
          <div className="mb-6">
            <span className="text-8xl font-racing text-pf-yellow">404</span>
          </div>
          
          {/* Error Message */}
          <h1 className="text-3xl font-bold text-neutral-100 mb-4">
            Page Not Found
          </h1>
          <p className="text-neutral-400 max-w-md mb-2">
            Looks like you've taken a wrong turn at the chicane. 
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-neutral-500 mb-8 font-mono">
            {location.pathname}
          </p>
          
          {/* Navigation Options */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to={ROUTES.HOME}>
              <Button variant="primary">
                🏠 Back to Home
              </Button>
            </Link>
            <Link to={ROUTES.SERIES_LIST}>
              <Button variant="ghost">
                🏁 Browse Series
              </Button>
            </Link>
          </div>
          
          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-neutral-800 w-full max-w-lg">
            <p className="text-sm text-neutral-500 mb-4">Looking for something specific?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                to={ROUTES.SESSIONS} 
                className="text-neutral-300 hover:text-accent-green transition-colors text-sm"
              >
                Sessions
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
