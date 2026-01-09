import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { driversApi } from '../../services/driversService';
import type { DriverListItemDto, DriverListResponse } from '../../types/driver';
import { getNationalityFlag, getDriverFullName } from '../../types/driver';
import {
  Pagination,
  DriverPlaceholder,
  FilterBar,
  SERIES_OPTIONS,
  NATIONALITY_OPTIONS,
  DRIVER_STATUS_OPTIONS,
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
  { value: 'lastName_asc', label: 'Last Name (A-Z)' },
  { value: 'lastName_desc', label: 'Last Name (Z-A)' },
  { value: 'firstName_asc', label: 'First Name (A-Z)' },
  { value: 'firstName_desc', label: 'First Name (Z-A)' },
  { value: 'seasons_desc', label: 'Most Seasons' },
  { value: 'seasons_asc', label: 'Fewest Seasons' },
  { value: 'recent_desc', label: 'Most Recent' },
  { value: 'recent_asc', label: 'Oldest Active' },
];

// =========================
// Loading Skeleton
// =========================

function DriverCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-neutral-800 rounded-lg" />
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-neutral-800 rounded w-32 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-24" />
        </div>
        <div className="w-6 h-6 bg-neutral-800 rounded" />
      </div>
    </div>
  );
}

// =========================
// Driver Card Component
// =========================

interface DriverCardProps {
  driver: DriverListItemDto;
}

function DriverCard({ driver }: DriverCardProps) {
  const fullName = getDriverFullName(driver);
  const flag = getNationalityFlag(driver.nationality);
  
  return (
    <Link
      to={ROUTES.DRIVER_DETAIL(driver.slug)}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Driver Number or Placeholder */}
        {driver.driverNumber ? (
          <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-neutral-200 font-racing">
              {driver.driverNumber}
            </span>
          </div>
        ) : (
          <DriverPlaceholder size={48} secondaryColor="#262626" primaryColor="#525252" />
        )}
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-accent-green transition-colors truncate">
            {fullName}
          </h3>
          <p className="text-sm text-neutral-500">
            {flag} {driver.nationality || 'Unknown'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        <span title="Current team">
          🏎️ {driver.currentTeam?.name ?? 'No team'}
        </span>
        <span title="Seasons competed">
          📅 {driver.seasonsCount} {driver.seasonsCount === 1 ? 'season' : 'seasons'}
        </span>
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Drivers discovery page.
 * Supports filtering by series, nationality, status via query parameters
 * Supports server-side search
 */
export function DriversPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse URL params
  const seriesFilter = searchParams.get('series') || '';
  const nationalityFilter = searchParams.get('nationality') || '';
  const statusFilter = searchParams.get('status') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'lastName_asc';
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] || seriesFilter : null;
  
  // State
  const [driversData, setDriversData] = useState<DriverListResponse | null>(null);
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
  
  // Fetch drivers (server-side search, filtering & sorting)
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Parse sort param (format: "field_order", e.g., "lastName_asc")
    const [sortBy, sortOrder] = sortParam.includes('_') 
      ? sortParam.split('_') 
      : [sortParam, 'asc'];
    
    try {
      const data = await driversApi.getDrivers({
        page: currentPage,
        pageSize: PAGE_SIZE,
        series: seriesFilter || undefined,
        nationality: nationalityFilter || undefined,
        status: (statusFilter as 'active' | 'legend') || undefined,
        search: searchParam || undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      setDriversData(data);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
      setError('Failed to load drivers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, seriesFilter, nationalityFilter, statusFilter, searchParam, sortParam]);
  
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);
  
  // Build breadcrumbs - include series if filtered
  const breadcrumbItems = seriesFilter && seriesName
    ? [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesFilter), icon: '🏁' },
        { label: 'Drivers', path: ROUTES.DRIVERS_FILTERED(seriesFilter), icon: '👤' },
      ]
    : [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
      ];
  
  useBreadcrumbs(breadcrumbItems);
  
  const handlePageChange = (page: number) => {
    updateParams({ page: page > 1 ? page.toString() : null });
  };
  
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
      id: 'nationality',
      label: 'Nationality',
      options: NATIONALITY_OPTIONS,
      value: nationalityFilter,
      onChange: (value) => updateParams({ nationality: value || null }),
    },
    {
      id: 'status',
      label: 'Status',
      options: DRIVER_STATUS_OPTIONS,
      value: statusFilter,
      onChange: (value) => updateParams({ status: value || null }),
    },
  ], [seriesFilter, nationalityFilter, statusFilter, updateParams]);
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Drivers` : 'Drivers';
  const pageSubtitle = seriesName
    ? `All drivers who have competed in ${seriesName}`
    : 'Explore racing drivers across all series';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="👤"
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      
      {/* Unified Filter Bar */}
      <FilterBar
        searchValue={searchParam}
        onSearchChange={(value) => updateParams({ search: value || null })}
        searchPlaceholder="Search drivers by name, nationality, or team..."
        sortOptions={SORT_OPTIONS}
        sortValue={sortParam}
        onSortChange={(value) => updateParams({ sort: value || null })}
        filters={filters}
        resultCount={driversData?.totalCount}
        resultLabel="drivers"
        isLoading={loading}
      />
      
      <Section>
        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <DriverCardSkeleton key={i} />
            ))}
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-lg text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchDrivers}
              className="px-4 py-2 bg-accent-green text-neutral-900 rounded-lg font-semibold hover:bg-accent-green/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Drivers grid */}
        {!loading && !error && driversData && (
          <>
            {driversData.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {driversData.items.map(driver => (
                  <DriverCard key={driver.id} driver={driver} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <div className="text-4xl mb-4">👤</div>
                <p className="text-lg mb-2">No drivers found</p>
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
              totalCount={driversData.totalCount}
              pageSize={driversData.pageSize}
              onPageChange={handlePageChange}
              isLoading={loading}
              itemLabel="drivers"
            />
          </>
        )}
      </Section>
    </MainLayout>
  );
}
