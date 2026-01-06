import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from '../../hooks/useDebounce';
import type { AppDispatch } from '../../store';
import {
  selectSearch,
  setSearchQuery,
  setSearchResults,
  setSearchLoading,
  setSearchError,
  openSearch,
  closeSearch,
  addRecentSearch,
  clearRecentSearches,
} from '../../store/slices/navigationSlice';
import type { SearchResult, SearchResultType } from '../../types/navigation';
import { searchApi } from '../../services/searchService';

// =========================
// Result Type Icons & Labels
// =========================

const TYPE_CONFIG: Record<SearchResultType, { icon: string; label: string }> = {
  series: { icon: '🏁', label: 'Series' },
  season: { icon: '📅', label: 'Season' },
  round: { icon: '🏆', label: 'Round' },
  session: { icon: '📺', label: 'Session' },
  driver: { icon: '👤', label: 'Driver' },
  team: { icon: '🏎️', label: 'Team' },
  circuit: { icon: '🗺️', label: 'Circuit' },
};

// =========================
// Search Result Item
// =========================

interface SearchResultItemProps {
  result: SearchResult;
  isHighlighted: boolean;
  onClick: () => void;
}

function SearchResultItem({ result, isHighlighted, onClick }: SearchResultItemProps) {
  const config = TYPE_CONFIG[result.type];
  
  return (
    <button
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
        ${isHighlighted ? 'bg-neutral-800' : 'hover:bg-neutral-800/50'}
      `}
      onClick={onClick}
      role="option"
      aria-selected={isHighlighted}
    >
      {/* Icon or image */}
      {result.imageUrl ? (
        <img 
          src={result.imageUrl} 
          alt="" 
          className="w-8 h-8 rounded object-cover"
        />
      ) : (
        <span className="w-8 h-8 flex items-center justify-center text-lg">
          {config.icon}
        </span>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-neutral-100 font-medium truncate">
          {result.title}
        </p>
        {result.subtitle && (
          <p className="text-sm text-neutral-400 truncate">
            {result.subtitle}
          </p>
        )}
      </div>
      
      {/* Type badge */}
      <span className="flex-shrink-0 text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
        {config.label}
      </span>
    </button>
  );
}

// =========================
// Search Modal Component
// =========================

export function GlobalSearch() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const { query, results, isSearching, isOpen, recentSearches, error } = useSelector(selectSearch);
  const debouncedQuery = useDebounce(query, 300);
  
  // Focus input when search opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);
  
  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      dispatch(setSearchResults([]));
      return;
    }
    
    const performSearch = async () => {
      dispatch(setSearchLoading(true));
      try {
        const searchResults = await searchApi.globalSearch(debouncedQuery);
        dispatch(setSearchResults(searchResults));
      } catch (err) {
        dispatch(setSearchError('Search failed. Please try again.'));
      }
    };
    
    performSearch();
  }, [debouncedQuery, dispatch]);
  
  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        dispatch(closeSearch());
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleResultClick(results[highlightedIndex]);
        } else if (query.trim()) {
          // Navigate to search page with query
          dispatch(addRecentSearch(query));
          navigate(`/search?q=${encodeURIComponent(query)}`);
          dispatch(closeSearch());
        }
        break;
    }
  }, [isOpen, results, highlightedIndex, query, dispatch, navigate]);
  
  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    dispatch(addRecentSearch(query));
    navigate(result.path);
    dispatch(closeSearch());
  }, [query, dispatch, navigate]);
  
  // Handle recent search click
  const handleRecentClick = useCallback((searchTerm: string) => {
    dispatch(setSearchQuery(searchTerm));
  }, [dispatch]);
  
  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          dispatch(closeSearch());
        } else {
          dispatch(openSearch());
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, dispatch]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => dispatch(closeSearch())}
        aria-hidden="true"
      />
      
      {/* Search Modal */}
      <div 
        className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
            <svg 
              className="w-5 h-5 text-neutral-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              onKeyDown={handleKeyDown}
              placeholder="Search drivers, teams, circuits, sessions..."
              className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-500 outline-none text-base"
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-autocomplete="list"
            />
            {isSearching && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pf-green" />
            )}
            <kbd className="hidden sm:flex items-center gap-1 text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
              ESC
            </kbd>
          </div>
          
          {/* Results / Recent Searches */}
          <div 
            id="search-results"
            className="max-h-[60vh] overflow-y-auto"
            role="listbox"
          >
            {/* Error State */}
            {error && (
              <div className="px-4 py-8 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
            {/* Results */}
            {!error && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    isHighlighted={index === highlightedIndex}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>
            )}
            
            {/* No Results */}
            {!error && query.length >= 2 && !isSearching && results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-neutral-400">No results found for "{query}"</p>
              </div>
            )}
            
            {/* Recent Searches */}
            {!error && query.length < 2 && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider">
                    Recent Searches
                  </span>
                  <button
                    onClick={() => dispatch(clearRecentSearches())}
                    className="text-xs text-neutral-500 hover:text-neutral-300"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(search)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-neutral-800/50 transition-colors"
                  >
                    <svg 
                      className="w-4 h-4 text-neutral-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <span className="text-neutral-300">{search}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!error && query.length < 2 && recentSearches.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-neutral-400 mb-2">
                  Search for drivers, teams, circuits, and sessions
                </p>
                <p className="text-sm text-neutral-500">
                  Results are spoiler-safe by default
                </p>
              </div>
            )}
          </div>
          
          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded">↑↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded">↵</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded">esc</kbd>
                <span>close</span>
              </span>
            </div>
            <span className="text-xs text-neutral-500">🛡️ Spoiler-safe</span>
          </div>
        </div>
      </div>
    </>
  );
}

// =========================
// Search Trigger Button
// =========================

export function SearchTrigger() {
  const dispatch = useDispatch<AppDispatch>();
  
  return (
    <button
      onClick={() => dispatch(openSearch())}
      className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
      aria-label="Open search (Ctrl+K)"
    >
      <svg 
        className="w-4 h-4 text-neutral-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
      <span className="text-sm text-neutral-400 hidden sm:inline">Search...</span>
      <kbd className="hidden md:flex items-center gap-0.5 text-xs text-neutral-500 bg-neutral-700/50 px-1.5 py-0.5 rounded">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
