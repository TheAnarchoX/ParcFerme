import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectBreadcrumbs } from '../../store/slices/navigationSlice';
import type { BreadcrumbItem } from '../../types/navigation';

// =========================
// Breadcrumb Item Component
// =========================

interface BreadcrumbLinkProps {
  item: BreadcrumbItem;
  isLast: boolean;
}

function BreadcrumbLink({ item, isLast }: BreadcrumbLinkProps) {
  if (isLast) {
    // Current page - render as text
    return (
      <span 
        className="text-neutral-100 font-medium truncate max-w-[200px]"
        aria-current="page"
      >
        {item.icon && <span className="mr-1" aria-hidden="true">{item.icon}</span>}
        {item.label}
      </span>
    );
  }
  
  // Link to parent page
  return (
    <Link
      to={item.path}
      className="text-neutral-400 hover:text-neutral-100 transition-colors truncate max-w-[150px]"
    >
      {item.icon && <span className="mr-1" aria-hidden="true">{item.icon}</span>}
      {item.label}
    </Link>
  );
}

// =========================
// Separator Component
// =========================

function BreadcrumbSeparator() {
  return (
    <svg 
      className="w-4 h-4 text-neutral-600 flex-shrink-0" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// =========================
// Main Breadcrumbs Component
// =========================

interface BreadcrumbsProps {
  /** Override breadcrumbs from props instead of Redux */
  items?: BreadcrumbItem[];
  /** Optional className */
  className?: string;
}

/**
 * Breadcrumb navigation for deep pages.
 * Shows: Home > Series > Season > Round > Session hierarchy.
 * Uses Redux state by default, but can be overridden with props.
 */
export function Breadcrumbs({ items: propItems, className = '' }: BreadcrumbsProps) {
  const reduxItems = useSelector(selectBreadcrumbs);
  const items = propItems ?? reduxItems;
  
  // Don't render if no items or only home
  if (!items || items.length <= 1) {
    return null;
  }
  
  return (
    <nav 
      className={`flex items-center text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-2">
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbLink 
              item={item} 
              isLast={index === items.length - 1} 
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}

// =========================
// useBreadcrumbs Hook
// =========================

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setBreadcrumbs, clearBreadcrumbs } from '../../store/slices/navigationSlice';
import type { AppDispatch } from '../../store';

/**
 * Hook to set breadcrumbs for a page.
 * Automatically clears on unmount.
 * 
 * @example
 * useBreadcrumbs([
 *   { label: 'Home', path: '/' },
 *   { label: 'Formula 1', path: '/series/f1' },
 *   { label: '2025', path: '/series/f1/2025' },
 * ]);
 */
export function useBreadcrumbs(items: BreadcrumbItem[]) {
  const dispatch = useDispatch<AppDispatch>();
  
  useEffect(() => {
    dispatch(setBreadcrumbs(items));
    
    return () => {
      dispatch(clearBreadcrumbs());
    };
  }, [dispatch, JSON.stringify(items)]); // Use JSON.stringify for stable comparison
}

// =========================
// Breadcrumb Builder Helpers
// =========================

import { ROUTES } from '../../types/navigation';

/**
 * Build breadcrumbs for a series page.
 */
export function buildSeriesBreadcrumbs(seriesName: string, seriesSlug: string): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
    { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesSlug) },
  ];
}

/**
 * Build breadcrumbs for a season page.
 */
export function buildSeasonBreadcrumbs(
  seriesName: string, 
  seriesSlug: string, 
  year: number
): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesSlug), icon: '🏁' },
    { label: `${year}`, path: ROUTES.SEASON_DETAIL(seriesSlug, year) },
  ];
}

/**
 * Build breadcrumbs for a round page.
 */
export function buildRoundBreadcrumbs(
  seriesName: string,
  seriesSlug: string,
  year: number,
  roundName: string,
  roundSlug: string
): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesSlug), icon: '🏁' },
    { label: `${year}`, path: ROUTES.SEASON_DETAIL(seriesSlug, year) },
    { label: roundName, path: ROUTES.ROUND_DETAIL(seriesSlug, year, roundSlug) },
  ];
}

/**
 * Build breadcrumbs for a session page.
 */
export function buildSessionBreadcrumbs(
  seriesName: string,
  seriesSlug: string,
  year: number,
  roundName: string,
  roundSlug: string,
  sessionType: string
): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesSlug), icon: '🏁' },
    { label: `${year}`, path: ROUTES.SEASON_DETAIL(seriesSlug, year) },
    { label: roundName, path: ROUTES.ROUND_DETAIL(seriesSlug, year, roundSlug) },
    { label: sessionType, path: ROUTES.SESSION_DETAIL(seriesSlug, year, roundSlug, sessionType) },
  ];
}

/**
 * Build breadcrumbs for a driver page.
 */
export function buildDriverBreadcrumbs(driverName: string, driverSlug: string): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
    { label: driverName, path: ROUTES.DRIVER_DETAIL(driverSlug) },
  ];
}

/**
 * Build breadcrumbs for a team page.
 */
export function buildTeamBreadcrumbs(teamName: string, teamSlug: string): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
    { label: teamName, path: ROUTES.TEAM_DETAIL(teamSlug) },
  ];
}

/**
 * Build breadcrumbs for a circuit page.
 */
export function buildCircuitBreadcrumbs(circuitName: string, circuitSlug: string): BreadcrumbItem[] {
  return [
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🗺️' },
    { label: circuitName, path: ROUTES.CIRCUIT_DETAIL(circuitSlug) },
  ];
}
