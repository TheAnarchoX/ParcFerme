import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSessionBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { SpoilerMask, SpoilerRevealButton } from '../../components/ui/SpoilerShield';
import { useSpoilerVisibility } from '../../hooks/useSpoilerShield';
import { Button } from '../../components/ui/Button';

// =========================
// Mock Data
// =========================

const SERIES_INFO: Record<string, { name: string }> = {
  'f1': { name: 'Formula 1' },
  'motogp': { name: 'MotoGP' },
  'wec': { name: 'World Endurance Championship' },
  'indycar': { name: 'IndyCar Series' },
};

const ROUND_INFO: Record<string, { name: string; circuit: string }> = {
  'bahrain': { name: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit' },
  'saudi-arabia': { name: 'Saudi Arabian Grand Prix', circuit: 'Jeddah Corniche Circuit' },
  'australia': { name: 'Australian Grand Prix', circuit: 'Albert Park Circuit' },
  'japan': { name: 'Japanese Grand Prix', circuit: 'Suzuka International Racing Course' },
};

const SESSION_TYPES: Record<string, string> = {
  'fp1': 'Free Practice 1',
  'fp2': 'Free Practice 2',
  'fp3': 'Free Practice 3',
  'qualifying': 'Qualifying',
  'sprint': 'Sprint',
  'race': 'Race',
};

// =========================
// Page Component
// =========================

/**
 * Session detail page - shows session info with spoiler protection.
 */
export function SessionDetailPage() {
  const { seriesSlug, year, roundSlug, sessionType } = useParams<{ 
    seriesSlug: string; 
    year: string; 
    roundSlug: string;
    sessionType: string;
  }>();
  
  const series = seriesSlug ? SERIES_INFO[seriesSlug] : null;
  const round = roundSlug ? ROUND_INFO[roundSlug] : null;
  const sessionName = sessionType ? SESSION_TYPES[sessionType.toLowerCase()] : null;
  const yearNum = year ? parseInt(year, 10) : NaN;
  
  // Mock session ID for spoiler shield
  const sessionId = `${seriesSlug}-${year}-${roundSlug}-${sessionType}`;
  const { visibility } = useSpoilerVisibility(sessionId);
  
  // Set breadcrumbs
  useBreadcrumbs(
    series && round && sessionName && seriesSlug && roundSlug && sessionType && !isNaN(yearNum)
      ? buildSessionBreadcrumbs(series.name, seriesSlug, yearNum, round.name, roundSlug, sessionName)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Series', path: ROUTES.SERIES_LIST, icon: '🏁' },
        ]
  );
  
  if (!series || !round || !sessionName || !seriesSlug || !roundSlug || !sessionType || isNaN(yearNum)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Session not found"
          description="The session you're looking for doesn't exist."
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
        icon="📺"
        title={`${round.name} - ${sessionName}`}
        subtitle={`${series.name} ${yearNum} • ${round.circuit}`}
        actions={
          <Button variant="primary">
            📝 Log this session
          </Button>
        }
      />
      
      {/* Session Status Card */}
      <Section>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-neutral-500">Session Status</span>
            <span className="px-3 py-1 bg-pf-green/20 text-accent-green text-sm rounded-full">
              ✓ Completed
            </span>
          </div>
          
          {/* Spoiler Shield Info */}
          {visibility !== 'full' && (
            <div className="bg-pf-green/5 border border-pf-green/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h4 className="text-neutral-100 font-medium mb-1">Spoiler Shield Active</h4>
                  <p className="text-sm text-neutral-400 mb-3">
                    Results are hidden to protect your viewing experience. 
                    Reveal when you're ready or log the session to see results.
                  </p>
                  <SpoilerRevealButton
                    sessionId={sessionId}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Results Section */}
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">Results</h3>
          
          <SpoilerMask sessionId={sessionId} className="rounded-lg overflow-hidden">
            <div className="space-y-2">
              {[
                { pos: 1, driver: 'Max Verstappen', team: 'Red Bull Racing', time: '1:31:44.742' },
                { pos: 2, driver: 'Charles Leclerc', team: 'Ferrari', time: '+22.457' },
                { pos: 3, driver: 'Carlos Sainz', team: 'Ferrari', time: '+25.110' },
                { pos: 4, driver: 'George Russell', team: 'Mercedes', time: '+39.669' },
                { pos: 5, driver: 'Lando Norris', team: 'McLaren', time: '+47.318' },
              ].map((result) => (
                <div 
                  key={result.pos}
                  className="flex items-center gap-4 px-4 py-3 bg-neutral-800/50 rounded-lg"
                >
                  <span className={`
                    w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                    ${result.pos === 1 ? 'bg-pf-yellow text-black' : 
                      result.pos === 2 ? 'bg-neutral-400 text-black' :
                      result.pos === 3 ? 'bg-amber-700 text-white' :
                      'bg-neutral-700 text-neutral-300'}
                  `}>
                    {result.pos}
                  </span>
                  <div className="flex-1">
                    <p className="text-neutral-100 font-medium">{result.driver}</p>
                    <p className="text-sm text-neutral-400">{result.team}</p>
                  </div>
                  <span className="text-neutral-400 font-mono text-sm">
                    {result.time}
                  </span>
                </div>
              ))}
            </div>
          </SpoilerMask>
        </div>
      </Section>
      
      {/* Community Reviews Section */}
      <Section title="Community Reviews" subtitle="What others thought about this session">
        <EmptyState
          icon="💬"
          title="No reviews yet"
          description="Be the first to share your thoughts on this session!"
          action={
            <Button variant="ghost">Write a review</Button>
          }
        />
      </Section>
    </MainLayout>
  );
}
