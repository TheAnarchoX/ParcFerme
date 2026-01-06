import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSeriesBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

const SERIES_INFO: Record<string, { name: string; color: string; description: string }> = {
  'f1': { 
    name: 'Formula 1', 
    color: '#E10600',
    description: 'The pinnacle of motorsport since 1950. Open-wheel racing at its finest.'
  },
  'motogp': { 
    name: 'MotoGP', 
    color: '#FF6B00',
    description: 'Premier class of motorcycle road racing since 1949.'
  },
  'wec': { 
    name: 'World Endurance Championship', 
    color: '#0066CC',
    description: 'Multi-class endurance racing including the legendary 24 Hours of Le Mans.'
  },
  'indycar': { 
    name: 'IndyCar Series', 
    color: '#1E1E1E',
    description: 'American open-wheel racing including the iconic Indianapolis 500.'
  },
};

const SEASONS_DATA = [
  { year: 2025, roundCount: 24, status: 'current' },
  { year: 2024, roundCount: 24, status: 'completed' },
  { year: 2023, roundCount: 23, status: 'completed' },
  { year: 2022, roundCount: 22, status: 'completed' },
  { year: 2021, roundCount: 22, status: 'completed' },
  { year: 2020, roundCount: 17, status: 'completed' },
];

// =========================
// Season Card Component
// =========================

interface SeasonCardProps {
  seriesSlug: string;
  season: typeof SEASONS_DATA[0];
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
        
        {season.status === 'current' && (
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
  const series = seriesSlug ? SERIES_INFO[seriesSlug] : null;
  
  // Set breadcrumbs
  useBreadcrumbs(
    series && seriesSlug
      ? buildSeriesBreadcrumbs(series.name, seriesSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
        ]
  );
  
  if (!series || !seriesSlug) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Series not found"
          description="The series you're looking for doesn't exist or isn't available yet."
          action={
            <Link to={ROUTES.SERIES_LIST} className="text-accent-green hover:underline">
              Browse all series
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏁"
        title={series.name}
        subtitle={series.description}
      />
      
      <Section title="Seasons" subtitle="Select a season to browse rounds and sessions">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SEASONS_DATA.map((season) => (
            <SeasonCard 
              key={season.year} 
              seriesSlug={seriesSlug} 
              season={season} 
            />
          ))}
        </div>
        
        {/* View all seasons link */}
        <div className="mt-6 text-center">
          <button className="text-neutral-400 hover:text-neutral-200 text-sm">
            View all seasons (1950-2019) →
          </button>
        </div>
      </Section>
    </MainLayout>
  );
}
