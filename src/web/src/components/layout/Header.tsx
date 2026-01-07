import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { SearchTrigger, GlobalSearch } from '../navigation/GlobalSearch';
import { SpoilerModeToggle } from '../ui/SpoilerModeToggle';
import { PRIMARY_NAV_ITEMS, USER_MENU_ITEMS, type NavItem } from '../../types/navigation';
import type { AppDispatch } from '../../store';
import {
  selectIsMobileMenuOpen,
  toggleMobileMenu,
  closeMobileMenu,
} from '../../store/slices/navigationSlice';

// =========================
// Desktop Dropdown Menu
// =========================

interface NavDropdownProps {
  item: NavItem;
  isActive: boolean;
}

function NavDropdown({ item, isActive }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  // Check if any child is active
  const hasActiveChild = item.children?.some(child => 
    location.pathname.startsWith(child.path)
  );
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);
  
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isActive || hasActiveChild 
            ? 'text-accent-green bg-pf-green/10' 
            : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {item.icon && <span className="text-base" aria-hidden="true">{item.icon}</span>}
        <span>{item.label}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && item.children && (
        <div 
          className="absolute top-full left-0 mt-1 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 z-50"
          role="menu"
        >
          {item.children.map((child) => (
            <Link
              key={child.id}
              to={child.path}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm transition-colors
                ${location.pathname.startsWith(child.path) 
                  ? 'text-accent-green bg-pf-green/10' 
                  : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                }
              `}
              role="menuitem"
            >
              {child.icon && <span aria-hidden="true">{child.icon}</span>}
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// User Menu Dropdown
// =========================

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/');
  };
  
  if (!user) return null;
  
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        {user.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={user.displayName}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-pf-green/20 flex items-center justify-center">
            <span className="text-accent-green text-sm font-racing">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-neutral-200 text-sm font-medium hidden sm:block max-w-[100px] truncate">
          {user.displayName}
        </span>
        <svg 
          className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 w-56 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 z-50"
          role="menu"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <p className="text-sm text-neutral-100 font-medium truncate">{user.displayName}</p>
            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
            {user.membershipTier === 'PaddockPass' && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-pf-yellow/20 text-pf-yellow text-xs rounded-full">
                🏆 Paddock Pass
              </span>
            )}
          </div>
          
          {/* Spoiler Mode Toggle in dropdown */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <SpoilerModeToggle variant="compact" />
          </div>
          
          {/* Menu items */}
          {USER_MENU_ITEMS.map((menuItem) => (
            <Link
              key={menuItem.id}
              to={menuItem.path}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
              role="menuitem"
            >
              {menuItem.icon && <span aria-hidden="true">{menuItem.icon}</span>}
              <span>{menuItem.label}</span>
            </Link>
          ))}
          
          {/* Logout */}
          <div className="border-t border-neutral-800 mt-1 pt-1">
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors"
              role="menuitem"
            >
              <span aria-hidden="true">🚪</span>
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Mobile Menu
// =========================

function MobileMenu() {
  const dispatch = useDispatch<AppDispatch>();
  const isOpen = useSelector(selectIsMobileMenuOpen);
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Close on route change
  useEffect(() => {
    dispatch(closeMobileMenu());
  }, [location.pathname, dispatch]);
  
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const handleLogout = async () => {
    await logout();
    dispatch(closeMobileMenu());
    navigate('/');
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={() => dispatch(closeMobileMenu())}
        aria-hidden="true"
      />
      
      {/* Slide-out menu */}
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-sm bg-neutral-900 z-50 md:hidden overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Parc Fermé" className="h-6 w-6" />
            <span className="text-lg font-bold brand-logo">Parc Fermé</span>
          </div>
          <button
            onClick={() => dispatch(closeMobileMenu())}
            className="p-2 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* User info (if authenticated) */}
        {isAuthenticated && user && (
          <div className="px-4 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-pf-green/20 flex items-center justify-center">
                  <span className="text-accent-green text-lg font-racing">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-neutral-100 font-medium">{user.displayName}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
              </div>
            </div>
            
            {/* Spoiler mode toggle */}
            <div className="mt-4">
              <SpoilerModeToggle variant="mobile" />
            </div>
          </div>
        )}
        
        {/* Navigation items */}
        <nav className="px-4 py-4">
          {/* Primary nav */}
          {PRIMARY_NAV_ITEMS.map((item) => {
            // Skip auth-only items if not authenticated
            if (item.requiresAuth && !isAuthenticated) return null;
            
            if (item.children) {
              return (
                <div key={item.id} className="mb-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                    {item.label}
                  </p>
                  <div className="space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        to={child.path}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                          ${location.pathname.startsWith(child.path)
                            ? 'text-accent-green bg-pf-green/10'
                            : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                          }
                        `}
                      >
                        {child.icon && <span className="text-lg">{child.icon}</span>}
                        <span className="font-medium">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1
                  ${location.pathname === item.path
                    ? 'text-accent-green bg-pf-green/10'
                    : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                  }
                `}
              >
                {item.icon && <span className="text-lg">{item.icon}</span>}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* User menu items (if authenticated) */}
          {isAuthenticated && (
            <>
              <div className="border-t border-neutral-800 my-4" />
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Account</p>
              {USER_MENU_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors mb-1"
                >
                  {item.icon && <span className="text-lg">{item.icon}</span>}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors mt-2"
              >
                <span className="text-lg">🚪</span>
                <span className="font-medium">Log out</span>
              </button>
            </>
          )}
          
          {/* Auth buttons (if not authenticated) */}
          {!isAuthenticated && (
            <div className="mt-6 space-y-3">
              <Link to="/login" className="block">
                <Button variant="ghost" className="w-full justify-center">
                  Log in
                </Button>
              </Link>
              <Link to="/register" className="block">
                <Button variant="primary" className="w-full justify-center">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}

// =========================
// Main Header Component
// =========================

/**
 * Navigation header with logo, primary nav, search, and user menu.
 * Responsive with mobile menu support.
 */
export function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="Parc Fermé" 
                className="h-8 w-8 group-hover:opacity-80 transition-opacity"
              />
              <span className="text-xl font-bold brand-logo group-hover:opacity-80 transition-opacity">
                Parc Fermé
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {PRIMARY_NAV_ITEMS.map((item) => {
                // Skip auth-only items if not authenticated
                if (item.requiresAuth && !isAuthenticated) return null;
                
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                
                // Render dropdown for items with children
                if (item.children) {
                  return (
                    <NavDropdown 
                      key={item.id} 
                      item={item} 
                      isActive={isActive}
                    />
                  );
                }
                
                // Render simple link
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'text-accent-green bg-pf-green/10' 
                        : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
                      }
                    `}
                  >
                    {item.icon && <span className="text-base" aria-hidden="true">{item.icon}</span>}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side: Search + User */}
            <div className="flex items-center gap-3">
              {/* Global Search */}
              <SearchTrigger />
              
              {/* User Menu or Auth Buttons */}
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="hidden sm:flex items-center gap-2">
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
                </div>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => dispatch(toggleMobileMenu())}
                className="md:hidden p-2 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile menu */}
      <MobileMenu />
      
      {/* Global search modal */}
      <GlobalSearch />
    </>
  );
}
