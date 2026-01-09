/**
 * Navigation types for the Parc Fermé app.
 * Defines the primary nav model: Series → Season → Round → Session
 */

// =========================
// Breadcrumb Types
// =========================

export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Route path to navigate to */
  path: string;
  /** Optional icon/emoji for visual identification */
  icon?: string;
}

// =========================
// Navigation Items
// =========================

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  path: string;
  /** Icon (emoji or icon class) */
  icon?: string;
  /** Whether this is only for authenticated users */
  requiresAuth?: boolean;
  /** Child navigation items (for dropdowns) */
  children?: NavItem[];
}

// =========================
// Search Types
// =========================

export type SearchResultType = 
  | 'series' 
  | 'season' 
  | 'round' 
  | 'session' 
  | 'driver' 
  | 'team' 
  | 'circuit';

export interface SearchResult {
  /** Unique identifier */
  id: string;
  /** Result type for categorization */
  type: SearchResultType;
  /** Primary display text */
  title: string;
  /** Secondary context (e.g., "F1 2024" for a round) */
  subtitle?: string;
  /** Navigation path */
  path: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Whether this result may contain spoilers */
  isSpoilerSafe: boolean;
}

export interface SearchState {
  /** Current search query */
  query: string;
  /** Search results grouped by type */
  results: SearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Whether the search modal/dropdown is open */
  isOpen: boolean;
  /** Recent searches (persisted) */
  recentSearches: string[];
  /** Error message if search failed */
  error: string | null;
}

// =========================
// Route Definitions
// =========================

/**
 * Application route definitions.
 * Organized by feature area for easy reference.
 */
export const ROUTES = {
  // Home
  HOME: '/',
  
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  
  // User
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // Discovery - Series hierarchy
  SERIES_LIST: '/series',
  SERIES_DETAIL: (slug: string) => `/series/${slug}`,
  SEASON_LIST: (seriesSlug: string) => `/series/${seriesSlug}/seasons`,
  SEASON_DETAIL: (seriesSlug: string, year: number) => `/series/${seriesSlug}/${year}`,
  SEASON_DETAIL_FILTERED_BY_DRIVER: (seriesSlug: string, year: number, driverSlug: string) => 
    `/series/${seriesSlug}/${year}?driver=${driverSlug}`,
  SEASON_DETAIL_FILTERED_BY_TEAM: (seriesSlug: string, year: number, teamSlug: string) => 
    `/series/${seriesSlug}/${year}?team=${teamSlug}`,
  ROUND_DETAIL: (seriesSlug: string, year: number, roundSlug: string) => 
    `/series/${seriesSlug}/${year}/${roundSlug}`,
  SESSION_DETAIL: (seriesSlug: string, year: number, roundSlug: string, sessionId: string) => 
    `/series/${seriesSlug}/${year}/${roundSlug}/session/${sessionId}`,
  
  // Discovery - Direct entity access
  SEASONS: '/seasons',
  SESSIONS: '/sessions',
  DRIVERS: '/drivers',
  DRIVERS_FILTERED: (seriesSlug: string) => `/drivers?series=${seriesSlug}`,
  DRIVER_DETAIL: (slug: string) => `/drivers/${slug}`,
  TEAMS: '/teams',
  TEAMS_FILTERED: (seriesSlug: string) => `/teams?series=${seriesSlug}`,
  TEAM_DETAIL: (slug: string) => `/teams/${slug}`,
  CIRCUITS: '/circuits',
  CIRCUITS_FILTERED: (seriesSlug: string) => `/circuits?series=${seriesSlug}`,
  CIRCUIT_DETAIL: (slug: string) => `/circuits/${slug}`,
  
  // Social
  FEED: '/feed',
  LISTS: '/lists',
  LIST_DETAIL: (id: string) => `/lists/${id}`,
  
  // Logging
  LOG_RACE: '/log',
  
  // Utility
  SEARCH: '/search',
  STATUS: '/status',

  // Legal & Info
  PRIVACY: '/privacy',
  TERMS: '/terms',
  ABOUT: '/about',
} as const;

// =========================
// Primary Navigation Config
// =========================

/**
 * Main navigation items shown in the header.
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'discover',
    label: 'Discover',
    path: ROUTES.SERIES_LIST,
    icon: '🔍',
    children: [
      { id: 'series', label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
      { id: 'seasons', label: 'Seasons', path: ROUTES.SEASONS, icon: '📅' },
      { id: 'sessions', label: 'Sessions', path: ROUTES.SESSIONS, icon: '📺' },
      { id: 'drivers', label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
      { id: 'teams', label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
      { id: 'circuits', label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🗺️' },
    ],
  },
  {
    id: 'feed',
    label: 'Feed',
    path: ROUTES.FEED,
    icon: '📰',
    requiresAuth: true,
  },
  {
    id: 'lists',
    label: 'Lists',
    path: ROUTES.LISTS,
    icon: '📋',
    requiresAuth: true,
  },
];

/**
 * User menu items shown in the user dropdown.
 */
export const USER_MENU_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile', path: ROUTES.PROFILE, icon: '👤' },
  { id: 'settings', label: 'Settings', path: ROUTES.SETTINGS, icon: '⚙️' },
  { id: 'lists', label: 'My Lists', path: ROUTES.LISTS, icon: '📋' },
];
