import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSeasonBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

const SERIES_INFO: Record<string, { name: string }> = {
  'f1': { name: 'Formula 1' },
  'motogp': { name: 'MotoGP' },
  'wec': { name: 'World Endurance Championship' },
  'indycar': { name: 'IndyCar Series' },
};

const ROUNDS_DATA = [
  { roundNumber: 1, name: 'Bahrain Grand Prix', slug: 'bahrain', circuit: 'Bahrain International Circuit', date: '2025-03-02', status: 'completed' },
  { roundNumber: 2, name: 'Saudi Arabian Grand Prix', slug: 'saudi-arabia', circuit: 'Jeddah Corniche Circuit', date: '2025-03-09', status: 'completed' },
  { roundNumber: 3, name: 'Australian Grand Prix', slug: 'australia', circuit: 'Albert Park Circuit', date: '2025-03-16', status: 'upcoming' },
  { roundNumber: 4, name: 'Japanese Grand Prix', slug: 'japan', circuit: 'Suzuka International Racing Course', date: '2025-04-06', status: 'upcoming' },
  { roundNumber: 5, name: 'Chinese Grand Prix', slug: 'china', circuit: 'Shanghai International Circuit', date: '2025-04-20', status: 'upcoming' },
  { roundNumber: 6, name: 'Miami Grand Prix', slug: 'miami', circuit: 'Miami International Autodrome', date: '2025-05-04', status: 'upcoming' },
];

// =========================
// Round Card Component
// =========================

interface RoundCardProps {
  seriesSlug: string;
  year: number;
  round: typeof ROUNDS_DATA[0];
}

function RoundCard({ seriesSlug, year, round }: RoundCardProps) {
  const isCompleted = round.status === 'completed';
  
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
          {isCompleted ? (
            <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded">
              ✓ Completed
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-pf-green/10 text-accent-green text-xs rounded">
              Upcoming
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-neutral-100 group-hover:text-accent-green transition-colors mb-1">
          {round.name}
        </h3>
        
        <p className="text-sm text-neutral-400 mb-2">
          {round.circuit}
        </p>
        
        <p className="text-xs text-neutral-500">
          {new Date(round.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Season detail page - shows rounds/calendar for a specific season.
 */
export function SeasonDetailPage() {
  const { seriesSlug, year } = useParams<{ seriesSlug: string; year: string }>();
  const series = seriesSlug ? SERIES_INFO[seriesSlug] : null;
  const yearNum = year ? parseInt(year, 10) : NaN;
  
  // Set breadcrumbs
  useBreadcrumbs(
    series && seriesSlug && !isNaN(yearNum)
      ? buildSeasonBreadcrumbs(series.name, seriesSlug, yearNum)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
        ]
  );
  
  if (!series || !seriesSlug || isNaN(yearNum)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Season not found"
          description="The season you're looking for doesn't exist."
          action={
            <Link to={ROUTES.SERIES_LIST} className="text-accent-green hover:underline">
              Browse all series
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  const completedCount = ROUNDS_DATA.filter(r => r.status === 'completed').length;
  const upcomingCount = ROUNDS_DATA.filter(r => r.status === 'upcoming').length;
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="📅"
        title={`${series.name} ${yearNum}`}
        subtitle={`${ROUNDS_DATA.length} rounds • ${completedCount} completed • ${upcomingCount} upcoming`}
      />
      
      <Section title="Race Calendar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROUNDS_DATA.map((round) => (
            <RoundCard 
              key={round.roundNumber} 
              seriesSlug={seriesSlug} 
              year={yearNum} 
              round={round} 
            />
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
