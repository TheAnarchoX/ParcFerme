import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { circuitsApi } from '../../services/circuitsService';
import type { CircuitListItemDto, CircuitListResponse } from '../../types/circuit';
import { getCountryFlag, formatCircuitLength } from '../../types/circuit';
import {
  Pagination,
  CircuitPlaceholder,
  FilterBar,
  SERIES_OPTIONS,
  REGION_OPTIONS,
} from '../../components/ui';
import type { FilterConfig, FilterOption } from '../../components/ui';

// =========================
// Constants
// =========================

const PAGE_SIZE = 24;

const SERIES_NAMES: Record<string, string> = {
  'formula-1': 'Formula 1',
  'motogp': 'MotoGP',
  'wec': 'WEC',
  'indycar': 'IndyCar',
  'formula-e': 'Formula E',
  'nascar': 'NASCAR Cup Series',
};

const SORT_OPTIONS: FilterOption[] = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'rounds', label: 'Most Rounds Hosted' },
  { value: 'country', label: 'Country (A-Z)' },
];

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
// Page Component
// =========================

/**
 * Circuits discovery page.
 * Supports filtering by series, region via query parameters
 * Supports server-side search
 */
export function CircuitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse URL params
  const seriesFilter = searchParams.get('series') || '';
  const regionFilter = searchParams.get('region') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'name';
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] || seriesFilter : null;
  
  // State
  const [circuitsData, setCircuitsData] = useState<CircuitListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Update URL params helper
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset page when filters change (except page itself)
    if (!('page' in updates)) {
      params.delete('page');
    }
    setSearchParams(params);
  }, [searchParams, setSearchParams]);
  
  // Fetch circuits (server-side search & filtering)
  const fetchCircuits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await circuitsApi.getCircuits({
        page: currentPage,
        pageSize: PAGE_SIZE,
        series: seriesFilter || undefined,
        region: regionFilter as 'europe' | 'americas' | 'asia' | 'oceania' | 'middle-east' || undefined,
        search: searchParam || undefined,
      });
      setCircuitsData(data);
    } catch (err) {
      console.error('Failed to fetch circuits:', err);
      setError('Failed to load circuits. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, seriesFilter, regionFilter, searchParam]);
  
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
  
  const handlePageChange = (page: number) => {
    updateParams({ page: page > 1 ? page.toString() : null });
  };
  
  // Sort circuits client-side (server returns filtered, sorted by default)
  const sortedCircuits = useMemo(() => {
    const items = circuitsData?.items || [];
    return [...items].sort((a, b) => {
      switch (sortParam) {
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
  }, [circuitsData?.items, sortParam]);
  
  // Build filter configs
  const filters: FilterConfig[] = useMemo(() => [
    {
      id: 'series',
      label: 'Series',
      options: SERIES_OPTIONS,
      value: seriesFilter,
      onChange: (value) => updateParams({ series: value || null }),
    },
    {
      id: 'region',
      label: 'Region',
      options: REGION_OPTIONS,
      value: regionFilter,
      onChange: (value) => updateParams({ region: value || null }),
    },
  ], [seriesFilter, regionFilter, updateParams]);
  
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
      
      {/* Unified Filter Bar */}
      <FilterBar
        searchValue={searchParam}
        onSearchChange={(value) => updateParams({ search: value || null })}
        searchPlaceholder="Search circuits by name, location, or country..."
        sortOptions={SORT_OPTIONS}
        sortValue={sortParam}
        onSortChange={(value) => updateParams({ sort: value || null })}
        filters={filters}
        resultCount={circuitsData?.totalCount}
        resultLabel="circuits"
        isLoading={loading}
      />
      
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
                  Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={() => setSearchParams(new URLSearchParams())}
                  className="mt-4 text-accent-green hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
            
            {/* Pagination */}
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
