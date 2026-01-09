import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { teamsApi } from '../../services/teamsService';
import type { TeamListItemDto, TeamListResponse } from '../../types/team';
import { getTeamNationalityFlag, getTeamPlaceholderColor } from '../../types/team';
import {
  Pagination,
  TeamPlaceholder,
  FilterBar,
  SERIES_OPTIONS,
  NATIONALITY_OPTIONS,
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
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'seasons_desc', label: 'Most Seasons' },
  { value: 'seasons_asc', label: 'Fewest Seasons' },
  { value: 'drivers_desc', label: 'Most Drivers' },
  { value: 'drivers_asc', label: 'Fewest Drivers' },
];

// =========================
// Loading Skeleton
// =========================

function TeamCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-neutral-800" />
        <div className="flex-1">
          <div className="h-5 bg-neutral-800 rounded w-3/4 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-neutral-800 rounded w-16" />
        <div className="h-6 bg-neutral-800 rounded w-20" />
      </div>
    </div>
  );
}

// =========================
// Team Card Component
// =========================

interface TeamCardProps {
  team: TeamListItemDto;
}

function TeamCard({ team }: TeamCardProps) {
  const backgroundColor = team.primaryColor || getTeamPlaceholderColor(team.name);
  const flag = getTeamNationalityFlag(team.nationality);
  
  return (
    <Link
      to={ROUTES.TEAM_DETAIL(team.slug)}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      <div className="flex items-center gap-4 mb-4">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.name}
            className="w-12 h-12 rounded-lg object-contain bg-white"
          />
        ) : (
          <TeamPlaceholder size={48} secondaryColor={backgroundColor} primaryColor="#a3a3a3" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-accent-green transition-colors truncate">
            {team.name}
          </h3>
          <p className="text-sm text-neutral-500">
            {flag} {team.nationality || 'Unknown'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        <span title="Seasons participated">
          📅 {team.seasonsCount} {team.seasonsCount === 1 ? 'season' : 'seasons'}
        </span>
        <span title="Total drivers">
          👥 {team.driversCount} {team.driversCount === 1 ? 'driver' : 'drivers'}
        </span>
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Teams discovery page.
 * Supports filtering by series, nationality via query parameters
 * Supports server-side search
 */
export function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse URL params
  const seriesFilter = searchParams.get('series') || '';
  const nationalityFilter = searchParams.get('nationality') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'name_asc';
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] || seriesFilter : null;
  
  // State
  const [teamsData, setTeamsData] = useState<TeamListResponse | null>(null);
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
  
  // Fetch teams (server-side search, filtering & sorting)
  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Parse sort param (format: "field_order", e.g., "name_asc")
    const [sortBy, sortOrder] = sortParam.includes('_') 
      ? sortParam.split('_') 
      : [sortParam, 'asc'];
    
    try {
      const data = await teamsApi.getTeams({
        page: currentPage,
        pageSize: PAGE_SIZE,
        series: seriesFilter || undefined,
        nationality: nationalityFilter || undefined,
        search: searchParam || undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      setTeamsData(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, seriesFilter, nationalityFilter, searchParam, sortParam]);
  
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);
  
  // Build breadcrumbs - include series if filtered
  const breadcrumbItems = seriesFilter && seriesName
    ? [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesFilter), icon: '🏁' },
        { label: 'Teams', path: ROUTES.TEAMS_FILTERED(seriesFilter), icon: '🏎️' },
      ]
    : [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
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
  ], [seriesFilter, nationalityFilter, updateParams]);
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Teams` : 'Teams';
  const pageSubtitle = seriesName
    ? `All teams competing in ${seriesName}`
    : 'Explore racing teams across all series';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏎️"
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      
      {/* Unified Filter Bar */}
      <FilterBar
        searchValue={searchParam}
        onSearchChange={(value) => updateParams({ search: value || null })}
        searchPlaceholder="Search teams by name or nationality..."
        sortOptions={SORT_OPTIONS}
        sortValue={sortParam}
        onSortChange={(value) => updateParams({ sort: value || null })}
        filters={filters}
        resultCount={teamsData?.totalCount}
        resultLabel="teams"
        isLoading={loading}
      />
      
      <Section>
        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-lg text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTeams}
              className="px-4 py-2 bg-accent-green text-neutral-900 rounded-lg font-semibold hover:bg-accent-green/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Teams grid */}
        {!loading && !error && teamsData && (
          <>
            {teamsData.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamsData.items.map(team => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <div className="text-4xl mb-4">🏎️</div>
                <p className="text-lg mb-2">No teams found</p>
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
              totalCount={teamsData.totalCount}
              pageSize={teamsData.pageSize}
              onPageChange={handlePageChange}
              isLoading={loading}
              itemLabel="teams"
            />
          </>
        )}
      </Section>
    </MainLayout>
  );
}
