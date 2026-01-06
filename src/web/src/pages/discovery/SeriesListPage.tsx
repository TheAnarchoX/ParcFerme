import { Link } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data (until API ready)
// =========================

const SERIES_DATA = [
  {
    id: 'f1',
    name: 'Formula 1',
    slug: 'f1',
    description: 'The pinnacle of motorsport. Open-wheel racing at its finest.',
    logoUrl: null,
    seasonCount: 75,
    latestSeason: 2025,
    color: '#E10600',
  },
  {
    id: 'motogp',
    name: 'MotoGP',
    slug: 'motogp',
    description: 'Premier class of motorcycle road racing.',
    logoUrl: null,
    seasonCount: 75,
    latestSeason: 2025,
    color: '#FF6B00',
  },
  {
    id: 'wec',
    name: 'World Endurance Championship',
    slug: 'wec',
    description: 'Multi-class endurance racing including Le Mans.',
    logoUrl: null,
    seasonCount: 12,
    latestSeason: 2025,
    color: '#0066CC',
  },
  {
    id: 'indycar',
    name: 'IndyCar Series',
    slug: 'indycar',
    description: 'American open-wheel racing including the Indy 500.',
    logoUrl: null,
    seasonCount: 29,
    latestSeason: 2025,
    color: '#1E1E1E',
  },
];

// =========================
// Series Card Component
// =========================

interface SeriesCardProps {
  series: typeof SERIES_DATA[0];
}

function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link
      to={ROUTES.SERIES_DETAIL(series.slug)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-all hover:shadow-lg"
    >
      {/* Header with color accent */}
      <div 
        className="h-2" 
        style={{ backgroundColor: series.color }}
        aria-hidden="true"
      />
      
      <div className="p-6">
        {/* Logo/Icon placeholder */}
        <div 
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-4"
          style={{ backgroundColor: `${series.color}20` }}
        >
          🏁
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-neutral-100 group-hover:text-accent-green transition-colors mb-2">
          {series.name}
        </h3>
        
        {/* Description */}
        <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
          {series.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">
            <span className="text-neutral-300 font-medium">{series.seasonCount}</span> seasons
          </span>
          <span className="text-neutral-500">
            Latest: <span className="text-neutral-300 font-medium">{series.latestSeason}</span>
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
 * Series list page - top-level entry point for browsing racing series.
 */
export function SeriesListPage() {
  // Set breadcrumbs
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
  ]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏁"
        title="Racing Series"
        subtitle="Browse and discover motorsport series from around the world"
      />
      
      <Section>
        {SERIES_DATA.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {SERIES_DATA.map((series) => (
              <SeriesCard key={series.id} series={series} />
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
          {['NASCAR', 'Formula E', 'Super GT', 'DTM'].map((name) => (
            <div 
              key={name}
              className="p-4 bg-neutral-800/30 border border-neutral-800 rounded-lg text-center opacity-50"
            >
              <span className="text-2xl mb-2 block">🚧</span>
              <span className="text-sm text-neutral-400">{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
