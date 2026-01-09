import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { teamsApi } from '../../services/teamsService';
import type { TeamListItemDto, TeamListResponse } from '../../types/team';
import { getTeamShortName, getTeamNationalityFlag, getTeamPlaceholderColor } from '../../types/team';
import { Pagination, TeamPlaceholder } from '../../components/ui';

// =========================
// Constants
// =========================

const PAGE_SIZE = 24;

const SERIES_NAMES: Record<string, string> = {
  'f1': 'Formula 1',
  'formula-1': 'Formula 1',
  'motogp': 'MotoGP',
  'wec': 'WEC',
  'indycar': 'IndyCar',
  'formula-e': 'Formula E',
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'seasons', label: 'Most Seasons' },
  { value: 'drivers', label: 'Most Drivers' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['value'];

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
// Stats Card Components
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
// Team Card Component
// =========================

interface TeamCardProps {
  team: TeamListItemDto;
}

function TeamCard({ team }: TeamCardProps) {
  const backgroundColor = team.primaryColor || getTeamPlaceholderColor(team.name);
  const shortName = getTeamShortName(team);
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
        ) : team.primaryColor ? (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor }}
          >
            {shortName}
          </div>
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
 * Teams discovery page.
 * Supports filtering by series via query parameter (e.g., ?series=f1)
 */
export function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesFilter = searchParams.get('series');
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;
  
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] || seriesFilter : null;
  
  // State
  const [teamsData, setTeamsData] = useState<TeamListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
  // Fetch teams
  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await teamsApi.getTeams({
        page: currentPage,
        pageSize: PAGE_SIZE,
        series: seriesFilter || undefined,
      });
      setTeamsData(data);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, seriesFilter]);
  
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
  
  const handleClearFilter = () => {
    setSearchParams({});
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
  const totalPages = teamsData ? Math.ceil(teamsData.totalCount / teamsData.pageSize) : 0;
  
  // Filter and sort teams client-side (for search)
  const filteredTeams = useMemo(() => {
    if (!teamsData?.items) return [];
    
    let result = [...teamsData.items];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(team => {
        const name = team.name.toLowerCase();
        const nationality = (team.nationality || '').toLowerCase();
        return name.includes(query) || nationality.includes(query);
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'seasons':
          return b.seasonsCount - a.seasonsCount;
        case 'drivers':
          return b.driversCount - a.driversCount;
        default:
          return 0;
      }
    });
    
    return result;
  }, [teamsData?.items, searchQuery, sortBy]);
  
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
      
      {/* Stats row */}
      {teamsData && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard icon="🏎️" value={teamsData.totalCount} label="Total Teams" />
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
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search teams by name or nationality..."
          />
        </div>
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>
      
      {/* Active filter indicator */}
      {seriesFilter && seriesName && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          <FilterBadge label={seriesName} onClear={handleClearFilter} />
        </div>
      )}
      
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
            {filteredTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeams.map(team => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <div className="text-4xl mb-4">🏎️</div>
                <p className="text-lg mb-2">No teams found</p>
                <p className="text-sm">
                  {searchQuery 
                    ? `No teams match "${searchQuery}".`
                    : seriesFilter 
                      ? `No teams have been added for ${seriesName || seriesFilter} yet.`
                      : 'No teams available.'}
                </p>
                {(seriesFilter || searchQuery) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      if (seriesFilter) handleClearFilter();
                    }}
                    className="mt-4 text-accent-green hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
            
            {/* Only show pagination if not filtering client-side */}
            {!searchQuery && (
              <Pagination
                currentPage={currentPage}
                totalCount={teamsData.totalCount}
                pageSize={teamsData.pageSize}
                onPageChange={handlePageChange}
                isLoading={loading}
                itemLabel="teams"
              />
            )}
          </>
        )}
      </Section>
    </MainLayout>
  );
}
