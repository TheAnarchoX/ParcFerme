import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSeriesBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seriesApi } from '../../services/seriesService';
import type { SeriesDetailDto, SeasonSummaryDto } from '../../types/series';
import { getSeriesColor } from '../../types/series';

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
// Season Card Component
// =========================

interface SeasonCardProps {
  seriesSlug: string;
  season: SeasonSummaryDto;
}

function SeasonCard({ seriesSlug, season }: SeasonCardProps) {
  return (
    <Link
      to={ROUTES.SEASON_DETAIL(seriesSlug, season.year)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-100 group-hover:text-accent-green transition-colors">
            {season.year}
          </h3>
          <p className="text-sm text-neutral-500">
            {season.roundCount} rounds
          </p>
        </div>
        
        {season.isCurrent && (
          <span className="px-2 py-1 bg-pf-green/20 text-accent-green text-xs font-medium rounded-full">
            Current
          </span>
        )}
        
        <svg 
          className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
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
  
  const color = getSeriesColor(seriesSlug);
  
  return (
    <MainLayout showBreadcrumbs>
      {/* Series header with color accent */}
      <div className="relative mb-8">
        <div 
          className="absolute inset-0 h-1 rounded-full" 
          style={{ backgroundColor: color }}
        />
        <div className="pt-4">
          <PageHeader
            icon="🏁"
            title={seriesData.name}
            subtitle={seriesData.description}
          />
        </div>
      </div>
      
      {/* Stats Section */}
      {seriesData.stats && (
        <Section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatsCard icon="📅" label="Seasons" value={seriesData.stats.totalSeasons} />
            <StatsCard icon="🏎️" label="Rounds" value={seriesData.stats.totalRounds} />
            <StatsCard icon="📺" label="Sessions" value={seriesData.stats.totalSessions} />
            <StatsCard icon="👤" label="Drivers" value={seriesData.stats.totalDrivers} />
            <StatsCard icon="🏢" label="Teams" value={seriesData.stats.totalTeams} />
            <StatsCard icon="🗺️" label="Circuits" value={seriesData.stats.totalCircuits} />
          </div>
        </Section>
      )}
      
      {/* Seasons Section */}
      <Section title="Seasons" subtitle="Select a season to browse rounds and sessions">
        {seriesData.seasons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {seriesData.seasons.map((season) => (
              <SeasonCard 
                key={season.id} 
                seriesSlug={seriesSlug} 
                season={season} 
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
