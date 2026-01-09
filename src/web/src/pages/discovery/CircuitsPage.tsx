import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { circuitsApi } from '../../services/circuitsService';
import type { CircuitListItemDto, CircuitListResponse } from '../../types/circuit';
import { getCountryFlag, formatCircuitLength } from '../../types/circuit';
import { Pagination, CircuitPlaceholder } from '../../components/ui';

// =========================
// Constants
// =========================

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

const SERIES_NAMES: Record<string, string> = {
  'formula-1': 'Formula 1',
  'motogp': 'MotoGP',
  'wec': 'WEC',
  'indycar': 'IndyCar',
  'formula-e': 'Formula E',
  'nascar': 'NASCAR Cup Series',
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'rounds', label: 'Most Rounds Hosted' },
  { value: 'country', label: 'Country (A-Z)' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['value'];

// =========================
// Loading Skeleton
// =========================

function CircuitCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-neutral-800 rounded w-3/4 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-1/2" />
        </div>
        <div className="w-10 h-10 bg-neutral-800 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="h-3 bg-neutral-800 rounded w-1/2 mb-1" />
          <div className="h-4 bg-neutral-800 rounded w-3/4" />
        </div>
        <div>
          <div className="h-3 bg-neutral-800 rounded w-1/2 mb-1" />
          <div className="h-4 bg-neutral-800 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// =========================
// Stats Card Component
// =========================

interface StatsCardProps {
  icon: string;
  value: number | string;
  label: string;
}

function StatsCard({ icon, value, label }: StatsCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-neutral-100">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}

// =========================
// Circuit Card Component
// =========================

interface CircuitCardProps {
  circuit: CircuitListItemDto;
}

function CircuitCard({ circuit }: CircuitCardProps) {
  const flag = getCountryFlag(circuit.country, circuit.countryCode);
  
  return (
    <Link
      to={ROUTES.CIRCUIT_DETAIL(circuit.slug)}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-accent-green transition-colors truncate">
            {circuit.name}
          </h3>
          <p className="text-sm text-neutral-500 truncate">
            {flag} {circuit.location}, {circuit.country}
          </p>
        </div>
        {circuit.layoutMapUrl ? (
          <img
            src={circuit.layoutMapUrl}
            alt={`${circuit.name} layout`}
            className="w-10 h-10 rounded object-contain bg-neutral-800"
          />
        ) : (
          <CircuitPlaceholder size={40} secondaryColor="#262626" primaryColor="#525252" />
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Length</span>
          <p className="text-neutral-200 font-medium">
            {circuit.lengthMeters ? formatCircuitLength(circuit.lengthMeters) : 'N/A'}
          </p>
        </div>
        <div>
          <span className="text-neutral-500">Rounds Hosted</span>
          <p className="text-neutral-200 font-medium">{circuit.roundsHosted}</p>
        </div>
      </div>
    </Link>
  );
}

// =========================
// Filter Badge Component
// =========================

interface FilterBadgeProps {
  label: string;
  onClear: () => void;
}

function FilterBadge({ label, onClear }: FilterBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-pf-green/10 border border-pf-green/20 rounded-full text-sm">
      <span className="text-accent-green">{label}</span>
      <button
        onClick={onClear}
        className="text-accent-green/70 hover:text-accent-green transition-colors"
        aria-label={`Clear ${label} filter`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// =========================
// Search Input Component
// =========================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="relative">
      <svg 
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-accent-green transition-colors"
      />
    </div>
  );
}

// =========================
// Sort Select Component
// =========================

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-accent-green transition-colors cursor-pointer"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// =========================
// Page Component
// =========================

/**
 * Circuits discovery page.
 * Supports filtering by series via query parameter (e.g., ?series=formula-1)
 * Supports server-side search via query parameter (e.g., ?search=silverstone)
 */
export function CircuitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesFilter = searchParams.get('series');
  const searchParam = searchParams.get('search') || '';
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] || seriesFilter : null;
  
  // State
  const [circuitsData, setCircuitsData] = useState<CircuitListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
  // Debounce timer ref
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Handle search input change with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    
    // Clear existing timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // Set new debounce timer
    searchDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) {
        params.set('search', value.trim());
        params.delete('page'); // Reset to page 1 on search
      } else {
        params.delete('search');
        params.delete('page');
      }
      setSearchParams(params);
    }, SEARCH_DEBOUNCE_MS);
  }, [searchParams, setSearchParams]);
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);
  
  // Sync search input with URL param (for back/forward navigation)
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);
  
  // Fetch circuits (server-side search)
  const fetchCircuits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await circuitsApi.getCircuits({
        page: currentPage,
        pageSize: PAGE_SIZE,
        series: seriesFilter || undefined,
        search: searchParam || undefined,
      });
      setCircuitsData(data);
    } catch (err) {
      console.error('Failed to fetch circuits:', err);
      setError('Failed to load circuits. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, seriesFilter, searchParam]);
  
  useEffect(() => {
    fetchCircuits();
  }, [fetchCircuits]);
  
  // Build breadcrumbs - include series if filtered
  const breadcrumbItems = seriesFilter && seriesName
    ? [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesFilter), icon: '🏁' },
        { label: 'Circuits', path: ROUTES.CIRCUITS_FILTERED(seriesFilter), icon: '🗺️' },
      ]
    : [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🗺️' },
      ];
  
  useBreadcrumbs(breadcrumbItems);
  
  const handleClearFilter = () => {
    const params = new URLSearchParams();
    // Keep search if present
    if (searchParam) {
      params.set('search', searchParam);
    }
    setSearchParams(params);
  };
  
  const handleClearSearch = () => {
    setSearchInput('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.delete('page');
    setSearchParams(params);
  };
  
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    setSearchParams(params);
  };
  
  // Calculate pagination
  const totalPages = circuitsData ? Math.ceil(circuitsData.totalCount / circuitsData.pageSize) : 0;
  
  // Sort circuits client-side only (search is now server-side)
  const sortedCircuits = (circuitsData?.items || []).slice().sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'rounds':
        return b.roundsHosted - a.roundsHosted;
      case 'country':
        return a.country.localeCompare(b.country);
      default:
        return 0;
    }
  });
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Circuits` : 'Circuits';
  const pageSubtitle = seriesName
    ? `Circuits used in ${seriesName}`
    : 'Explore racing circuits around the world';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🗺️"
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      
      {/* Stats row */}
      {circuitsData && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard icon="🗺️" value={circuitsData.totalCount} label="Total Circuits" />
          <StatsCard icon="📄" value={currentPage} label="Current Page" />
          <StatsCard icon="📚" value={totalPages} label="Total Pages" />
          <StatsCard 
            icon="🔍" 
            value={seriesFilter ? seriesName || seriesFilter : 'All'} 
            label="Series Filter" 
          />
        </div>
      )}
      
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search circuits by name, location, or country..."
          />
        </div>
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>
      
      {/* Active filter indicators */}
      {(seriesFilter || searchParam) && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          {seriesFilter && seriesName && (
            <FilterBadge label={seriesName} onClear={handleClearFilter} />
          )}
          {searchParam && (
            <FilterBadge label={`"${searchParam}"`} onClear={handleClearSearch} />
          )}
        </div>
      )}
      
      <Section>
        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <CircuitCardSkeleton key={i} />
            ))}
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-lg text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchCircuits}
              className="px-4 py-2 bg-accent-green text-neutral-900 rounded-lg font-semibold hover:bg-accent-green/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Circuits grid */}
        {!loading && !error && circuitsData && (
          <>
            {sortedCircuits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCircuits.map(circuit => (
                  <CircuitCard key={circuit.id} circuit={circuit} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-lg mb-2">No circuits found</p>
                <p className="text-sm">
                  {searchParam 
                    ? `No circuits match "${searchParam}".`
                    : seriesFilter 
                      ? `No circuits have been added for ${seriesName || seriesFilter} yet.`
                      : 'No circuits available.'}
                </p>
                {(seriesFilter || searchParam) && (
                  <button
                    onClick={() => {
                      handleClearSearch();
                      if (seriesFilter) handleClearFilter();
                    }}
                    className="mt-4 text-accent-green hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
            
            {/* Pagination - always show since search is server-side now */}
            <Pagination
              currentPage={currentPage}
              totalCount={circuitsData.totalCount}
              pageSize={circuitsData.pageSize}
              onPageChange={handlePageChange}
              isLoading={loading}
              itemLabel="circuits"
            />
          </>
        )}
      </Section>
    </MainLayout>
  );
}
