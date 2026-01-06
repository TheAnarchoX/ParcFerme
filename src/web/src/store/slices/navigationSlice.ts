import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BreadcrumbItem, SearchResult, SearchState } from '../../types/navigation';

// =========================
// Navigation State
// =========================

interface NavigationState {
  /** Current breadcrumb trail */
  breadcrumbs: BreadcrumbItem[];
  
  /** Search state */
  search: SearchState;
  
  /** Mobile menu open state */
  isMobileMenuOpen: boolean;
  
  /** Current active nav item ID */
  activeNavId: string | null;
}

const initialState: NavigationState = {
  breadcrumbs: [],
  search: {
    query: '',
    results: [],
    isSearching: false,
    isOpen: false,
    recentSearches: loadRecentSearches(),
    error: null,
  },
  isMobileMenuOpen: false,
  activeNavId: null,
};

// =========================
// Helpers
// =========================

const MAX_RECENT_SEARCHES = 10;
const RECENT_SEARCHES_KEY = 'pf_recent_searches';

function loadRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // Ignore storage errors
  }
}

// =========================
// Slice
// =========================

export const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // Breadcrumbs
    setBreadcrumbs: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.breadcrumbs = action.payload;
    },
    
    clearBreadcrumbs: (state) => {
      state.breadcrumbs = [];
    },
    
    // Search
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
      if (action.payload.length > 0) {
        state.search.isOpen = true;
      }
    },
    
    setSearchResults: (state, action: PayloadAction<SearchResult[]>) => {
      state.search.results = action.payload;
      state.search.isSearching = false;
      state.search.error = null;
    },
    
    setSearchLoading: (state, action: PayloadAction<boolean>) => {
      state.search.isSearching = action.payload;
    },
    
    setSearchError: (state, action: PayloadAction<string | null>) => {
      state.search.error = action.payload;
      state.search.isSearching = false;
    },
    
    openSearch: (state) => {
      state.search.isOpen = true;
    },
    
    closeSearch: (state) => {
      state.search.isOpen = false;
      state.search.query = '';
      state.search.results = [];
      state.search.error = null;
    },
    
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const query = action.payload.trim();
      if (!query) return;
      
      // Remove if exists, then add to front
      const filtered = state.search.recentSearches.filter(s => s !== query);
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      state.search.recentSearches = updated;
      saveRecentSearches(updated);
    },
    
    clearRecentSearches: (state) => {
      state.search.recentSearches = [];
      saveRecentSearches([]);
    },
    
    // Mobile menu
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen;
    },
    
    closeMobileMenu: (state) => {
      state.isMobileMenuOpen = false;
    },
    
    // Active nav
    setActiveNav: (state, action: PayloadAction<string | null>) => {
      state.activeNavId = action.payload;
    },
  },
});

export const {
  setBreadcrumbs,
  clearBreadcrumbs,
  setSearchQuery,
  setSearchResults,
  setSearchLoading,
  setSearchError,
  openSearch,
  closeSearch,
  addRecentSearch,
  clearRecentSearches,
  toggleMobileMenu,
  closeMobileMenu,
  setActiveNav,
} = navigationSlice.actions;

// =========================
// Selectors
// =========================

import type { RootState } from '../index';

export const selectBreadcrumbs = (state: RootState) => state.navigation.breadcrumbs;
export const selectSearch = (state: RootState) => state.navigation.search;
export const selectIsMobileMenuOpen = (state: RootState) => state.navigation.isMobileMenuOpen;
export const selectActiveNavId = (state: RootState) => state.navigation.activeNavId;
