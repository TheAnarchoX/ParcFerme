import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildSessionBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { 
  SpoilerMask, 
  SpoilerRevealButton, 
  SpoilerPlaceholder,
  ExcitementMeter 
} from '../../components/ui/SpoilerShield';
import { useSpoilerVisibility, useSpoilerShield } from '../../hooks/useSpoilerShield';
import { Button } from '../../components/ui/Button';
import { LogModal } from '../../components/logging';
import { spoilerApi } from '../../services/spoilerService';
import type { SessionDetailDto, ResultDto, SessionSummaryDto } from '../../types/spoiler';
import type { LogDetailDto } from '../../types/log';
import type { RootState } from '../../store';
import { getSeriesPrimaryColor, cleanRoundName } from '../../types/round';
import { getContrastColor } from '../../types/series';

// =========================
// Loading Skeletons
// =========================

function SessionInfoSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-neutral-800 rounded w-24" />
        <div className="h-6 bg-neutral-800 rounded w-20" />
      </div>
      <div className="h-32 bg-neutral-800 rounded" />
    </div>
  );
}

function ResultsTableSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-neutral-800 rounded w-32 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 p-3 bg-neutral-800/50 rounded-lg">
            <div className="w-8 h-8 bg-neutral-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-800 rounded w-1/3" />
              <div className="h-3 bg-neutral-800 rounded w-1/4" />
            </div>
            <div className="h-4 bg-neutral-800 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
          <div className="h-8 bg-neutral-800 rounded w-12 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-24" />
        </div>
      ))}
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
// Result Row Component
// =========================

interface ResultRowProps {
  result: ResultDto;
  primaryColor?: string;
  sessionType?: string;
  leaderTime?: number; // Leader's timeMilliseconds for calculating intervals
  leaderLaps?: number; // Leader's lap count for calculating laps behind
}

/**
 * Helper to format milliseconds as a lap time string (e.g., "1:23.456")
 */
function formatLapTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
  return seconds.toFixed(3);
}

/**
 * Helper to format interval to leader (e.g., "+0.123")
 */
function formatInterval(ms: number): string {
  const seconds = ms / 1000;
  return `+${seconds.toFixed(3)}`;
}

/**
 * Check if session type is time-based (practice/qualifying where lap time matters)
 */
function isTimedSession(sessionType?: string): boolean {
  if (!sessionType) return false;
  return ['FP1', 'FP2', 'FP3', 'Qualifying', 'SprintQualifying'].includes(sessionType);
}

/**
 * Get the display time for a result, handling timed sessions vs races
 */
function getResultDisplayTime(
  result: ResultDto, 
  sessionType?: string, 
  leaderTime?: number,
  leaderLaps?: number
): string {
  // For timed sessions (FP/Quali), show lap times and intervals
  if (isTimedSession(sessionType)) {
    // Try to get best qualifying time first (Q3 > Q2 > Q1)
    const bestQualiTime = result.q3Time || result.q2Time || result.q1Time;
    if (bestQualiTime) {
      return bestQualiTime;
    }
    
    // Fall back to timeMilliseconds
    if (result.timeMilliseconds) {
      if (result.position === 1) {
        return formatLapTime(result.timeMilliseconds);
      }
      // Show interval to leader if we have leader's time
      if (leaderTime && leaderTime > 0) {
        const interval = result.timeMilliseconds - leaderTime;
        return formatInterval(interval);
      }
      return formatLapTime(result.timeMilliseconds);
    }
    
    return result.time || '-';
  }
  
  // For races: P1 shows laps, others show gap to leader or lapped status
  if (result.position === 1) {
    return result.laps ? `${result.laps} laps` : result.time || '-';
  }
  
  // Check for lapped drivers (statusDetail contains "+1 Lap", "+2 Laps", etc. from Ergast)
  if (result.statusDetail && result.statusDetail.includes('Lap')) {
    return result.statusDetail;
  }
  
  // Calculate laps behind from laps field (for OpenF1 data or when statusDetail is missing)
  if (leaderLaps && result.laps && result.laps < leaderLaps) {
    const lapsBehind = leaderLaps - result.laps;
    return lapsBehind === 1 ? '+1 Lap' : `+${lapsBehind} Laps`;
  }
  
  return result.time || '-';
}

function ResultRow({ result, primaryColor, sessionType, leaderTime, leaderLaps }: ResultRowProps) {
  const getPositionStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return 'bg-pf-yellow text-black';
      case 2:
        return 'bg-neutral-400 text-black';
      case 3:
        return 'bg-amber-700 text-white';
      default:
        return 'bg-neutral-700 text-neutral-300';
    }
  };

  const getStatusBadge = (status: string, statusDetail?: string) => {
    switch (status) {
      case 'Finished':
        return null;
      case 'DNF':
        return (
          <div className="text-right">
            <span className="text-xs text-pf-red font-medium">DNF</span>
            {statusDetail && !statusDetail.includes('Lap') && (
              <p className="text-xs text-neutral-500 mt-0.5">{statusDetail}</p>
            )}
          </div>
        );
      case 'DNS':
        return (
          <div className="text-right">
            <span className="text-xs text-neutral-500 font-medium">DNS</span>
            {statusDetail && (
              <p className="text-xs text-neutral-600 mt-0.5">{statusDetail}</p>
            )}
          </div>
        );
      case 'DSQ':
        return (
          <div className="text-right">
            <span className="text-xs text-orange-500 font-medium">DSQ</span>
            {statusDetail && statusDetail !== 'Disqualified' && (
              <p className="text-xs text-neutral-500 mt-0.5">{statusDetail}</p>
            )}
          </div>
        );
      case 'NC':
        return (
          <div className="text-right">
            <span className="text-xs text-neutral-500 font-medium">NC</span>
            {statusDetail && (
              <p className="text-xs text-neutral-600 mt-0.5">{statusDetail}</p>
            )}
          </div>
        );
      default:
        return <span className="text-xs text-neutral-500 font-medium">{status}</span>;
    }
  };

  return (
    <div 
      className={`
        flex items-center gap-4 px-4 py-3 bg-neutral-800/50 rounded-lg
        ${result.fastestLap ? 'ring-1 ring-purple-500/50' : ''}
      `}
    >
      {/* Position */}
      <span className={`
        w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0
        ${getPositionStyle(result.position)}
      `}>
        {result.position}
      </span>
      
      {/* Driver Number */}
      {result.driver.driverNumber && (
        <div className="w-8 h-8 flex items-center justify-center bg-neutral-700/50 rounded shrink-0">
          <span className="text-sm font-bold text-neutral-400">
            {result.driver.driverNumber}
          </span>
        </div>
      )}
      
      {/* Driver & Team Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link 
            to={ROUTES.DRIVER_DETAIL(result.driver.slug)}
            className="text-neutral-100 font-medium hover:text-pf-green transition-colors truncate"
          >
            {result.driver.firstName} {result.driver.lastName}
          </Link>
          {result.driver.abbreviation && (
            <span className="text-xs text-neutral-500 font-mono">
              {result.driver.abbreviation}
            </span>
          )}
          {result.fastestLap && (
            <span className="text-xs text-purple-400 font-medium">⚡ FL</span>
          )}
        </div>
        <Link 
          to={ROUTES.TEAM_DETAIL(result.team.slug)}
          className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors truncate block"
        >
          {result.team.shortName || result.team.name}
        </Link>
      </div>
      
      {/* Grid position change indicator */}
      {result.gridPosition && result.status === 'Finished' && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-500">
          <span>P{result.gridPosition}</span>
          {result.gridPosition !== result.position && (
            <span className={result.gridPosition > result.position ? 'text-pf-green' : 'text-pf-red'}>
              {result.gridPosition > result.position ? '▲' : '▼'}
              {Math.abs(result.gridPosition - result.position)}
            </span>
          )}
        </div>
      )}
      
      {/* Time / Status */}
      <div className="text-right shrink-0">
        {result.status === 'Finished' ? (
          <span className="text-neutral-400 font-mono text-sm">
            {getResultDisplayTime(result, sessionType, leaderTime, leaderLaps)}
          </span>
        ) : (
          getStatusBadge(result.status, result.statusDetail)
        )}
        {result.points !== undefined && result.points > 0 && (
          <p 
            className="text-xs font-medium mt-0.5"
            style={{ color: primaryColor || '#4ade80' }}
          >
            +{result.points} pts
          </p>
        )}
      </div>
    </div>
  );
}

// =========================
// Results Table Component
// =========================

interface ResultsTableProps {
  results: ResultDto[];
  primaryColor?: string;
  sessionType?: string;
}

function ResultsTable({ results, primaryColor, sessionType }: ResultsTableProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No classification available"
        description="Results for this session haven't been recorded yet."
      />
    );
  }

  // Group results by status
  const finishers = results.filter(r => r.status === 'Finished');
  const dnfs = results.filter(r => r.status === 'DNF');
  const others = results.filter(r => r.status !== 'Finished' && r.status !== 'DNF');
  
  // Get leader's time and laps for interval/lapped calculations
  const leader = finishers.find(r => r.position === 1);
  const leaderTime = leader?.timeMilliseconds;
  const leaderLaps = leader?.laps;

  return (
    <div className="space-y-4">
      {/* Main classification */}
      <div className="space-y-2">
        {finishers.map((result) => (
          <ResultRow 
            key={result.position} 
            result={result} 
            primaryColor={primaryColor} 
            sessionType={sessionType}
            leaderTime={leaderTime}
            leaderLaps={leaderLaps}
          />
        ))}
      </div>
      
      {/* DNFs */}
      {dnfs.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-neutral-500 mb-2">Did Not Finish</h4>
          <div className="space-y-2">
            {dnfs.map((result) => (
              <ResultRow 
                key={result.position} 
                result={result} 
                primaryColor={primaryColor} 
                sessionType={sessionType}
                leaderTime={leaderTime}
                leaderLaps={leaderLaps}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Other statuses (DNS, DSQ, etc.) */}
      {others.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-neutral-500 mb-2">Other</h4>
          <div className="space-y-2">
            {others.map((result) => (
              <ResultRow 
                key={result.position} 
                result={result} 
                primaryColor={primaryColor} 
                sessionType={sessionType}
                leaderTime={leaderTime}
                leaderLaps={leaderLaps}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Session Info Card
// =========================

interface SessionInfoCardProps {
  session: SessionDetailDto;
  primaryColor?: string;
}

function SessionInfoCard({ session, primaryColor }: SessionInfoCardProps) {
  const { round } = session;
  
  const formatDateTime = (utcTime: string): string => {
    const date = new Date(utcTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getStatusBadge = () => {
    switch (session.status) {
      case 'Completed':
        return (
          <span className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm">
            ✓ Completed
          </span>
        );
      case 'InProgress':
        return (
          <span 
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ 
              backgroundColor: primaryColor ? `${primaryColor}20` : 'rgba(74, 222, 128, 0.1)',
              color: primaryColor || '#4ade80'
            }}
          >
            🔴 Live
          </span>
        );
      case 'Scheduled':
        return (
          <span className="px-3 py-1 bg-pf-green/10 text-accent-green rounded-full text-sm">
            📅 Upcoming
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-neutral-800 text-neutral-400 rounded-full text-sm">
            {session.status}
          </span>
        );
    }
  };

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-neutral-500 mb-1">Session Type</p>
          <p 
            className="text-lg font-semibold"
            style={{ color: primaryColor || '#e5e5e5' }}
          >
            {session.type}
          </p>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-neutral-500 mb-1">Date & Time</p>
          <p className="text-neutral-200">{formatDateTime(session.startTimeUtc)}</p>
        </div>
        
        <div>
          <p className="text-sm text-neutral-500 mb-1">Circuit</p>
          <Link 
            to={ROUTES.CIRCUIT_DETAIL(round.circuit.slug)}
            className="text-neutral-200 hover:text-pf-green transition-colors"
          >
            {round.circuit.name}
          </Link>
          <p className="text-sm text-neutral-500">
            {round.circuit.location}, {round.circuit.country}
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================
// Other Sessions Navigation
// =========================

interface OtherSessionsNavProps {
  sessions: SessionSummaryDto[];
  currentSessionId: string;
  seriesSlug: string;
  year: number;
  roundSlug: string;
  primaryColor?: string;
}

function OtherSessionsNav({ 
  sessions, 
  currentSessionId, 
  seriesSlug, 
  year, 
  roundSlug,
  primaryColor 
}: OtherSessionsNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sessions.map((session) => {
        const isCurrent = session.id === currentSessionId;
        return (
          <Link
            key={session.id}
            to={ROUTES.SESSION_DETAIL(seriesSlug, year, roundSlug, session.id)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${isCurrent 
                ? 'text-neutral-950' 
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'
              }
            `}
            style={isCurrent ? { backgroundColor: primaryColor || '#4ade80' } : undefined}
          >
            {session.type}
            {session.isLogged && <span className="ml-1">✓</span>}
          </Link>
        );
      })}
    </div>
  );
}

// =========================
// Session Detail Display Name
// =========================

function getSessionDisplayName(type: string): string {
  // Clean up session type for display
  const typeMap: Record<string, string> = {
    'FP1': 'Free Practice 1',
    'FP2': 'Free Practice 2',
    'FP3': 'Free Practice 3',
    'Qualifying': 'Qualifying',
    'SprintQualifying': 'Sprint Qualifying',
    'Sprint': 'Sprint',
    'Race': 'Race',
  };
  
  return typeMap[type] || type;
}

// =========================
// Page Component
// =========================

/**
 * Session detail page - shows session info with spoiler protection.
 * Results are hidden by default and revealed through the Spoiler Shield system.
 */
export function SessionDetailPage() {
  const { seriesSlug, year, roundSlug, sessionId } = useParams<{ 
    seriesSlug: string; 
    year: string; 
    roundSlug: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  
  // Auth state
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const yearNum = year ? parseInt(year, 10) : NaN;
  
  // Spoiler visibility based on Redux state + API data
  const { visibility, isLogged, shouldShow } = useSpoilerVisibility(sessionId || '');
  const { markLogged } = useSpoilerShield();
  
  // Fetch session data
  // Pass forceReveal=true when local state says spoilers should be shown
  // This ensures results are returned even for anonymous users with mode="None"
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await spoilerApi.getSession(sessionId, shouldShow);
      setSession(data);
      
      // Sync logged status to Redux
      if (data.isLogged) {
        markLogged(sessionId);
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError('Failed to load session data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, markLogged, shouldShow]);
  
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);
  
  // Derive primary color and series info
  const primaryColor = session?.round?.seriesName 
    ? getSeriesPrimaryColor({ 
        id: '', 
        name: session.round.seriesName, 
        slug: session.round.seriesSlug,
        brandColors: [] 
      })
    : '#666666';
    
  // Clean round name for display
  const roundName = session 
    ? cleanRoundName(session.round.name, session.round.seriesName, session.round.year)
    : roundSlug || '';
  
  // Get session display name
  const sessionDisplayName = session 
    ? getSessionDisplayName(session.type)
    : 'Session';
  
  // Set breadcrumbs
  useBreadcrumbs(
    session && seriesSlug && roundSlug && sessionId && !isNaN(yearNum)
      ? buildSessionBreadcrumbs(
          session.round.seriesName,
          seriesSlug,
          yearNum,
          roundName,
          roundSlug,
          sessionDisplayName,
          sessionId
        )
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
          <SessionInfoSkeleton />
        </Section>
        
        <Section>
          <StatsSkeleton />
        </Section>
        
        <Section title="Results">
          <ResultsTableSkeleton />
        </Section>
      </MainLayout>
    );
  }
  
  // Error or not found state
  if (error || !session || !seriesSlug || !roundSlug || !sessionId || isNaN(yearNum)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Session not found"
          description={error ?? "The session you're looking for doesn't exist or isn't available yet."}
          action={
            seriesSlug && roundSlug && !isNaN(yearNum) ? (
              <Link 
                to={ROUTES.ROUND_DETAIL(seriesSlug, yearNum, roundSlug)} 
                className="text-accent-green hover:underline"
              >
                Back to race weekend
              </Link>
            ) : (
              <Link to={ROUTES.SERIES_LIST} className="text-accent-green hover:underline">
                Browse all series
              </Link>
            )
          }
        />
      </MainLayout>
    );
  }
  
  // Determine if spoilers should show (from API or local state)
  const showSpoilers = session.spoilersRevealed || visibility === 'full';
  const textColor = getContrastColor(primaryColor);
  
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
            icon="📺"
            title={`${roundName} - ${sessionDisplayName}`}
            subtitle={`${session.round.seriesName} ${yearNum} • ${session.round.circuit.name}`}
            actions={
              <Button 
                variant="primary"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: window.location.pathname } });
                    return;
                  }
                  setIsLogModalOpen(true);
                }}
                disabled={isLogged}
              >
                {isLogged ? '✓ Logged' : '📝 Log this session'}
              </Button>
            }
          />
          
          {/* Status badges */}
          <div className="mt-2 flex flex-wrap gap-2">
            {isLogged && (
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: primaryColor, color: textColor }}
              >
                ✓ Logged
              </span>
            )}
            {session.status === 'Completed' && !showSpoilers && (
              <span className="inline-flex items-center px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm">
                🛡️ Spoiler Shield Active
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Session Info Card */}
      <Section>
        <SessionInfoCard session={session} primaryColor={primaryColor} />
      </Section>
      
      {/* Session Stats (Always visible - spoiler-safe) */}
      <Section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard 
            icon="🏎️" 
            label="Entrants" 
            value={session.stats.totalEntrants}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="🏁" 
            label="Finished" 
            value={session.stats.finishedCount}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="⚠️" 
            label="DNFs" 
            value={session.stats.dnfCount}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="📝" 
            label="Logs" 
            value={session.stats.totalLogs}
            primaryColor={primaryColor}
          />
        </div>
      </Section>
      
      {/* Excitement Rating (Spoiler-safe aggregate) */}
      {session.stats.averageExcitement !== null && session.stats.averageExcitement !== undefined && (
        <Section title="Community Excitement" subtitle="Aggregate rating from user logs">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🔥</span>
              <div className="flex-1">
                <ExcitementMeter 
                  rating={session.stats.averageExcitement} 
                  size="lg" 
                />
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500">
                  Based on {session.stats.totalLogs} {session.stats.totalLogs === 1 ? 'log' : 'logs'}
                </p>
              </div>
            </div>
          </div>
        </Section>
      )}
      
      {/* Results Section - Spoiler Protected */}
      <Section 
        title="Results" 
        subtitle={showSpoilers ? 'Full classification' : 'Protected by Spoiler Shield'}
      >
        {session.status !== 'Completed' ? (
          <EmptyState
            icon="⏳"
            title="Session not yet completed"
            description="Results will be available after the session has finished."
          />
        ) : showSpoilers ? (
          // Show full results
          session.results ? (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
              {/* Winner highlight */}
              {session.results.winner && (
                <div 
                  className="mb-6 p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    borderColor: `${primaryColor}40`
                  }}
                >
                  <p className="text-sm text-neutral-500 mb-1">Winner</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <Link 
                        to={ROUTES.DRIVER_DETAIL(session.results.winner.driver.slug)}
                        className="text-xl font-bold text-neutral-100 hover:text-pf-green transition-colors"
                      >
                        {session.results.winner.driver.firstName} {session.results.winner.driver.lastName}
                      </Link>
                      <p className="text-sm text-neutral-400">
                        {session.results.winner.team.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Fastest lap highlight */}
              {session.results.fastestLap && (
                <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-sm text-neutral-500 mb-1">Fastest Lap</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <Link 
                        to={ROUTES.DRIVER_DETAIL(session.results.fastestLap.driver.slug)}
                        className="text-lg font-semibold text-purple-300 hover:text-purple-200 transition-colors"
                      >
                        {session.results.fastestLap.driver.firstName} {session.results.fastestLap.driver.lastName}
                      </Link>
                      <p className="text-sm text-neutral-400">
                        {session.results.fastestLap.time || 'Time N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <ResultsTable 
                results={session.results.classification} 
                primaryColor={primaryColor}
                sessionType={session.type}
              />
            </div>
          ) : (
            <EmptyState
              icon="📊"
              title="No results available"
              description="Results for this session haven't been recorded yet."
            />
          )
        ) : (
          // Spoiler protected view
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <SpoilerMask 
              sessionId={sessionId} 
              className="min-h-52"
              placeholder={
                <SpoilerPlaceholder type="classification" className="min-h-52" />
              }
            >
              {/* This will only render if visibility is 'full' */}
              {session.results && (
                <ResultsTable 
                  results={session.results.classification} 
                  primaryColor={primaryColor}
                  sessionType={session.type}
                />
              )}
            </SpoilerMask>
            
            {/* Reveal controls */}
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-neutral-100 font-medium mb-1">Ready to see results?</h4>
                  <p className="text-sm text-neutral-400">
                    Reveal when you've watched or log the session to unlock.
                  </p>
                </div>
                <SpoilerRevealButton 
                  sessionId={sessionId}
                  allowTempReveal={true}
                  size="lg"
                />
              </div>
            </div>
          </div>
        )}
      </Section>
      
      {/* Other Sessions in this Round */}
      <Section 
        title="Other Sessions" 
        subtitle="Jump to another session from this weekend"
      >
        <OtherSessionsNav
          sessions={session.round.sessions}
          currentSessionId={sessionId}
          seriesSlug={seriesSlug}
          year={yearNum}
          roundSlug={roundSlug}
          primaryColor={primaryColor}
        />
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
      
      {/* Navigation */}
      <Section>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center py-6">
          <Link 
            to={ROUTES.ROUND_DETAIL(seriesSlug, yearNum, roundSlug)}
            className="text-neutral-400 hover:text-accent-green transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {roundName}
          </Link>
        </div>
      </Section>
      
      {/* Log Modal */}
      <LogModal
        session={session}
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={(_log: LogDetailDto) => {
          // Mark session as logged in Redux
          markLogged(sessionId);
          // Refresh session data to update stats
          fetchSession();
        }}
      />
    </MainLayout>
  );
}
