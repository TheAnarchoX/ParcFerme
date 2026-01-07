import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seriesApi } from '../../services/seriesService';
import type { SeriesSummaryDto, SeasonSummaryDto } from '../../types/series';
import { getSeriesColors, getContrastColor } from '../../types/series';

// =========================
// Loading Skeletons
// =========================

function SeasonCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden animate-pulse">
      <div className="h-1 bg-neutral-700" />
      <div className="p-4">
        <div className="h-6 bg-neutral-800 rounded w-16 mb-2" />
        <div className="h-4 bg-neutral-800 rounded w-24 mb-2" />
        <div className="flex gap-2">
          <div className="h-4 bg-neutral-800 rounded w-20" />
          <div className="h-4 bg-neutral-800 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="flex gap-2 mb-6">
      <div className="h-10 bg-neutral-800 rounded-lg w-20 animate-pulse" />
      <div className="h-10 bg-neutral-800 rounded-lg w-24 animate-pulse" />
      <div className="h-10 bg-neutral-800 rounded-lg w-24 animate-pulse" />
    </div>
  );
}

// =========================
// Season Card Component
// =========================

interface SeasonCardProps {
  season: SeasonSummaryDto;
  seriesColor?: string;
}

function SeasonCard({ season, seriesColor }: SeasonCardProps) {
  const color = seriesColor || getSeriesColors(season.seriesSlug)[0];
  
  return (
    <Link
      to={ROUTES.SEASON_DETAIL(season.seriesSlug, season.year)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-all"
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: color }} />
      
      <div className="p-4">
        {/* Year and badges */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-neutral-100 group-hover:text-accent-green transition-colors">
            {season.year}
          </h3>
          <div className="flex gap-1">
            {season.isCurrent && (
              <span 
                className="px-2 py-0.5 text-xs rounded font-medium"
                style={{ 
                  backgroundColor: `${color}20`,
                  color: color
                }}
              >
                Current
              </span>
            )}
            {season.isCompleted && (
              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded">
                ✓
              </span>
            )}
          </div>
        </div>
        
        {/* Series name */}
        <p className="text-sm text-neutral-400 mb-2">
          {season.seriesName}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>
            <span className="font-bold" style={{ color }}>{season.roundCount}</span> rounds
          </span>
        </div>
      </div>
    </Link>
  );
}

// =========================
// Series Filter Component
// =========================

interface SeriesFilterProps {
  allSeries: SeriesSummaryDto[];
  selectedSeries: string | null;
  onSelectSeries: (slug: string | null) => void;
}

function SeriesFilter({ allSeries, selectedSeries, onSelectSeries }: SeriesFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelectSeries(null)}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
          selectedSeries === null
            ? 'bg-accent-green text-black'
            : 'bg-neutral-900/50 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
        }`}
      >
        All Series
      </button>
      {allSeries.map(series => {
        const colors = series.brandColors?.length > 0 
          ? series.brandColors 
          : getSeriesColors(series.slug);
        const primaryColor = colors[0];
        const isSelected = selectedSeries === series.slug;
        const textColor = primaryColor ? getContrastColor(primaryColor) : '#000000';
        
        return (
          <button
            key={series.id}
            onClick={() => onSelectSeries(series.slug)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
              isSelected
                ? ''
                : 'bg-neutral-900/50 text-neutral-400 hover:text-neutral-200 border-neutral-800'
            }`}
            style={isSelected ? { 
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              color: textColor
            } : undefined}
          >
            {series.name}
          </button>
        );
      })}
    </div>
  );
}

// =========================
// Year Range Filter
// =========================

interface YearFilterProps {
  fromYear: number | null;
  toYear: number | null;
  minYear: number;
  maxYear: number;
  onFromYearChange: (year: number | null) => void;
  onToYearChange: (year: number | null) => void;
}

function YearFilter({ fromYear, toYear, minYear, maxYear, onFromYearChange, onToYearChange }: YearFilterProps) {
  const years = useMemo(() => {
    const arr = [];
    for (let y = maxYear; y >= minYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [minYear, maxYear]);

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-400">From:</label>
        <select
          value={fromYear ?? ''}
          onChange={(e) => onFromYearChange(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-accent-green focus:outline-none"
        >
          <option value="">Any</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-400">To:</label>
        <select
          value={toYear ?? ''}
          onChange={(e) => onToYearChange(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-accent-green focus:outline-none"
        >
          <option value="">Any</option>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      
      {(fromYear || toYear) && (
        <button
          onClick={() => {
            onFromYearChange(null);
            onToYearChange(null);
          }}
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// =========================
// Page Component
// =========================

/**
 * Seasons browser page - allows filtering and browsing seasons across all series.
 */
export function SeasonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allSeries, setAllSeries] = useState<SeriesSummaryDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state from URL params
  const selectedSeries = searchParams.get('series');
  const fromYear = searchParams.get('from') ? parseInt(searchParams.get('from')!, 10) : null;
  const toYear = searchParams.get('to') ? parseInt(searchParams.get('to')!, 10) : null;
  
  // Set breadcrumbs
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
    { label: 'Seasons', path: '/seasons', icon: '📅' },
  ]);
  
  // Update URL params
  const updateFilters = (updates: { series?: string | null; from?: number | null; to?: number | null }) => {
    const newParams = new URLSearchParams(searchParams);
    
    if ('series' in updates) {
      if (updates.series) {
        newParams.set('series', updates.series);
      } else {
        newParams.delete('series');
      }
    }
    
    if ('from' in updates) {
      if (updates.from) {
        newParams.set('from', updates.from.toString());
      } else {
        newParams.delete('from');
      }
    }
    
    if ('to' in updates) {
      if (updates.to) {
        newParams.set('to', updates.to.toString());
      } else {
        newParams.delete('to');
      }
    }
    
    setSearchParams(newParams);
  };
  
  // Fetch all series on mount
  useEffect(() => {
    let cancelled = false;
    
    async function fetchAllSeries() {
      try {
        const data = await seriesApi.getAllSeries();
        if (!cancelled) {
          setAllSeries(data);
        }
      } catch (err) {
        console.error('Failed to fetch series:', err);
      }
    }
    
    fetchAllSeries();
    
    return () => { cancelled = true; };
  }, []);
  
  // Fetch seasons based on filters
  useEffect(() => {
    let cancelled = false;
    
    async function fetchSeasons() {
      try {
        setIsLoading(true);
        setError(null);
        
        if (selectedSeries) {
          // Fetch seasons for specific series
          const data = await seriesApi.getSeasonsBySeriesSlug(selectedSeries, {
            fromYear: fromYear ?? undefined,
            toYear: toYear ?? undefined,
          });
          if (!cancelled) {
            setSeasons(data);
          }
        } else {
          // Fetch all seasons from all series
          const allSeasons: SeasonSummaryDto[] = [];
          
          // If we have series data, fetch seasons for each
          if (allSeries.length > 0) {
            const promises = allSeries.map(series => 
              seriesApi.getSeasonsBySeriesSlug(series.slug, {
                fromYear: fromYear ?? undefined,
                toYear: toYear ?? undefined,
              })
            );
            
            const results = await Promise.all(promises);
            results.forEach(seasonList => allSeasons.push(...seasonList));
            
            // Sort by year descending
            allSeasons.sort((a, b) => b.year - a.year);
          }
          
          if (!cancelled) {
            setSeasons(allSeasons);
          }
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
    
    // Only fetch seasons once we have series data (or are filtering by specific series)
    if (allSeries.length > 0 || selectedSeries) {
      fetchSeasons();
    }
    
    return () => { cancelled = true; };
  }, [allSeries, selectedSeries, fromYear, toYear]);
  
  // Calculate year range for filter
  const yearRange = useMemo(() => {
    if (seasons.length === 0) {
      const currentYear = new Date().getFullYear();
      return { min: currentYear - 10, max: currentYear };
    }
    const years = seasons.map(s => s.year);
    return { 
      min: Math.min(...years), 
      max: Math.max(...years) 
    };
  }, [seasons]);
  
  // Group seasons by series for display
  const seasonsBySeriesForDisplay = useMemo(() => {
    if (selectedSeries) return null; // Don't group when filtering by series
    
    const grouped: Record<string, SeasonSummaryDto[]> = {};
    for (const season of seasons) {
      const slug = season.seriesSlug;
      if (!(slug in grouped)) {
        grouped[slug] = [];
      }
      grouped[slug]!.push(season);
    }
    return grouped;
  }, [seasons, selectedSeries]);
  
  // Get series color mapping
  const seriesColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const series of allSeries) {
      const color = series.brandColors?.length > 0 
        ? series.brandColors[0] 
        : getSeriesColors(series.slug)[0];
      if (color) {
        colors[series.slug] = color;
      }
    }
    return colors;
  }, [allSeries]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="📅"
        title="Season Browser"
        subtitle="Explore racing seasons across all series"
      />
      
      <Section>
        {/* Series Filter */}
        {allSeries.length > 0 ? (
          <SeriesFilter
            allSeries={allSeries}
            selectedSeries={selectedSeries}
            onSelectSeries={(slug) => updateFilters({ series: slug })}
          />
        ) : (
          <FilterSkeleton />
        )}
        
        {/* Year Filter */}
        {!isLoading && seasons.length > 0 && (
          <YearFilter
            fromYear={fromYear}
            toYear={toYear}
            minYear={yearRange.min}
            maxYear={yearRange.max}
            onFromYearChange={(year) => updateFilters({ from: year })}
            onToYearChange={(year) => updateFilters({ to: year })}
          />
        )}
      </Section>
      
      {/* Loading state */}
      {isLoading && (
        <Section title={selectedSeries ? `${allSeries.find(s => s.slug === selectedSeries)?.name || 'Loading...'} Seasons` : 'All Seasons'}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SeasonCardSkeleton key={i} />)}
          </div>
        </Section>
      )}
      
      {/* Error state */}
      {error && !isLoading && (
        <EmptyState
          icon="⚠️"
          title="Error loading seasons"
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
      )}
      
      {/* Results */}
      {!isLoading && !error && (
        <>
          {seasons.length > 0 ? (
            selectedSeries ? (
              // Single series view
              <Section 
                title={`${allSeries.find(s => s.slug === selectedSeries)?.name || selectedSeries} Seasons`}
                subtitle={`${seasons.length} season${seasons.length !== 1 ? 's' : ''}`}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {seasons.map(season => (
                    <SeasonCard 
                      key={season.id} 
                      season={season}
                      seriesColor={seriesColors[season.seriesSlug]}
                    />
                  ))}
                </div>
              </Section>
            ) : (
              // Grouped by series view
              <>
                {seasonsBySeriesForDisplay && Object.entries(seasonsBySeriesForDisplay).map(([seriesSlug, seriesSeasons]) => {
                  const seriesInfo = allSeries.find(s => s.slug === seriesSlug);
                  return (
                    <Section 
                      key={seriesSlug}
                      title={seriesInfo?.name || seriesSlug}
                      subtitle={`${seriesSeasons.length} season${seriesSeasons.length !== 1 ? 's' : ''}`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {seriesSeasons.map(season => (
                          <SeasonCard 
                            key={season.id} 
                            season={season}
                            seriesColor={seriesColors[season.seriesSlug]}
                          />
                        ))}
                      </div>
                    </Section>
                  );
                })}
              </>
            )
          ) : (
            <EmptyState
              icon="📅"
              title="No seasons found"
              description={
                selectedSeries || fromYear || toYear
                  ? "Try adjusting your filters to see more seasons."
                  : "Season data will be available soon."
              }
              action={
                (selectedSeries || fromYear || toYear) ? (
                  <button
                    onClick={() => setSearchParams(new URLSearchParams())}
                    className="text-accent-green hover:underline"
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
