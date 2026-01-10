import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { seriesApi } from '../../services/seriesService';
import type { SeriesSummaryDto } from '../../types/series';
import { getSeriesColors } from '../../types/series';

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
  
  // Use brandColors from API if available, otherwise fall back to local mapping
  const colors = series.brandColors?.length > 0 
    ? series.brandColors 
    : getSeriesColors(series.slug);
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

  // Generate border gradient background
  const getBorderGradient = (): string => {
    if (colors.length === 1) {
      return primaryColor ?? '#ffffff';
    }
    const gradient = colors.map((c, i) => 
      `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`
    ).join(', ');
    return `linear-gradient(to right, ${gradient})`;
  };
  
  return (
    <Link
      to={ROUTES.SERIES_DETAIL(series.slug)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden transition-all hover:shadow-lg relative"
    >
      {/* Themed border overlay - only shows the border, not full background */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
        style={{ 
          background: getBorderGradient(),
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />
      
      {/* Header with color accent */}
      <div 
        className="h-2" 
        style={getHeaderStyle()}
        aria-hidden="true"
      />
      
      <div className="p-6">
        {/* Logo/Icon placeholder */}
        {series.logoUrl ? (
          <img 
            src={series.logoUrl} 
            alt={`${series.name} logo`}
            className="w-16 h-16 object-contain mb-4 bg-white rounded-lg p-2"
          />
        ) : (
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
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
            <span className="font-bold" style={{ color: primaryColor }}>{series.seasonCount}</span> seasons
          </span>
          {series.latestSeasonYear && (
            <span className="text-neutral-500">
              Latest: <span className="font-bold" style={{ color: primaryColor }}>{series.latestSeasonYear}</span>
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
  
  // Separate series with seasons from those without (coming soon)
  const validSeries = series.filter((s) => s.slug && s.name);
  const activeSeries = validSeries; // For debugging, show all series including those with 0 seasons, usually this would be: validSeries.filter((s) => s.seasonCount > 0);
  const comingSoonSeries = validSeries.filter((s) => s.seasonCount === 0);
  
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
        ) : activeSeries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {activeSeries.map((s) => (
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
      
      {/* Coming Soon Section - Series with 0 seasons */}
      {!isLoading && !error && comingSoonSeries.length > 0 && (
        <Section title="Coming Soon" subtitle="More series data will be added over time">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {comingSoonSeries.map((s) => (
              <ComingSoonCard key={s.id} series={s} />
            ))}
          </div>
        </Section>
      )}
    </MainLayout>
  );
}

// =========================
// Coming Soon Card Component
// =========================

interface ComingSoonCardProps {
  series: SeriesSummaryDto;
}

function ComingSoonCard({ series }: ComingSoonCardProps) {
  // Guard against invalid data
  if (!series.slug || !series.name) {
    return null;
  }
  
  // Use brandColors from API if available, otherwise fall back to local mapping
  const colors = series.brandColors?.length > 0 
    ? series.brandColors 
    : getSeriesColors(series.slug);
  
  const primaryColor = colors[0] ?? '#ffffff';

  // Generate header bar style based on colors
  const getHeaderStyle = (): React.CSSProperties => {
    if (colors.length === 1) {
      return { backgroundColor: colors[0] };
    }
    const gradient = colors.map((c, i) => 
      `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`
    ).join(', ');
    return { background: `linear-gradient(to right, ${gradient})` };
  };

  // Generate border gradient background
  const getBorderGradient = (): string => {
    if (colors.length === 1) {
      return primaryColor;
    }
    const gradient = colors.map((c, i) => 
      `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`
    ).join(', ');
    return `linear-gradient(to right, ${gradient})`;
  };

  return (
    <Link
      to={ROUTES.SERIES_DETAIL(series.slug)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative"
    >
      {/* Themed border overlay - only shows the border, not full background */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
        style={{ 
          background: getBorderGradient(),
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />
      
      {/* Header with color accent */}
      <div 
        className="h-1.5" 
        style={getHeaderStyle()}
        aria-hidden="true"
      />
      
      {/* Card content */}
      <div className="p-4 text-center">
        <span className="font-bold text-base" style={{ color: primaryColor }}>
          {series.name}
        </span>
      </div>
    </Link>
  );
}
