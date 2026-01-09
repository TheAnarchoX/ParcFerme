import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { driversApi } from '../../services/driversService';
import type { DriverListItemDto, DriverListResponse } from '../../types/driver';
import { getNationalityFlag, getDriverFullName } from '../../types/driver';

// =========================
// Series name mapping (temporary until API provides this)
// =========================

const SERIES_NAMES: Record<string, string> = {
  'f1': 'Formula 1',
  'motogp': 'MotoGP',
  'wec': 'WEC',
  'indycar': 'IndyCar',
  'formula-e': 'Formula E',
};

// =========================
// Loading Skeleton
// =========================

function DriverCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
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

function StatsCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="h-8 bg-neutral-800 rounded w-12 mb-2" />
      <div className="h-4 bg-neutral-800 rounded w-24" />
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
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-all"
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Number */}
          <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
            {driver.driverNumber ? (
              <span className="text-xl font-bold text-neutral-300 font-racing">
                {driver.driverNumber}
              </span>
            ) : (
              <span className="text-xl text-neutral-600">—</span>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-neutral-100 group-hover:text-accent-green transition-colors truncate">
              {fullName}
            </h3>
            <p className="text-sm text-neutral-400 truncate">
              {driver.currentTeam?.name ?? 'No current team'}
            </p>
            {driver.seasonsCount > 0 && (
              <p className="text-xs text-neutral-500 mt-1">
                {driver.seasonsCount} season{driver.seasonsCount !== 1 ? 's' : ''} • {driver.teamsCount} team{driver.teamsCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {/* Flag */}
          <span className="text-xl" title={driver.nationality ?? 'Unknown'}>
            {flag}
          </span>
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
// Stats Card Component
// =========================

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: string;
}

function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-neutral-100">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =========================
// Pagination Controls
// =========================

interface PaginationProps {
  page: number;
  totalCount: number;
  pageSize: number;
  hasMore: boolean;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
}

function Pagination({ page, totalCount, pageSize, hasMore, onPageChange, isLoading }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);
  
  if (totalCount <= pageSize) return null;
  
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
      <p className="text-sm text-neutral-500">
        Showing {startItem}-{endItem} of {totalCount} drivers
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="px-3 py-1.5 text-sm bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <span className="px-3 py-1.5 text-sm text-neutral-400">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore || isLoading}
          className="px-3 py-1.5 text-sm bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =========================
// Page Component
// =========================

/**
 * Drivers discovery page.
 * Supports filtering by series via query parameter (e.g., ?series=f1)
 */
export function DriversPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesFilter = searchParams.get('series');
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] : null;
  
  // State
  const [data, setData] = useState<DriverListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch drivers
  useEffect(() => {
    async function fetchDrivers() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await driversApi.getDrivers({
          series: seriesFilter ?? undefined,
          page: currentPage,
          pageSize: 50,
        });
        setData(response);
      } catch (err) {
        console.error('Failed to fetch drivers:', err);
        setError('Failed to load drivers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDrivers();
  }, [seriesFilter, currentPage]);
  
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [seriesFilter]);
  
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
  
  const handleClearFilter = () => {
    setSearchParams({});
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Drivers` : 'Drivers';
  const pageSubtitle = seriesName
    ? `All drivers who have competed in ${seriesName}`
    : 'Discover drivers across all racing series';
  
  // Error state
  if (error && !isLoading) {
    return (
      <MainLayout showBreadcrumbs>
        <PageHeader
          icon="👤"
          title={pageTitle}
          subtitle={pageSubtitle}
        />
        <EmptyState
          icon="⚠️"
          title="Error loading drivers"
          description={error}
          action={
            <button
              onClick={() => window.location.reload()}
              className="text-accent-green hover:underline"
            >
              Try again
            </button>
          }
        />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="👤"
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      
      {/* Active filter indicator */}
      {seriesFilter && seriesName && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          <FilterBadge label={seriesName} onClear={handleClearFilter} />
        </div>
      )}
      
      {/* Stats summary */}
      {!isLoading && data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard icon="👤" label="Total Drivers" value={data.totalCount} />
        </div>
      )}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCardSkeleton />
        </div>
      )}
      
      <Section>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <DriverCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((driver) => (
                <DriverCard key={driver.id} driver={driver} />
              ))}
            </div>
            <Pagination
              page={data.page}
              totalCount={data.totalCount}
              pageSize={data.pageSize}
              hasMore={data.hasMore}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </>
        ) : (
          <EmptyState
            icon="🔍"
            title="No drivers found"
            description={
              seriesFilter 
                ? `No drivers have been added for ${seriesName || seriesFilter} yet.`
                : 'No drivers available in the database.'
            }
            action={
              seriesFilter ? (
                <button
                  onClick={handleClearFilter}
                  className="text-accent-green hover:underline"
                >
                  View all drivers
                </button>
              ) : undefined
            }
          />
        )}
      </Section>
    </MainLayout>
  );
}
