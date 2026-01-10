import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildRoundBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { roundsApi } from '../../services/roundsService';
import type { RoundPageResponse, SessionTimelineDto } from '../../types/round';
import { cleanRoundName, formatDateRange, getSeriesPrimaryColor } from '../../types/round';
import { getContrastColor } from '../../types/series';
import { getCountryFlag } from '../../lib/flags';
import { getDriverRoleLabel, getDriverRoleBadgeClasses, getDriverRoleTooltip } from '../../types/team';
import { WeekendWrapperModal } from '../../components/logging';
import { Button } from '../../components/ui/Button';

// =========================
// Loading Skeletons
// =========================

function SessionCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 bg-neutral-800 rounded w-16" />
        <div className="h-4 bg-neutral-800 rounded w-24" />
      </div>
      <div className="h-6 bg-neutral-800 rounded w-2/3 mb-2" />
      <div className="h-4 bg-neutral-800 rounded w-1/3" />
    </div>
  );
}

function CircuitCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-6">
        <div className="w-32 h-20 bg-neutral-800 rounded-lg" />
        <div className="flex-1">
          <div className="h-6 bg-neutral-800 rounded w-1/2 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-1/3 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-40" />
        </div>
      </div>
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="h-8 bg-neutral-800 rounded w-12 mb-2" />
      <div className="h-4 bg-neutral-800 rounded w-24" />
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
// Session Card Component
// =========================

interface SessionCardProps {
  seriesSlug: string;
  year: number;
  roundSlug: string;
  session: SessionTimelineDto;
  primaryColor?: string;
}

function SessionCard({ seriesSlug, year, roundSlug, session, primaryColor }: SessionCardProps) {
  // Check if this is a testing session (display name starts with "Day")
  const isTestingSession = session.displayName.startsWith('Day ');
  
  // Main events get special styling (but not testing sessions even if type is "Race")
  const isMainEvent = !isTestingSession && (
    session.type === 'Race' || session.type === 'Sprint' || 
    session.type === 'MotoGPRace' || session.type === 'Moto2Race' || 
    session.type === 'Moto3Race'
  );
  
  const formatSessionTime = (utcTime: string): string => {
    const date = new Date(utcTime);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = () => {
    if (session.status === 'Completed') {
      return (
        <span className="text-xs text-neutral-500">
          🛡️ Spoiler protected
        </span>
      );
    }
    if (session.status === 'InProgress') {
      return (
        <span 
          className="px-2 py-0.5 text-xs rounded font-medium"
          style={{ 
            backgroundColor: primaryColor ? `${primaryColor}20` : 'rgba(74, 222, 128, 0.1)',
            color: primaryColor || '#4ade80'
          }}
        >
          🔴 Live
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-pf-green/10 text-accent-green text-xs rounded">
        Upcoming
      </span>
    );
  };

  // Use series branding for main events
  const cardBgColor = isMainEvent && primaryColor ? `${primaryColor}10` : undefined;
  const cardBorderColor = isMainEvent && primaryColor ? `${primaryColor}40` : undefined;
  const cardHoverBorderColor = isMainEvent && primaryColor ? `${primaryColor}60` : undefined;
  const labelColor = isMainEvent && primaryColor ? primaryColor : undefined;
  const titleHoverColor = isMainEvent && primaryColor ? primaryColor : undefined;
  
  return (
    <Link
      to={ROUTES.SESSION_DETAIL(seriesSlug, year, roundSlug, session.id)}
      className={`
        group block border rounded-lg overflow-hidden transition-all
        ${!isMainEvent ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700' : ''}
      `}
      style={isMainEvent ? {
        backgroundColor: cardBgColor,
        borderColor: cardBorderColor,
      } : undefined}
      onMouseEnter={(e) => {
        if (isMainEvent && cardHoverBorderColor) {
          e.currentTarget.style.borderColor = cardHoverBorderColor;
        }
      }}
      onMouseLeave={(e) => {
        if (isMainEvent && cardBorderColor) {
          e.currentTarget.style.borderColor = cardBorderColor;
        }
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span 
            className="text-xs font-medium"
            style={labelColor ? { color: labelColor } : undefined}
          >
            {session.type}
          </span>
          {getStatusBadge()}
        </div>
        
        <h3 className={`text-lg font-bold mb-1 transition-colors ${
          !isMainEvent ? 'text-neutral-200 group-hover:text-neutral-100' : 'text-neutral-100'
        }`}
        style={isMainEvent ? {
          '--hover-color': titleHoverColor || '#4ade80'
        } as React.CSSProperties : undefined}
        onMouseEnter={(e) => {
          if (isMainEvent && titleHoverColor) {
            e.currentTarget.style.color = titleHoverColor;
          }
        }}
        onMouseLeave={(e) => {
          if (isMainEvent) {
            e.currentTarget.style.color = '#e5e5e5';
          }
        }}>
          {session.displayName}
        </h3>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {formatSessionTime(session.startTimeUtc)}
          </p>
          
          {session.isLogged && (
            <span className="text-xs text-accent-green">
              ✓ Logged
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// =========================
// Circuit Info Card
// =========================

interface CircuitCardProps {
  circuit: RoundPageResponse['round']['circuit'];
  primaryColor?: string;
}

function CircuitCard({ circuit, primaryColor }: CircuitCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
      <div className="flex items-start gap-6">
        <div className="w-32 h-20 bg-neutral-800 rounded-lg flex items-center justify-center text-4xl">
          {circuit.layoutMapUrl ? (
            <img 
              src={circuit.layoutMapUrl} 
              alt={`${circuit.name} layout`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <span>🗺️</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-neutral-100 mb-1">{circuit.name}</h3>
          <p className="text-neutral-400 mb-2">{circuit.location}, {circuit.country}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-2">
            {circuit.lengthMeters && (
              <span>📏 {(circuit.lengthMeters / 1000).toFixed(3)} km</span>
            )}
            {circuit.countryCode && (
              <span>{getCountryFlag(circuit.country, circuit.countryCode)} {circuit.country}</span>
            )}
          </div>
          
          <Link 
            to={ROUTES.CIRCUIT_DETAIL(circuit.slug)}
            className="text-sm hover:underline transition-colors"
            style={{ color: primaryColor || '#4ade80' }}
          >
            View circuit guide →
          </Link>
        </div>
      </div>
    </div>
  );
}

// =========================
// Page Component
// =========================

/**
 * Round detail page - shows sessions for a race weekend.
 * Fetches real data from the API and displays session timeline.
 */
export function RoundDetailPage() {
  const { seriesSlug, year, roundSlug } = useParams<{ 
    seriesSlug: string; 
    year: string; 
    roundSlug: string 
  }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [roundData, setRoundData] = useState<RoundPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWeekendModal, setShowWeekendModal] = useState(false);
  
  const yearNum = year ? parseInt(year, 10) : NaN;
  
  // Check if there are unlogged completed sessions for Weekend Wrapper
  const hasUnloggedSessions = useMemo(() => {
    if (!roundData) return false;
    return roundData.round.sessions.some(
      s => (s.status === 'Completed' || s.status === 'InProgress') && !s.isLogged
    );
  }, [roundData]);
  
  // Check if all sessions are logged (Weekend Complete badge)
  const isWeekendComplete = useMemo(() => {
    if (!roundData) return false;
    const completedSessions = roundData.round.sessions.filter(
      s => s.status === 'Completed' || s.status === 'InProgress'
    );
    return completedSessions.length > 0 && completedSessions.every(s => s.isLogged);
  }, [roundData]);
  
  // Handle opening weekend modal
  const handleLogWeekend = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setShowWeekendModal(true);
  };
  
  // Handle weekend log success - refresh data
  const handleWeekendSuccess = () => {
    // Refetch to update isLogged flags
    if (seriesSlug && roundSlug && !isNaN(yearNum)) {
      roundsApi.getRoundBySlug(seriesSlug, yearNum, roundSlug)
        .then(setRoundData)
        .catch(console.error);
    }
  };
  
  // Fetch round data
  useEffect(() => {
    if (!seriesSlug || !roundSlug || isNaN(yearNum)) return;
    
    let cancelled = false;
    
    async function fetchRoundDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await roundsApi.getRoundBySlug(seriesSlug!, yearNum, roundSlug!);
        if (!cancelled) {
          setRoundData(data);
        }
      } catch (err) {
        console.error('Failed to fetch round:', err);
        if (!cancelled) {
          setError('Failed to load round data. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    fetchRoundDetail();
    
    return () => {
      cancelled = true;
    };
  }, [seriesSlug, yearNum, roundSlug]);
  
  // Set breadcrumbs
  const displayName = roundData 
    ? cleanRoundName(roundData.round.name, roundData.round.series.name, roundData.round.year)
    : roundSlug || '';
    
  useBreadcrumbs(
    roundData && seriesSlug && roundSlug && !isNaN(yearNum)
      ? buildRoundBreadcrumbs(
          roundData.round.series.name, 
          seriesSlug, 
          yearNum, 
          displayName, 
          roundSlug
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
          <CircuitCardSkeleton />
        </Section>
        
        <Section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <StatsCardSkeleton key={i} />)}
          </div>
        </Section>
        
        <Section title="Sessions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(i => <SessionCardSkeleton key={i} />)}
          </div>
        </Section>
      </MainLayout>
    );
  }
  
  // Error or not found state
  if (error || !roundData || !seriesSlug || !roundSlug || isNaN(yearNum)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Round not found"
          description={error ?? "The race weekend you're looking for doesn't exist or isn't available yet."}
          action={
            seriesSlug && !isNaN(yearNum) ? (
              <Link 
                to={ROUTES.SEASON_DETAIL(seriesSlug, yearNum)} 
                className="text-accent-green hover:underline"
              >
                Back to {yearNum} season
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
  
  const { round, previousRound, nextRound } = roundData;
  const primaryColor = getSeriesPrimaryColor(round.series);
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
            icon="🏆"
            title={displayName}
            subtitle={`${round.circuit.name} • ${formatDateRange(round.dateStart, round.dateEnd)}`}
          />
          
          {/* Status badge */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {round.isCurrent ? (
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: primaryColor, color: textColor }}
              >
                🔴 Live Weekend
              </span>
            ) : round.isCompleted ? (
              <span className="inline-flex items-center px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm">
                ✓ Completed
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 bg-pf-green/10 text-accent-green rounded-full text-sm">
                Upcoming
              </span>
            )}
            
            {/* Weekend Complete Badge */}
            {isWeekendComplete && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pf-green/20 border border-pf-green/40 text-pf-green rounded-full text-sm font-medium">
                🏁 Full Weekend Logged!
              </span>
            )}
          </div>
          
          {/* Log Weekend Button */}
          {hasUnloggedSessions && (
            <div className="mt-4">
              <Button
                onClick={handleLogWeekend}
                className="gap-2"
              >
                <span>📋</span>
                Log Full Weekend
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Weekend Wrapper Modal */}
      {roundData && (
        <WeekendWrapperModal
          round={roundData.round}
          isOpen={showWeekendModal}
          onClose={() => setShowWeekendModal(false)}
          onSuccess={handleWeekendSuccess}
        />
      )}
      
      {/* Circuit Info Card */}
      <Section>
        <CircuitCard circuit={round.circuit} primaryColor={primaryColor} />
      </Section>
      
      {/* Round Stats */}
      <Section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard 
            icon="📺" 
            label="Sessions" 
            value={round.stats.totalSessions}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="✅" 
            label="Completed" 
            value={round.stats.completedSessions}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="👥" 
            label="Entrants" 
            value={round.stats.totalEntrants}
            primaryColor={primaryColor}
          />
          <StatsCard 
            icon="🔥" 
            label="Avg Excitement" 
            value={round.stats.averageExcitement?.toFixed(1) ?? '-'}
            primaryColor={primaryColor}
          />
        </div>
      </Section>
      
      {/* Sessions Timeline */}
      <Section title="Sessions" subtitle="Click on a session to view details and log your experience">
        {round.sessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {round.sessions.map((session) => (
              <SessionCard 
                key={session.id} 
                seriesSlug={seriesSlug} 
                year={yearNum} 
                roundSlug={roundSlug}
                session={session}
                primaryColor={primaryColor}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title="No sessions scheduled"
            description="Session details for this race weekend may not be available yet."
          />
        )}
      </Section>
      
      {/* Entrants List */}
      {round.entrants.length > 0 && (
        <Section title="Entrants" subtitle={`${round.entrants.length} drivers competing this weekend`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {round.entrants.map((entrant) => (
              <div 
                key={entrant.id}
                className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors"
              >
                {/* Driver Number */}
                {entrant.driver.driverNumber && (
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-neutral-800/50 rounded-lg">
                    <span className="text-lg font-bold text-neutral-300">
                      {entrant.driver.driverNumber}
                    </span>
                  </div>
                )}
                
                {/* Driver & Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link 
                      to={ROUTES.DRIVER_DETAIL(entrant.driver.slug)}
                      className="text-sm font-semibold text-neutral-100 truncate hover:text-accent-green transition-colors"
                    >
                      {entrant.driver.firstName} {entrant.driver.lastName}
                    </Link>
                    {entrant.driver.abbreviation && (
                      <span className="text-xs text-neutral-500 font-mono">
                        {entrant.driver.abbreviation}
                      </span>
                    )}
                    {/* Role badge for non-regular drivers */}
                    {entrant.role && (
                      <span 
                        className={`px-1.5 py-0.5 text-xs font-medium rounded cursor-help ${getDriverRoleBadgeClasses(entrant.role as 'reserve' | 'fp1_only' | 'test')}`}
                        title={getDriverRoleTooltip(entrant.role as 'reserve' | 'fp1_only' | 'test', yearNum)}
                      >
                        {getDriverRoleLabel(entrant.role as 'reserve' | 'fp1_only' | 'test')}
                      </span>
                    )}
                  </div>
                  <Link 
                    to={ROUTES.TEAM_DETAIL(entrant.team.slug)}
                    className="text-xs text-neutral-400 truncate hover:text-accent-green transition-colors block"
                    title={entrant.team.name}
                  >
                    {entrant.team.shortName || entrant.team.name}
                  </Link>
                </div>
                
                {/* Team Logo */}
                {entrant.team.logoUrl && (
                  <Link to={ROUTES.TEAM_DETAIL(entrant.team.slug)} className="shrink-0 w-8 h-8">
                    <img 
                      src={entrant.team.logoUrl} 
                      alt={entrant.team.name}
                      className="w-full h-full object-contain opacity-70 bg-white rounded p-1 hover:opacity-100 transition-opacity"
                    />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
      
      {/* Navigation */}
      <Section>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center py-6">
          <Link 
            to={ROUTES.SEASON_DETAIL(seriesSlug, yearNum)}
            className="text-neutral-400 hover:text-accent-green transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {yearNum} {round.series.name}
          </Link>
          
          {/* Adjacent round navigation */}
          <div className="flex gap-4">
            {previousRound ? (
              <Link 
                to={ROUTES.ROUND_DETAIL(seriesSlug, yearNum, previousRound.slug)}
                className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 transition-all text-sm"
                title={previousRound.name}
              >
                ← Round {previousRound.roundNumber}
              </Link>
            ) : (
              <span className="px-4 py-2 bg-neutral-900/30 border border-neutral-800/50 rounded-lg text-neutral-600 text-sm cursor-not-allowed">
                ← Previous
              </span>
            )}
            
            {nextRound ? (
              <Link 
                to={ROUTES.ROUND_DETAIL(seriesSlug, yearNum, nextRound.slug)}
                className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 hover:border-neutral-700 transition-all text-sm"
                title={nextRound.name}
              >
                Round {nextRound.roundNumber} →
              </Link>
            ) : (
              <span className="px-4 py-2 bg-neutral-900/30 border border-neutral-800/50 rounded-lg text-neutral-600 text-sm cursor-not-allowed">
                Next →
              </span>
            )}
          </div>
        </div>
      </Section>
    </MainLayout>
  );
}
