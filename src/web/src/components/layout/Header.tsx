import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

/**
 * Navigation header with logo and user menu.
 */
export function Header() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold text-pf-green group-hover:text-pf-green-400 transition-colors">
              Parc Fermé
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/sessions" 
              className="text-neutral-400 hover:text-neutral-100 transition-colors text-sm font-medium"
            >
              Sessions
            </Link>
            {isAuthenticated && (
              <Link 
                to="/feed" 
                className="text-neutral-400 hover:text-neutral-100 transition-colors text-sm font-medium"
              >
                Feed
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  {user?.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-pf-green/20 flex items-center justify-center">
                      <span className="text-pf-green text-sm font-medium">
                        {user?.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-neutral-200 text-sm font-medium hidden sm:block">
                    {user?.displayName}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  disabled={isLoading}
                  className="text-neutral-400"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
