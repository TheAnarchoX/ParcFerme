import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seriesApi } from '../../services/seriesService';
import type { SeriesSummaryDto } from '../../types/series';
import { getSeriesColor } from '../../types/series';

// =========================
// Loading Skeleton
// =========================

function SeriesCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden animate-pulse">
      <div className="h-2 bg-neutral-700" />
      <div className="p-6">
        <div className="w-16 h-16 rounded-xl bg-neutral-800 mb-4" />
        <div className="h-6 bg-neutral-800 rounded w-3/4 mb-2" />
        <div className="h-4 bg-neutral-800 rounded w-full mb-4" />
        <div className="flex gap-4">
          <div className="h-4 bg-neutral-800 rounded w-20" />
          <div className="h-4 bg-neutral-800 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

// =========================
// Series Card Component
// =========================

interface SeriesCardProps {
  series: SeriesSummaryDto;
}

function SeriesCard({ series }: SeriesCardProps) {
  // Guard against invalid data
  if (!series.slug || !series.name) {
    console.warn('Invalid series data:', series);
    return null;
  }
  
  const color = getSeriesColor(series.slug);
  
  return (
    <Link
      to={ROUTES.SERIES_DETAIL(series.slug)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all hover:shadow-lg"
    >
      {/* Header with color accent */}
      <div 
        className="h-2" 
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      
      <div className="p-6">
        {/* Logo/Icon placeholder */}
        {series.logoUrl ? (
          <img 
            src={series.logoUrl} 
            alt={`${series.name} logo`}
            className="w-16 h-16 object-contain mb-4"
          />
        ) : (
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4"
            style={{ backgroundColor: `${color}20` }}
          >
            🏁
          </div>
        )}
        
        {/* Title */}
        <h3 className="text-xl font-bold text-neutral-100 group-hover:text-accent-green transition-colors mb-2">
          {series.name}
        </h3>
        
        {/* Description */}
        {series.description && (
          <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
            {series.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">
            <span className="text-neutral-300 font-medium">{series.seasonCount}</span> seasons
          </span>
          {series.latestSeasonYear && (
            <span className="text-neutral-500">
              Latest: <span className="text-neutral-300 font-medium">{series.latestSeasonYear}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Series list page - top-level entry point for browsing racing series.
 */
export function SeriesListPage() {
  const [series, setSeries] = useState<SeriesSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Set breadcrumbs
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
  ]);

  // Fetch series data
  useEffect(() => {
    let cancelled = false;
    
    async function fetchSeries() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await seriesApi.getAllSeries();
        console.log('Fetched series data:', data);
        if (!cancelled) {
          setSeries(data);
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
    
    fetchSeries();
    
    return () => {
      cancelled = true;
    };
  }, []);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏁"
        title="Racing Series"
        subtitle="Browse and discover motorsport series from around the world"
      />
      
      <Section>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <SeriesCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Error loading series"
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
        ) : series.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {series
              .filter((s) => s.slug && s.name) // Filter out invalid series
              .map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
          </div>
        ) : (
          <EmptyState
            icon="🏁"
            title="No series available"
            description="Check back later for available racing series."
          />
        )}
      </Section>
      
      {/* Coming Soon Section */}
      <Section title="Coming Soon" subtitle="More series will be added over time">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'WEC', color: '#01b9ff' },
            { name: 'IndyCar', color: '#0e56a3' },
            { name: 'MotoGP', color: '#C90909' },
            { name: 'Many More', color: '#00FF7F' }
          ].map((item) => (
            <div 
              key={item.name}
              className="group bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:border-neutral-700"
            >
              {/* Header with color accent */}
              <div 
                className="h-2" 
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              
              {/* Card content */}
              <div className="relative p-6 text-center">
                {/* Random expanding blobs that fill the card - positioned to cover entire card including top bar */}
                <div className="absolute inset-0 -top-2">
                  {/* Top-left blob */}
                  <div 
                    className="absolute -top-4 -left-4 w-20 h-20 rounded-full opacity-0 scale-0 blur-xl group-hover:opacity-100 group-hover:scale-[3] transition-all duration-500 ease-out"
                    style={{ backgroundColor: item.color }}
                  />
                  {/* Bottom-right blob */}
                  <div 
                    className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-0 scale-0 blur-xl group-hover:opacity-100 group-hover:scale-[2.5] transition-all duration-600 delay-100 ease-out"
                    style={{ backgroundColor: item.color }}
                  />
                  {/* Top-right blob */}
                  <div 
                    className="absolute -top-2 -right-6 w-16 h-16 rounded-full opacity-0 scale-0 blur-lg group-hover:opacity-90 group-hover:scale-[3.5] transition-all duration-550 delay-75 ease-out"
                    style={{ backgroundColor: item.color }}
                  />
                  {/* Bottom-left blob */}
                  <div 
                    className="absolute -bottom-6 -left-2 w-18 h-18 rounded-full opacity-0 scale-0 blur-lg group-hover:opacity-90 group-hover:scale-[4] transition-all duration-650 delay-150 ease-out"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                
                {/* Text content with subtle lift animation */}
                <span 
                  className="relative font-bold text-lg block group-hover:-translate-y-0.5 transition-all duration-500"
                >
                  <span 
                    className="transition-all duration-500 group-hover:opacity-0"
                    style={{ 
                      color: item.color,
                    }}
                  >
                    {item.name}
                  </span>
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 font-extrabold">
                    {item.name}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
