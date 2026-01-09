import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSeasonBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seriesApi } from '../../services/seriesService';
import type { SeasonDetailDto, RoundSummaryForSeasonDto } from '../../types/series';
import { getSeriesColors, getContrastColor } from '../../types/series';

// =========================
// Loading Skeleton
// =========================

function RoundCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="h-4 bg-neutral-800 rounded w-16" />
        <div className="h-5 bg-neutral-800 rounded w-20" />
      </div>
      <div className="h-6 bg-neutral-800 rounded w-3/4 mb-2" />
      <div className="h-4 bg-neutral-800 rounded w-full mb-2" />
      <div className="h-4 bg-neutral-800 rounded w-1/2" />
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
// Stats Card Component
// =========================

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: string;
  primaryColor?: string;
}

function StatsCard({ label, value, icon, primaryColor }: StatsCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p 
            className="text-2xl font-bold"
            style={primaryColor ? { color: primaryColor } : { color: '#e5e5e5' }}
          >
            {value}
          </p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =========================
// Round Card Component
// =========================

interface RoundCardProps {
  seriesSlug: string;
  seriesName: string;
  year: number;
  round: RoundSummaryForSeasonDto;
  primaryColor?: string;
}

/**
 * Clean up round name by removing series prefix and year suffix.
 * e.g., "FORMULA 1 ROLEX AUSTRALIAN GRAND PRIX 2023" -> "Rolex Australian Grand Prix"
 */
function cleanRoundName(name: string, seriesName: string, year: number): string {

  let cleaned = name;
  
  //  // Remove common series prefixes (case-insensitive)
  const prefixes = [
    `${seriesName} `,
    'FORMULA 1 ',
    'FORMULA ONE ',
    'F1 ',
    'MOTOGP ',
    'MOTO GP ',
    'WEC ',
    'INDYCAR ',
  ];
  
  for (const prefix of prefixes) {
  if (cleaned.toUpperCase().startsWith(prefix.toUpperCase())) {
      cleaned = cleaned.slice(prefix.length);
      break;
    }
  }
  
  // Remove year suffix (e.g., " 2023" at the end)
  const yearSuffix = ` ${year}`;
  if (cleaned.endsWith(yearSuffix)) {
    cleaned = cleaned.slice(0, -yearSuffix.length);
  }
  
  // Convert to title case if all uppercase
  if (cleaned === cleaned.toUpperCase()) {
    cleaned = cleaned.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  
  return cleaned.trim();
}

function RoundCard({ seriesSlug, seriesName, year, round, primaryColor }: RoundCardProps) {
  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // If same month, show: "Jul 5-7, 2024"
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startStr.split(' ')[0]} ${startDate.getDate()}-${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
    // Different months: "Jun 30 - Jul 2, 2024"
    return `${startStr} - ${endStr}`;
  };
  
  const displayName = cleanRoundName(round.name, seriesName, year);

  return (
    <Link
      to={ROUTES.ROUND_DETAIL(seriesSlug, year, round.slug)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-all"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-neutral-500 font-medium">
            Round {round.roundNumber}
          </span>
          {round.isCompleted ? (
            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded">
              ✓ Completed
            </span>
          ) : round.isCurrent ? (
            <span 
              className="px-2 py-0.5 text-xs rounded font-medium"
              style={{ 
                backgroundColor: primaryColor ? `${primaryColor}20` : 'rgba(74, 222, 128, 0.1)',
                color: primaryColor || '#4ade80'
              }}
            >
              🔴 Live
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-pf-green/10 text-accent-green text-xs rounded">
              Upcoming
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-neutral-100 group-hover:text-accent-green transition-colors mb-1">
          {displayName}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
          <span>🗺️</span>
          <span>{round.circuit.name}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{formatDateRange(round.dateStart, round.dateEnd)}</span>
          <span>{round.sessionCount} sessions</span>
        </div>
        
        {round.circuit.countryCode && (
          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-600">
            <span>📍</span>
            <span>{round.circuit.country}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// =========================
// Filter Indicator Component
// =========================

interface FilterIndicatorProps {
  type: 'driver' | 'team';
  slug: string;
  onClear: () => void;
  primaryColor?: string;
}

function FilterIndicator({ type, slug, onClear, primaryColor }: FilterIndicatorProps) {
  const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const icon = type === 'driver' ? '👤' : '🏎️';
  const label = type === 'driver' ? 'Driver' : 'Team';
  
  return (
    <div 
      className="mb-6 p-4 rounded-xl border flex items-center justify-between"
      style={{ 
        backgroundColor: primaryColor ? `${primaryColor}10` : 'rgba(74, 222, 128, 0.05)',
        borderColor: primaryColor ? `${primaryColor}40` : 'rgba(74, 222, 128, 0.2)'
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm text-neutral-400">Showing rounds featuring {label.toLowerCase()}</p>
          <p 
            className="font-semibold"
            style={{ color: primaryColor || '#4ade80' }}
          >
            {displayName}
          </p>
        </div>
      </div>
      <button
        onClick={onClear}
        className="px-3 py-1.5 text-sm bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors flex items-center gap-2"
      >
        <span>✕</span>
        Clear filter
      </button>
    </div>
  );
}

// =========================
// Filter Tabs
// =========================

type RoundFilter = 'all' | 'completed' | 'upcoming';

interface FilterTabsProps {
  activeFilter: RoundFilter;
  onFilterChange: (filter: RoundFilter) => void;
  counts: { all: number; completed: number; upcoming: number };
  primaryColor?: string;
}

function FilterTabs({ activeFilter, onFilterChange, counts, primaryColor }: FilterTabsProps) {
  const tabs: { id: RoundFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
  ];
  
  const activeColor = primaryColor || '#4ade80';
  const textColor = getContrastColor(activeColor);

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeFilter === tab.id
              ? ''
              : 'bg-neutral-900/50 text-neutral-400 hover:text-neutral-200'
          }`}
          style={activeFilter === tab.id ? { 
            backgroundColor: activeColor,
            color: textColor
          } : undefined}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}

// =========================
// Page Component
// =========================

/**
 * Season detail page - shows rounds/calendar for a specific season.
 * Fetches real data from the API and displays with spoiler-safe aggregates.
 * Supports filtering by driver or team via query parameters.
 */
export function SeasonDetailPage() {
  const { seriesSlug, year } = useParams<{ seriesSlug: string; year: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seasonData, setSeasonData] = useState<SeasonDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState<RoundFilter>('all');
  
  const yearNum = year ? parseInt(year, 10) : NaN;
  
  // Get filter params
  const driverFilter = searchParams.get('driver');
  const teamFilter = searchParams.get('team');
  
  // Clear entity filter
  const clearEntityFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('driver');
    newParams.delete('team');
    setSearchParams(newParams);
  };
  
  // Fetch season data
  useEffect(() => {
    if (!seriesSlug || isNaN(yearNum)) return;
    
    let cancelled = false;
    
    async function fetchSeasonDetail() {
      try {
        setIsLoading(true);
        setError(null);
        // Pass entity filters to API
        const filters = driverFilter 
          ? { driverSlug: driverFilter } 
          : teamFilter 
            ? { teamSlug: teamFilter } 
            : undefined;
        const data = await seriesApi.getSeasonByYear(seriesSlug!, yearNum, filters);
        if (!cancelled) {
          setSeasonData(data);
        }
      } catch (err) {
        console.error('Failed to fetch season:', err);
        if (!cancelled) {
          setError('Failed to load season data. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchSeasonDetail();
    
    return () => {
      cancelled = true;
    };
  }, [seriesSlug, yearNum, driverFilter, teamFilter]);
  
  // Set breadcrumbs
  useBreadcrumbs(
    seasonData && seriesSlug && !isNaN(yearNum)
      ? buildSeasonBreadcrumbs(seasonData.series.name, seriesSlug, yearNum)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
        ]
  );
  
  // Loading state
  if (isLoading) {
    return (
      <MainLayout showBreadcrumbs>
        <div className="animate-pulse mb-8">
          <div className="h-8 bg-neutral-800 rounded w-1/3 mb-2" />
          <div className="h-5 bg-neutral-800 rounded w-2/3" />
        </div>
        
        <Section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <StatsCardSkeleton key={i} />)}
          </div>
        </Section>
        
        <Section title="Race Calendar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <RoundCardSkeleton key={i} />)}
          </div>
        </Section>
      </MainLayout>
    );
  }
  
  // Error or not found state
  if (error || !seasonData || !seriesSlug || isNaN(yearNum)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Season not found"
          description={error ?? "The season you're looking for doesn't exist or isn't available yet."}
          action={
            <Link to={ROUTES.SERIES_LIST} className="text-accent-green hover:underline">
              Browse all series
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  // Get colors from API or fallback
  const colors = seasonData.series.brandColors?.length > 0 
    ? seasonData.series.brandColors 
    : getSeriesColors(seriesSlug);
  const primaryColor = colors[0];
  
  // Filter rounds
  const filteredRounds = seasonData.rounds.filter(round => {
    if (roundFilter === 'completed') return round.isCompleted;
    if (roundFilter === 'upcoming') return round.isUpcoming || round.isCurrent;
    return true;
  });
  
  const counts = {
    all: seasonData.rounds.length,
    completed: seasonData.stats.completedRounds,
    upcoming: seasonData.stats.upcomingRounds,
  };
  
  // Format date range for season
  const formatSeasonDates = (): string => {
    if (!seasonData.stats.seasonStart || !seasonData.stats.seasonEnd) return '';
    const start = new Date(seasonData.stats.seasonStart);
    const end = new Date(seasonData.stats.seasonEnd);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };
  
  return (
    <MainLayout showBreadcrumbs>
      {/* Header with color accent */}
      <div className="relative mb-8">
        <div 
          className="absolute inset-0 h-1 rounded-full" 
          style={{ backgroundColor: primaryColor }}
        />
        <div className="pt-4">
          <PageHeader
            icon={seasonData.series.logoUrl || "🏁"}
            title={`${seasonData.series.name} - ${yearNum}`}
            subtitle={formatSeasonDates()}
          />
        </div>
      </div>
      
      {/* Season Stats */}
      <Section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard 
            icon="🏎️" 
            label="Total Rounds" 
            value={seasonData.stats.totalRounds}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="✅" 
            label="Completed" 
            value={seasonData.stats.completedRounds}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="⏳" 
            label="Upcoming" 
            value={seasonData.stats.upcomingRounds}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="📺" 
            label="Total Sessions" 
            value={seasonData.stats.totalSessions}
            primaryColor={primaryColor}
          />
        </div>
      </Section>
      
      {/* Race Calendar */}
      <Section title="Race Calendar">
        {/* Entity filter indicator */}
        {driverFilter && (
          <FilterIndicator
            type="driver"
            slug={driverFilter}
            onClear={clearEntityFilter}
            primaryColor={primaryColor}
          />
        )}
        {teamFilter && !driverFilter && (
          <FilterIndicator
            type="team"
            slug={teamFilter}
            onClear={clearEntityFilter}
            primaryColor={primaryColor}
          />
        )}
        
        <FilterTabs 
          activeFilter={roundFilter}
          onFilterChange={setRoundFilter}
          counts={counts}
          primaryColor={primaryColor}
        />
        
        {filteredRounds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRounds.map((round) => (
              <RoundCard 
                key={round.id}
                seriesSlug={seriesSlug}
                seriesName={seasonData.series.name}
                year={yearNum} 
                round={round}
                primaryColor={primaryColor}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title={roundFilter === 'completed' ? 'No completed rounds yet' : 'No upcoming rounds'}
            description={
              roundFilter === 'completed' 
                ? 'Check back after races have been completed.'
                : 'The calendar for this season may not be announced yet.'
            }
            action={
              roundFilter !== 'all' ? (
                <button
                  onClick={() => setRoundFilter('all')}
                  className="text-accent-green hover:underline"
                >
                  View all rounds
                </button>
              ) : undefined
            }
          />
        )}
      </Section>
      
      {/* Quick navigation to series */}
      <Section>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center py-6">
          <Link 
            to={ROUTES.SERIES_DETAIL(seriesSlug)}
            className="text-neutral-400 hover:text-accent-green transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {seasonData.series.name}
          </Link>
          
          {/* Adjacent season navigation */}
          <div className="flex gap-4">
            <Link 
              to={ROUTES.SEASON_DETAIL(seriesSlug, yearNum - 1)}
              className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 transition-all text-sm"
            >
              ← {yearNum - 1}
            </Link>
            <Link 
              to={ROUTES.SEASON_DETAIL(seriesSlug, yearNum + 1)}
              className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 transition-all text-sm"
            >
              {yearNum + 1} →
            </Link>
          </div>
        </div>
      </Section>
    </MainLayout>
  );
}
