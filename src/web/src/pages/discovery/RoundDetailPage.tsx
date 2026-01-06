import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildRoundBreadcrumbs } from '../../components/navigation/Breadcrumbs';
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

const ROUND_INFO: Record<string, { name: string; circuit: string; country: string }> = {
  'bahrain': { name: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', country: 'Bahrain' },
  'saudi-arabia': { name: 'Saudi Arabian Grand Prix', circuit: 'Jeddah Corniche Circuit', country: 'Saudi Arabia' },
  'australia': { name: 'Australian Grand Prix', circuit: 'Albert Park Circuit', country: 'Australia' },
  'japan': { name: 'Japanese Grand Prix', circuit: 'Suzuka International Racing Course', country: 'Japan' },
};

const SESSIONS_DATA = [
  { type: 'FP1', name: 'Free Practice 1', date: '2025-03-07', time: '11:30', status: 'completed' },
  { type: 'FP2', name: 'Free Practice 2', date: '2025-03-07', time: '15:00', status: 'completed' },
  { type: 'FP3', name: 'Free Practice 3', date: '2025-03-08', time: '12:30', status: 'completed' },
  { type: 'Qualifying', name: 'Qualifying', date: '2025-03-08', time: '16:00', status: 'completed' },
  { type: 'Race', name: 'Race', date: '2025-03-09', time: '17:00', status: 'completed' },
];

// =========================
// Session Card Component
// =========================

interface SessionCardProps {
  seriesSlug: string;
  year: number;
  roundSlug: string;
  session: typeof SESSIONS_DATA[0];
}

function SessionCard({ seriesSlug, year, roundSlug, session }: SessionCardProps) {
  const isRace = session.type === 'Race' || session.type === 'Sprint';
  
  return (
    <Link
      to={ROUTES.SESSION_DETAIL(seriesSlug, year, roundSlug, session.type)}
      className={`
        group block border rounded-lg overflow-hidden transition-all
        ${isRace 
          ? 'bg-pf-green/5 border-pf-green/20 hover:border-pf-green/40' 
          : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${isRace ? 'text-accent-green' : 'text-neutral-500'}`}>
            {session.type}
          </span>
          <span className="text-xs text-neutral-500">
            {new Date(session.date).toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric'
            })}
          </span>
        </div>
        
        <h3 className={`text-lg font-bold mb-1 transition-colors ${
          isRace 
            ? 'text-neutral-100 group-hover:text-accent-green' 
            : 'text-neutral-200 group-hover:text-neutral-100'
        }`}>
          {session.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {session.time} local
          </p>
          
          {session.status === 'completed' && (
            <span className="text-xs text-neutral-500">
              🛡️ Spoiler protected
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
 * Round detail page - shows sessions for a race weekend.
 */
export function RoundDetailPage() {
  const { seriesSlug, year, roundSlug } = useParams<{ 
    seriesSlug: string; 
    year: string; 
    roundSlug: string 
  }>();
  
  const series = seriesSlug ? SERIES_INFO[seriesSlug] : null;
  const round = roundSlug ? ROUND_INFO[roundSlug] : null;
  const yearNum = year ? parseInt(year, 10) : NaN;
  
  // Set breadcrumbs
  useBreadcrumbs(
    series && round && seriesSlug && roundSlug && !isNaN(yearNum)
      ? buildRoundBreadcrumbs(series.name, seriesSlug, yearNum, round.name, roundSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
        ]
  );
  
  if (!series || !round || !seriesSlug || !roundSlug || isNaN(yearNum)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Round not found"
          description="The race weekend you're looking for doesn't exist."
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
        icon="🏆"
        title={round.name}
        subtitle={`${round.circuit} • ${round.country}`}
      />
      
      {/* Circuit Info Card */}
      <Section>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-20 bg-neutral-800 rounded-lg flex items-center justify-center text-4xl">
              🗺️
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-100 mb-1">{round.circuit}</h3>
              <p className="text-neutral-400 mb-2">{round.country}</p>
              <Link 
                to={`/circuits/${roundSlug}`}
                className="text-sm text-accent-green hover:underline"
              >
                View circuit guide →
              </Link>
            </div>
          </div>
        </div>
      </Section>
      
      <Section title="Sessions" subtitle="Click on a session to view details and log your experience">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SESSIONS_DATA.map((session) => (
            <SessionCard 
              key={session.type} 
              seriesSlug={seriesSlug} 
              year={yearNum} 
              roundSlug={roundSlug}
              session={session} 
            />
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
