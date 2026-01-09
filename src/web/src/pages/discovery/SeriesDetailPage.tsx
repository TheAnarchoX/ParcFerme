import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSeriesBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seriesApi } from '../../services/seriesService';
import type { SeriesDetailDto, SeasonSummaryDto } from '../../types/series';
import { getSeriesColors } from '../../types/series';

// =========================
// Loading Skeleton
// =========================

function SeasonCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-5 bg-neutral-800 rounded w-16 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-20" />
        </div>
        <div className="w-5 h-5 bg-neutral-800 rounded" />
      </div>
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
  description?: string;
  linkTo?: string;
}

function StatsCard({ label, value, icon, description, linkTo }: StatsCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="text-2xl font-bold text-neutral-100">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
        {linkTo && (
          <svg className="w-4 h-4 text-neutral-600 group-hover:text-accent-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      {description && (
        <p className="text-xs text-neutral-600 mt-2">{description}</p>
      )}
    </>
  );

  if (linkTo) {
    return (
      <Link 
        to={linkTo}
        className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 hover:bg-neutral-900/70 transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-all">
      {content}
    </div>
  );
}

// =========================
// Info Card Component
// =========================

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  icon?: string;
}

function InfoCard({ title, children, icon }: InfoCardProps) {
  return (
    <div className="bg-neutral-900/30 border border-neutral-800 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

// =========================
// Season Card Component
// =========================

interface SeasonCardProps {
  seriesSlug: string;
  season: SeasonSummaryDto;
  seriesColor: string;
}

function SeasonCard({ seriesSlug, season, seriesColor }: SeasonCardProps) {
  return (
    <Link
      to={ROUTES.SEASON_DETAIL(seriesSlug, season.year)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-all"
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: seriesColor }} />
      
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
                  backgroundColor: `${seriesColor}20`,
                  color: seriesColor
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
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>
            <span className="font-bold" style={{ color: seriesColor }}>{season.roundCount}</span> rounds
          </span>
        </div>
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Series detail page - shows seasons and info for a specific series.
 */
export function SeriesDetailPage() {
  const { seriesSlug } = useParams<{ seriesSlug: string }>();
  const [seriesData, setSeriesData] = useState<SeriesDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get series brand color (default to gray if not found)
  const seriesColor = getSeriesColors(seriesSlug)[0] ?? '#666666';
  
  // Fetch series data
  useEffect(() => {
    if (!seriesSlug) return;
    
    let cancelled = false;
    const slugToFetch = seriesSlug;
    
    async function fetchSeriesDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await seriesApi.getSeriesBySlug(slugToFetch);
        if (!cancelled) {
          setSeriesData(data);
        }
      } catch (err) {
        console.error('Failed to fetch series:', err);
        if (!cancelled) {
          setError('Failed to load series. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchSeriesDetail();
    
    return () => {
      cancelled = true;
    };
  }, [seriesSlug]);
  
  // Set breadcrumbs
  useBreadcrumbs(
    seriesData && seriesSlug
      ? buildSeriesBreadcrumbs(seriesData.name, seriesSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
        ]
  );
  
  // Loading state
  if (isLoading) {
    return (
      <MainLayout showBreadcrumbs>
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-800 rounded w-1/3 mb-2" />
          <div className="h-5 bg-neutral-800 rounded w-2/3 mb-8" />
        </div>
        <Section title="Seasons">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SeasonCardSkeleton key={i} />
            ))}
          </div>
        </Section>
      </MainLayout>
    );
  }
  
  // Error or not found state
  if (error || !seriesData || !seriesSlug) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Series not found"
          description={error ?? "The series you're looking for doesn't exist or isn't available yet."}
          action={
            <Link to={ROUTES.SERIES_LIST} className="text-accent-green hover:underline">
              Browse all series
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  // At this point, seriesSlug is guaranteed to be defined
  const slug = seriesSlug;
  
  // Use brandColors from API if available, otherwise fall back to local mapping
  const colors = seriesData.brandColors?.length > 0 
    ? seriesData.brandColors 
    : getSeriesColors(slug);
  const primaryColor = colors[0];
  
  // Generate header style - gradient for multi-color, solid for single
  const getHeaderStyle = (): React.CSSProperties => {
    if (colors.length === 1) {
      return { backgroundColor: primaryColor };
    }
    const gradient = colors.map((c, i) => 
      `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`
    ).join(', ');
    return { background: `linear-gradient(to right, ${gradient})` };
  };
  
  // Calculate additional insights
  const currentSeason = seriesData.seasons.find(s => s.isCurrent);
  const completedSeasons = seriesData.seasons.filter(s => s.isCompleted).length;
  const avgRoundsPerSeason = seriesData.stats.totalSeasons > 0 
    ? Math.round(seriesData.stats.totalRounds / seriesData.stats.totalSeasons) 
    : 0;
  const avgSessionsPerRound = seriesData.stats.totalRounds > 0
    ? (seriesData.stats.totalSessions / seriesData.stats.totalRounds).toFixed(1)
    : 0;
  
  return (
    <MainLayout showBreadcrumbs>
      {/* Series header with color accent */}
      <div className="relative mb-8">
        <div 
          className="absolute inset-0 h-1 rounded-full" 
          style={getHeaderStyle()}
        />
        <div className="pt-4">
          <PageHeader
            icon={seriesData.logoUrl || "🏁"}
            title={seriesData.name}
          />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left column: Stats and info (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Stats */}
          {seriesData.stats && (
            <div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-4">Championship Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatsCard 
                  icon="📅" 
                  label="Seasons" 
                  value={seriesData.stats.totalSeasons}
                  description={`${completedSeasons} completed`}
                />
                <StatsCard 
                  icon="🏎️" 
                  label="Rounds" 
                  value={seriesData.stats.totalRounds}
                  description={`Avg ${avgRoundsPerSeason} per season`}
                />
                <StatsCard 
                  icon="📺" 
                  label="Sessions" 
                  value={seriesData.stats.totalSessions}
                  description={`Avg ${avgSessionsPerRound} per round`}
                />
                <StatsCard 
                  icon="👤" 
                  label="Drivers" 
                  value={seriesData.stats.totalDrivers}
                  description="All-time participants"
                  linkTo={ROUTES.DRIVERS_FILTERED(slug)}
                />
                <StatsCard 
                  icon="🏢" 
                  label="Teams" 
                  value={seriesData.stats.totalTeams}
                  description="Constructor entries"
                  linkTo={ROUTES.TEAMS_FILTERED(slug)}
                />
                <StatsCard 
                  icon="🗺️" 
                  label="Circuits" 
                  value={seriesData.stats.totalCircuits}
                  description="Unique venues"
                  linkTo={ROUTES.CIRCUITS_FILTERED(slug)}
                />
              </div>
            </div>
          )}

          {/* Season Timeline/History Preview */}
          {seriesData.seasons.length > 0 && (
            <InfoCard title="Season History" icon="📊">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">First Season:</span>
                  <span className="text-neutral-100 font-medium">
                    {Math.min(...seriesData.seasons.map(s => s.year))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">Latest Season:</span>
                  <span className="text-neutral-100 font-medium">
                    {Math.max(...seriesData.seasons.map(s => s.year))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">Active Seasons:</span>
                  <span className="text-neutral-100 font-medium">
                    {seriesData.seasons.filter(s => !s.isCompleted).length}
                  </span>
                </div>
                {currentSeason && (
                  <div className="pt-2 mt-2 border-t border-neutral-800">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">Current Season:</span>
                      <Link 
                        to={ROUTES.SEASON_DETAIL(slug, currentSeason.year)}
                        className="hover:underline font-medium flex items-center gap-1"
                        style={{ color: seriesColor }}
                      >
                        {currentSeason.year}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-neutral-500 text-xs">Rounds this season:</span>
                      <span className="text-neutral-400 text-xs">{currentSeason.roundCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>
          )}
        </div>

        {/* Right column: Quick info (1/3 width on large screens) */}
        <div className="space-y-6">
        <h2 className="text-lg font-semibold text-neutral-100 mb-4">Information</h2>

          {seriesData.description && (
            <InfoCard title="About" icon="ℹ️">
              <p className="text-sm text-neutral-300 leading-relaxed">
                {seriesData.description}
              </p>
            </InfoCard>
          )}

          <InfoCard title="Quick Facts" icon="⚡">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Format:</span>
                <span className="text-neutral-100">
                  {avgSessionsPerRound} sessions/round
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Calendar:</span>
                <span className="text-neutral-100">
                  ~{avgRoundsPerSeason} rounds/year
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Grid Size:</span>
                <span className="text-neutral-100">
                  {seriesData.stats.totalTeams > 0 ? `${seriesData.stats.totalTeams} teams` : 'Varies'}
                </span>
              </div>
            </div>
          </InfoCard>

          {/* Color indicator */}
          <InfoCard title={colors.length > 1 ? "Brand Colors" : "Brand Color"} icon="🎨">
            <div className="space-y-3">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border border-neutral-700" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1">
                    {colors.length > 1 && (
                      <p className="text-xs text-neutral-500 mb-0.5">
                        {index === 0 ? 'Primary' : `Accent ${index}`}
                      </p>
                    )}
                    <p className="text-sm text-neutral-300 font-mono">{color}</p>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        </div>
      </div>
      
      {/* Seasons Section */}
      <Section title="All Seasons" subtitle="Browse championship seasons by year">
        {seriesData.seasons.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {seriesData.seasons.map((season) => (
              <SeasonCard 
                key={season.id} 
                seriesSlug={slug} 
                season={season}
                seriesColor={seriesColor}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title="No seasons available"
            description="Season data will be available soon."
          />
        )}
      </Section>
    </MainLayout>
  );
}
