import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seasonsApi, seriesApi } from '../../services/seriesService';
import { driversApi } from '../../services/driversService';
import { circuitsApi } from '../../services/circuitsService';
import { Pagination } from '../../components/ui';
import type { 
  SeasonBrowseItemDto, 
  SeasonBrowseResponse, 
  SeasonBrowseStatsDto,
  SeriesSummaryDto 
} from '../../types/series';
import { getSeriesColors, getContrastColor } from '../../types/series';

// =========================
// Types
// =========================

type GroupMode = 'flat' | 'year' | 'series';
type ViewMode = 'simple' | 'power';
type SortOption = 'year_desc' | 'year_asc' | 'rounds_desc' | 'rounds_asc' | 'series_asc' | 'series_desc';
type StatusFilter = '' | 'current' | 'completed' | 'upcoming';

interface FilterState {
  series: string;
  driverSlug: string;
  circuitSlug: string;
  fromYear: string;
  toYear: string;
  status: StatusFilter;
  sort: SortOption;
  groupBy: GroupMode;
  viewMode: ViewMode;
}

const PAGE_SIZE = 48;

// Mapping from FilterState keys to URL param names
const FILTER_TO_PARAM: Record<keyof FilterState | 'page', string> = {
  series: 'series',
  driverSlug: 'driver',
  circuitSlug: 'circuit',
  fromYear: 'from',
  toYear: 'to',
  status: 'status',
  sort: 'sort',
  groupBy: 'group',
  viewMode: 'view',
  page: 'page',
};

// =========================
// Loading Skeletons
// =========================

function SeasonCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden animate-pulse">
      <div className="h-1 bg-neutral-700" />
      <div className="p-4">
        <div className="h-7 bg-neutral-800 rounded w-20 mb-2" />
        <div className="h-4 bg-neutral-800 rounded w-28 mb-3" />
        <div className="flex gap-2">
          <div className="h-4 bg-neutral-800 rounded w-16" />
          <div className="h-4 bg-neutral-800 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-neutral-800 rounded-lg w-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// =========================
// Season Card Component
// =========================

interface SeasonCardProps {
  season: SeasonBrowseItemDto;
  showSeriesName?: boolean;
}

function SeasonCard({ season, showSeriesName = true }: SeasonCardProps) {
  const colors = season.seriesBrandColors.length > 0 
    ? season.seriesBrandColors 
    : getSeriesColors(season.seriesSlug);
  const primaryColor = colors[0];
  
  // Format date range
  const dateRange = useMemo(() => {
    if (!season.seasonStart || !season.seasonEnd) return null;
    const start = new Date(season.seasonStart);
    const end = new Date(season.seasonEnd);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonth} – ${endMonth}`;
  }, [season.seasonStart, season.seasonEnd]);
  
  return (
    <Link
      to={ROUTES.SEASON_DETAIL(season.seriesSlug, season.year)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: primaryColor }} />
      
      <div className="p-4">
        {/* Year headline */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-2xl font-bold text-neutral-100 group-hover:text-pf-green transition-colors font-racing">
            {season.year}
          </h3>
          <div className="flex gap-1">
            {season.isCurrent && (
              <span 
                className="px-2 py-0.5 text-xs rounded font-medium"
                style={{ 
                  backgroundColor: `${primaryColor}25`,
                  color: primaryColor
                }}
              >
                Live
              </span>
            )}
            {season.isCompleted && !season.isCurrent && (
              <span className="px-2 py-0.5 bg-neutral-800/80 text-neutral-500 text-xs rounded">
                ✓
              </span>
            )}
          </div>
        </div>
        
        {/* Series name */}
        {showSeriesName && (
          <p className="text-sm text-neutral-400 mb-2 truncate">
            {season.seriesName}
          </p>
        )}
        
        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="font-bold" style={{ color: primaryColor }}>{season.roundCount}</span>
            <span>rounds</span>
          </span>
          {dateRange && (
            <>
              <span className="text-neutral-700">•</span>
              <span>{dateRange}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// =========================
// Filter Components
// =========================

interface SeriesChipFilterProps {
  series: SeriesSummaryDto[];
  selected: string;
  onChange: (slug: string) => void;
}

function SeriesChipFilter({ series, selected, onChange }: SeriesChipFilterProps) {
  const isAllSelected = selected === '';
  
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('')}
        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all border ${
          isAllSelected
            ? 'bg-pf-green text-black border-pf-green'
            : 'bg-neutral-900/50 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
        }`}
      >
        All Series
      </button>
      {series.map(s => {
        const colors = s.brandColors.length > 0 ? s.brandColors : getSeriesColors(s.slug);
        const primaryColor = colors[0] ?? '#666666';
        const isSelected = selected === s.slug;
        
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.slug)}
            className="px-3 py-1.5 text-sm font-medium rounded-full transition-all border"
            style={isSelected ? { 
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              color: getContrastColor(primaryColor)
            } : {
              backgroundColor: 'rgba(23, 23, 23, 0.5)',
              borderColor: 'rgb(64, 64, 64)',
              color: 'rgb(163, 163, 163)'
            }}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

interface ViewModeSwitchProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewModeSwitch({ mode, onChange }: ViewModeSwitchProps) {
  return (
    <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 rounded-lg p-1">
      <button
        onClick={() => onChange('simple')}
        className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
          mode === 'simple'
            ? 'bg-neutral-700 text-neutral-100'
            : 'text-neutral-500 hover:text-neutral-300'
        }`}
        title="Simple view - essential filters only"
      >
        👤 Simple
      </button>
      <button
        onClick={() => onChange('power')}
        className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
          mode === 'power'
            ? 'bg-neutral-700 text-neutral-100'
            : 'text-neutral-500 hover:text-neutral-300'
        }`}
        title="Power view - all filters and grouping options"
      >
        🔬 Archive
      </button>
    </div>
  );
}

interface GroupModeSwitchProps {
  mode: GroupMode;
  onChange: (mode: GroupMode) => void;
}

function GroupModeSwitch({ mode, onChange }: GroupModeSwitchProps) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-neutral-500 mr-2">Group:</span>
      {(['flat', 'year', 'series'] as GroupMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-2 py-1 rounded transition-all ${
            mode === m
              ? 'bg-neutral-700 text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {m === 'flat' ? 'None' : m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
}

interface EntitySearchInputProps {
  type: 'driver' | 'circuit';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function EntitySearchInput({ type, value, onChange, placeholder }: EntitySearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Array<{ slug: string; name: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Debounced search for suggestions
  useEffect(() => {
    if (!inputValue || inputValue === value) {
      setSuggestions([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (type === 'driver') {
          const data = await driversApi.getDrivers({ search: inputValue, pageSize: 5 });
          setSuggestions(data.items.map(d => ({ 
            slug: d.slug, 
            name: `${d.firstName} ${d.lastName}` 
          })));
        } else {
          const data = await circuitsApi.getCircuits({ search: inputValue, pageSize: 5 });
          setSuggestions(data.items.map(c => ({ slug: c.slug, name: c.name })));
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [inputValue, type, value]);
  
  const handleSelect = (slug: string, name: string) => {
    setInputValue(name);
    onChange(slug);
    setShowSuggestions(false);
    setSuggestions([]);
  };
  
  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
  };
  
  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 bg-neutral-900/80 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pf-green/50 transition-all"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500">
          {type === 'driver' ? '👤' : '🏁'}
        </span>
        {(inputValue || value) && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="px-3 py-2 text-sm text-neutral-500">Searching...</div>
          )}
          {suggestions.map(s => (
            <button
              key={s.slug}
              onClick={() => handleSelect(s.slug, s.name)}
              className="w-full px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ActiveFilterBadgeProps {
  label: string;
  value: string;
  onClear: () => void;
  color?: string;
}

function ActiveFilterBadge({ label, value, onClear, color }: ActiveFilterBadgeProps) {
  const badgeColor = color || 'rgb(0, 255, 135)';
  
  return (
    <button
      onClick={onClear}
      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition-colors hover:opacity-80"
      style={{
        backgroundColor: `${badgeColor}15`,
        borderColor: `${badgeColor}30`,
      }}
    >
      <span className="text-neutral-400 text-xs">{label}:</span>
      <span className="font-medium" style={{ color: badgeColor }}>{value}</span>
      <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: badgeColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// =========================
// Main Page Component
// =========================

export function SeasonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse URL params into filter state
  const filters: FilterState = {
    series: searchParams.get('series') || '',
    driverSlug: searchParams.get('driver') || '',
    circuitSlug: searchParams.get('circuit') || '',
    fromYear: searchParams.get('from') || '',
    toYear: searchParams.get('to') || '',
    status: (searchParams.get('status') as StatusFilter) || '',
    sort: (searchParams.get('sort') as SortOption) || 'year_desc',
    groupBy: (searchParams.get('group') as GroupMode) || 'flat',
    viewMode: (searchParams.get('view') as ViewMode) || 'simple',
  };
  
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // State
  const [allSeries, setAllSeries] = useState<SeriesSummaryDto[]>([]);
  const [browseStats, setBrowseStats] = useState<SeasonBrowseStatsDto | null>(null);
  const [seasonsData, setSeasonsData] = useState<SeasonBrowseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track resolved entity names for display
  const [resolvedDriverName, setResolvedDriverName] = useState<string>('');
  const [resolvedCircuitName, setResolvedCircuitName] = useState<string>('');
  
  // Set breadcrumbs
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
    { label: 'Seasons', path: '/seasons', icon: '📅' },
  ]);
  
  // URL update helper
  const updateFilters = useCallback((updates: Partial<FilterState> & { page?: number }) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      const paramName = FILTER_TO_PARAM[key as keyof typeof FILTER_TO_PARAM] || key;
      if (value !== undefined && value !== '' && value !== null) {
        params.set(paramName, String(value));
      } else {
        params.delete(paramName);
      }
    });
    
    // Reset page when filters change (except page itself)
    if (!('page' in updates)) {
      params.delete('page');
    }
    
    setSearchParams(params);
  }, [searchParams, setSearchParams]);
  
  // Fetch static data (series list, stats) on mount
  useEffect(() => {
    let cancelled = false;
    
    async function fetchStaticData() {
      try {
        const [seriesData, statsData] = await Promise.all([
          seriesApi.getAllSeries(),
          seasonsApi.getBrowseStats(),
        ]);
        
        if (!cancelled) {
          setAllSeries(seriesData);
          setBrowseStats(statsData);
        }
      } catch (err) {
        console.error('Failed to fetch static data:', err);
      }
    }
    
    fetchStaticData();
    return () => { cancelled = true; };
  }, []);
  
  // Resolve driver/circuit names when slugs are in URL
  useEffect(() => {
    async function resolveEntityNames() {
      if (filters.driverSlug && !resolvedDriverName) {
        try {
          const driver = await driversApi.getDriverBySlug(filters.driverSlug);
          setResolvedDriverName(`${driver.firstName} ${driver.lastName}`);
        } catch {
          setResolvedDriverName(filters.driverSlug);
        }
      }
      if (filters.circuitSlug && !resolvedCircuitName) {
        try {
          const circuit = await circuitsApi.getCircuitBySlug(filters.circuitSlug);
          setResolvedCircuitName(circuit.name);
        } catch {
          setResolvedCircuitName(filters.circuitSlug);
        }
      }
    }
    resolveEntityNames();
  }, [filters.driverSlug, filters.circuitSlug, resolvedDriverName, resolvedCircuitName]);
  
  // Clear resolved names when slugs are cleared
  useEffect(() => {
    if (!filters.driverSlug) setResolvedDriverName('');
    if (!filters.circuitSlug) setResolvedCircuitName('');
  }, [filters.driverSlug, filters.circuitSlug]);
  
  // Fetch seasons based on current filters
  useEffect(() => {
    let cancelled = false;
    
    async function fetchSeasons() {
      try {
        setIsLoading(true);
        setError(null);
        
        const [sortBy, sortOrder] = filters.sort.split('_') as ['year' | 'rounds' | 'series', 'asc' | 'desc'];
        
        const data = await seasonsApi.browse({
          series: filters.series || undefined,
          driverSlug: filters.driverSlug || undefined,
          circuitSlug: filters.circuitSlug || undefined,
          fromYear: filters.fromYear ? parseInt(filters.fromYear, 10) : undefined,
          toYear: filters.toYear ? parseInt(filters.toYear, 10) : undefined,
          status: filters.status || undefined,
          sortBy,
          sortOrder,
          page: currentPage,
          pageSize: PAGE_SIZE,
        });
        
        if (!cancelled) {
          setSeasonsData(data);
        }
      } catch (err) {
        console.error('Failed to fetch seasons:', err);
        if (!cancelled) {
          setError('Failed to load seasons. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchSeasons();
    return () => { cancelled = true; };
  }, [filters.series, filters.driverSlug, filters.circuitSlug, filters.fromYear, filters.toYear, filters.status, filters.sort, currentPage]);
  
  // Group seasons for display
  const groupedSeasons = useMemo(() => {
    if (!seasonsData?.items) return null;
    
    if (filters.groupBy === 'flat') return null;
    
    const grouped: Record<string, SeasonBrowseItemDto[]> = {};
    
    for (const season of seasonsData.items) {
      const key = filters.groupBy === 'year' 
        ? season.year.toString()
        : season.seriesSlug;
        
      if (!(key in grouped)) {
        grouped[key] = [];
      }
      grouped[key]!.push(season);
    }
    
    return grouped;
  }, [seasonsData, filters.groupBy]);
  
  // Check if we have active entity filters
  const hasActiveFilters = filters.series || filters.driverSlug || filters.circuitSlug || filters.fromYear || filters.toYear || filters.status;
  
  // Get series color for active filter badge
  const activeSeriesColor = filters.series 
    ? (allSeries.find(s => s.slug === filters.series)?.brandColors[0] || getSeriesColors(filters.series)[0])
    : undefined;
  
  // Build page title based on active filters
  const pageTitle = useMemo(() => {
    const parts: string[] = [];
    
    if (filters.driverSlug && resolvedDriverName) {
      parts.push(`${resolvedDriverName}'s`);
    }
    if (filters.circuitSlug && resolvedCircuitName) {
      parts.push(`@ ${resolvedCircuitName}`);
    }
    
    if (parts.length > 0) {
      return `Seasons ${parts.join(' ')}`;
    }
    
    if (filters.series) {
      const seriesName = allSeries.find(s => s.slug === filters.series)?.name || filters.series;
      return `${seriesName} Seasons`;
    }
    
    return 'Season Browser';
  }, [filters.series, filters.driverSlug, filters.circuitSlug, resolvedDriverName, resolvedCircuitName, allSeries]);
  
  const pageSubtitle = useMemo(() => {
    if (filters.driverSlug || filters.circuitSlug) {
      return 'Explore seasons featuring your selection';
    }
    return 'Explore racing seasons across all series';
  }, [filters.driverSlug, filters.circuitSlug]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="📅"
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      
      {/* Toolbar: View mode + Quick stats */}
      <Section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <ViewModeSwitch 
              mode={filters.viewMode} 
              onChange={(mode) => updateFilters({ viewMode: mode })}
            />
            {browseStats && (
              <div className="hidden sm:flex items-center gap-4 text-sm text-neutral-500">
                <span><span className="text-neutral-200 font-medium">{browseStats.totalSeasons}</span> seasons</span>
                {browseStats.currentSeasons > 0 && (
                  <span><span className="text-pf-green font-medium">{browseStats.currentSeasons}</span> live</span>
                )}
              </div>
            )}
          </div>
          
          {filters.viewMode === 'power' && (
            <GroupModeSwitch 
              mode={filters.groupBy} 
              onChange={(mode) => updateFilters({ groupBy: mode })}
            />
          )}
        </div>
        
        {/* Series Filter Chips */}
        {allSeries.length > 0 ? (
          <SeriesChipFilter
            series={allSeries}
            selected={filters.series}
            onChange={(slug) => updateFilters({ series: slug })}
          />
        ) : (
          <FilterBarSkeleton />
        )}
      </Section>
      
      {/* Power Mode: Advanced Filters */}
      {filters.viewMode === 'power' && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Driver Filter */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Featuring Driver</label>
              <EntitySearchInput
                type="driver"
                value={filters.driverSlug}
                onChange={(slug) => updateFilters({ driverSlug: slug })}
                placeholder="Search driver..."
              />
            </div>
            
            {/* Circuit Filter */}
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">At Circuit</label>
              <EntitySearchInput
                type="circuit"
                value={filters.circuitSlug}
                onChange={(slug) => updateFilters({ circuitSlug: slug })}
                placeholder="Search circuit..."
              />
            </div>
            
            {/* Year Range */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 mb-1.5">From Year</label>
                <select
                  value={filters.fromYear}
                  onChange={(e) => updateFilters({ fromYear: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900/80 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-pf-green/50"
                >
                  <option value="">Any</option>
                  {browseStats?.availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 mb-1.5">To Year</label>
                <select
                  value={filters.toYear}
                  onChange={(e) => updateFilters({ toYear: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900/80 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-pf-green/50"
                >
                  <option value="">Any</option>
                  {browseStats?.availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Status + Sort */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value as StatusFilter })}
                  className="w-full px-3 py-2 bg-neutral-900/80 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-pf-green/50"
                >
                  <option value="">All</option>
                  <option value="current">🟢 Current</option>
                  <option value="completed">✓ Completed</option>
                  <option value="upcoming">📅 Upcoming</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-neutral-500 mb-1.5">Sort</label>
                <select
                  value={filters.sort}
                  onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
                  className="w-full px-3 py-2 bg-neutral-900/80 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-pf-green/50"
                >
                  <option value="year_desc">Year (Newest)</option>
                  <option value="year_asc">Year (Oldest)</option>
                  <option value="rounds_desc">Most Rounds</option>
                  <option value="rounds_asc">Fewest Rounds</option>
                  <option value="series_asc">Series (A-Z)</option>
                  <option value="series_desc">Series (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
        </Section>
      )}
      
      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <Section>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">Active filters:</span>
            
            {filters.series && (
              <ActiveFilterBadge
                label="Series"
                value={allSeries.find(s => s.slug === filters.series)?.name || filters.series}
                onClear={() => updateFilters({ series: '' })}
                color={activeSeriesColor}
              />
            )}
            
            {filters.driverSlug && (
              <ActiveFilterBadge
                label="Driver"
                value={resolvedDriverName || filters.driverSlug}
                onClear={() => updateFilters({ driverSlug: '' })}
              />
            )}
            
            {filters.circuitSlug && (
              <ActiveFilterBadge
                label="Circuit"
                value={resolvedCircuitName || filters.circuitSlug}
                onClear={() => updateFilters({ circuitSlug: '' })}
              />
            )}
            
            {filters.fromYear && (
              <ActiveFilterBadge
                label="From"
                value={filters.fromYear}
                onClear={() => updateFilters({ fromYear: '' })}
              />
            )}
            
            {filters.toYear && (
              <ActiveFilterBadge
                label="To"
                value={filters.toYear}
                onClear={() => updateFilters({ toYear: '' })}
              />
            )}
            
            {filters.status && (
              <ActiveFilterBadge
                label="Status"
                value={filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                onClear={() => updateFilters({ status: '' })}
              />
            )}
            
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors ml-2"
            >
              Clear all
            </button>
          </div>
        </Section>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <Section>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SeasonCardSkeleton key={i} />
            ))}
          </div>
        </Section>
      )}
      
      {/* Error State */}
      {error && !isLoading && (
        <EmptyState
          icon="⚠️"
          title="Error loading seasons"
          description={error}
          action={
            <button 
              onClick={() => window.location.reload()}
              className="text-pf-green hover:underline"
            >
              Try again
            </button>
          }
        />
      )}
      
      {/* Results */}
      {!isLoading && !error && seasonsData && (
        <>
          {seasonsData.items.length > 0 ? (
            <>
              {/* Result count */}
              <div className="px-6 mb-4 text-sm text-neutral-500">
                <span className="text-neutral-200 font-medium">{seasonsData.totalCount.toLocaleString()}</span>
                {' '}season{seasonsData.totalCount !== 1 ? 's' : ''} found
              </div>
              
              {/* Grouped or Flat display */}
              {groupedSeasons && filters.groupBy !== 'flat' ? (
                // Grouped view
                Object.entries(groupedSeasons).map(([key, seasons]) => {
                  const sectionTitle = filters.groupBy === 'year' 
                    ? key 
                    : allSeries.find(s => s.slug === key)?.name || key;
                    
                  const sectionColor = filters.groupBy === 'series'
                    ? (allSeries.find(s => s.slug === key)?.brandColors[0] || getSeriesColors(key)[0])
                    : undefined;
                  
                  return (
                    <Section 
                      key={key}
                      title={sectionTitle}
                      subtitle={`${seasons.length} season${seasons.length !== 1 ? 's' : ''}`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {seasons.map(season => (
                          <SeasonCard 
                            key={season.id} 
                            season={season}
                            showSeriesName={filters.groupBy !== 'series'}
                          />
                        ))}
                      </div>
                      {sectionColor && (
                        <div 
                          className="mt-4 h-0.5 rounded-full opacity-20"
                          style={{ backgroundColor: sectionColor }}
                        />
                      )}
                    </Section>
                  );
                })
              ) : (
                // Flat view
                <Section>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {seasonsData.items.map(season => (
                      <SeasonCard key={season.id} season={season} />
                    ))}
                  </div>
                </Section>
              )}
              
              {/* Pagination */}
              {seasonsData.totalCount > PAGE_SIZE && (
                <div className="px-6 py-4">
                  <Pagination
                    currentPage={currentPage}
                    totalCount={seasonsData.totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => updateFilters({ page })}
                    itemLabel="seasons"
                  />
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="📅"
              title="No seasons found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters to see more seasons."
                  : "Season data will be available soon."
              }
              action={
                hasActiveFilters ? (
                  <button
                    onClick={() => setSearchParams(new URLSearchParams())}
                    className="text-pf-green hover:underline"
                  >
                    Clear all filters
                  </button>
                ) : undefined
              }
            />
          )}
        </>
      )}
    </MainLayout>
  );
}
