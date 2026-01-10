import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildTeamBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { teamsApi } from '../../services/teamsService';
import type { TeamDetailDto, TeamDriverDto } from '../../types/team';
import { getTeamNationalityFlag, getTeamPlaceholderColor, getDriverRoleLabel, getDriverRoleBadgeClasses, getDriverRoleTooltip } from '../../types/team';
import { TeamPlaceholder } from '../../components/ui';

// =========================
// Loading Skeleton Components
// =========================

function ProfileSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-xl bg-neutral-800" />
        <div className="flex-1">
          <div className="h-6 bg-neutral-800 rounded w-3/4 mb-4" />
          <div className="h-4 bg-neutral-800 rounded w-1/2 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-pulse">
          <div className="h-8 bg-neutral-800 rounded w-1/2 mx-auto mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-3/4 mx-auto" />
        </div>
      ))}
    </div>
  );
}

function DriverCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neutral-800" />
        <div className="flex-1">
          <div className="h-5 bg-neutral-800 rounded w-3/4 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// =========================
// Stats Card Component
// =========================

interface StatsCardProps {
  icon: string;
  value: number | string;
  label: string;
}

function StatsCard({ icon, value, label }: StatsCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-neutral-100">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}

// =========================
// Driver Card Component
// =========================

interface DriverCardProps {
  driver: TeamDriverDto;
  showRole?: boolean;
}

function DriverCard({ driver, showRole = true }: DriverCardProps) {
  const fullName = `${driver.firstName} ${driver.lastName}`;
  const isNonRegular = driver.role !== 'regular';
  const badgeClasses = getDriverRoleBadgeClasses(driver.role);
  const hasOtherTeams = driver.otherTeamsInSeason && driver.otherTeamsInSeason.length > 0;
  
  return (
    <Link
      to={ROUTES.DRIVER_DETAIL(driver.slug)}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      <div className="flex items-center gap-4">
        {driver.headshotUrl ? (
          <img
            src={driver.headshotUrl}
            alt={fullName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
            👤
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-neutral-100 group-hover:text-accent-green transition-colors truncate">
              {fullName}
            </h4>
            {showRole && isNonRegular && (
              <span 
                className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap cursor-help ${badgeClasses}`}
                title={getDriverRoleTooltip(driver.role)}
              >
                {getDriverRoleLabel(driver.role)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            {driver.driverNumber && (
              <span className="font-mono">#{driver.driverNumber}</span>
            )}
            {driver.nationality && (
              <span>{driver.nationality}</span>
            )}
            <span className="text-xs text-neutral-600">
              ({driver.roundsParticipated} round{driver.roundsParticipated !== 1 ? 's' : ''})
            </span>
          </div>
          {/* Show other teams in same season */}
          {hasOtherTeams && (
            <div className="mt-1 text-xs text-neutral-600">
              Also: {driver.otherTeamsInSeason!.map((t, i) => (
                <span key={t.slug}>
                  {i > 0 && ', '}
                  <Link 
                    to={ROUTES.TEAM_DETAIL(t.slug)}
                    className="text-neutral-500 hover:text-accent-green"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.name}
                  </Link>
                  {' '}({t.roundsParticipated})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// =========================
// Season History Card Component
// =========================

interface SeasonHistoryCardProps {
  season: {
    year: number;
    seriesName: string;
    seriesSlug: string;
    drivers: TeamDriverDto[];
    roundsParticipated: number;
  };
  teamSlug: string;
}

function SeasonHistoryCard({ season, teamSlug }: SeasonHistoryCardProps) {
  // Separate regular drivers from non-regular
  const regularDrivers = season.drivers.filter(d => d.role === 'regular');
  const otherDrivers = season.drivers.filter(d => d.role !== 'regular');
  
  return (
    <Link
      to={ROUTES.SEASON_DETAIL_FILTERED_BY_TEAM(season.seriesSlug, season.year, teamSlug)}
      className="block bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all group"
      title={`View ${season.year} ${season.seriesName} rounds featuring this team`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-neutral-100 group-hover:text-accent-green transition-colors">{season.year}</h4>
          <span className="text-sm text-neutral-500">
            {season.seriesName}
          </span>
        </div>
        <span className="text-sm text-neutral-500">
          {season.roundsParticipated} rounds
        </span>
      </div>
      
      {season.drivers.length > 0 && (
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Regular drivers first */}
          {regularDrivers.map(driver => (
            <Link
              key={driver.slug}
              to={ROUTES.SEASON_DETAIL_FILTERED_BY_DRIVER(season.seriesSlug, season.year, driver.slug)}
              className="text-xs px-2 py-1 bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700 hover:text-neutral-200 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title={`View ${season.year} ${season.seriesName} rounds featuring ${driver.firstName} ${driver.lastName}`}
            >
              {driver.firstName} {driver.lastName}
            </Link>
          ))}
          {/* Non-regular drivers with role indicator */}
          {otherDrivers.map(driver => {
            const badgeClasses = getDriverRoleBadgeClasses(driver.role);
            return (
              <Link
                key={driver.slug}
                to={ROUTES.SEASON_DETAIL_FILTERED_BY_DRIVER(season.seriesSlug, season.year, driver.slug)}
                className={`text-xs px-2 py-1 rounded hover:opacity-80 transition-colors ${badgeClasses || 'bg-neutral-800 text-neutral-400'}`}
                onClick={(e) => e.stopPropagation()}
                title={`${getDriverRoleTooltip(driver.role, season.year)} Click to view ${season.year} rounds.`}
              >
                {driver.firstName} {driver.lastName}
              </Link>
            );
          })}
        </div>
      )}
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Team detail page.
 */
export function TeamDetailPage() {
  const { teamSlug } = useParams<{ teamSlug: string }>();
  
  // State
  const [team, setTeam] = useState<TeamDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch team data
  const fetchTeam = useCallback(async () => {
    if (!teamSlug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await teamsApi.getTeamBySlug(teamSlug);
      setTeam(data);
    } catch (err: unknown) {
      console.error('Failed to fetch team:', err);
      const errorObj = err as { response?: { status?: number } };
      if (errorObj.response?.status === 404) {
        setError('Team not found');
      } else {
        setError('Failed to load team. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);
  
  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);
  
  // Build breadcrumbs
  useBreadcrumbs(
    team && teamSlug
      ? buildTeamBreadcrumbs(team.name, teamSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
        ]
  );
  
  // Not found state
  if (!loading && (error === 'Team not found' || !teamSlug)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Team not found"
          description="The team you're looking for doesn't exist in our database."
          action={
            <Link to={ROUTES.TEAMS} className="text-accent-green hover:underline">
              Browse all teams
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  // Error state
  if (!loading && error && error !== 'Team not found') {
    return (
      <MainLayout showBreadcrumbs>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchTeam}
            className="px-4 py-2 bg-accent-green text-neutral-900 rounded-lg font-semibold hover:bg-accent-green/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </MainLayout>
    );
  }
  
  // Get display values
  const teamColor = team?.primaryColor || (team?.name ? getTeamPlaceholderColor(team.name) : '#374151');
  const flag = getTeamNationalityFlag(team?.nationality);
  
  // Calculate active years string
  const activeYears = team?.stats?.firstSeasonYear && team?.stats?.lastSeasonYear
    ? `${team.stats.firstSeasonYear} - ${team.stats.lastSeasonYear}`
    : '';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏎️"
        title={loading ? 'Loading...' : team?.name || 'Team'}
        subtitle={loading ? '' : `${flag} ${team?.nationality || 'Unknown'} ${activeYears ? `• ${activeYears}` : ''}`}
      />
      
      {/* Team Profile Card */}
      <Section>
        {loading ? (
          <ProfileSkeleton />
        ) : team && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-start gap-6">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="w-24 h-24 rounded-xl object-contain bg-white"
                />
              ) : (
                <TeamPlaceholder size={96} secondaryColor={teamColor} primaryColor="#a3a3a3" />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-neutral-100 mb-2">{team.name}</h2>
                {team.shortName && team.shortName !== team.name && (
                  <p className="text-neutral-400 text-sm mb-2">Also known as: {team.shortName}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                  {team.nationality && (
                    <span>
                      {flag} {team.nationality}
                    </span>
                  )}
                  {team.wikipediaUrl && (
                    <a
                      href={team.wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-green hover:underline"
                    >
                      Wikipedia →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Section>
      
      {/* Stats */}
      <Section title="Statistics">
        {loading ? (
          <StatsSkeleton />
        ) : team?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard icon="📅" value={team.stats.totalSeasons} label="Seasons" />
            <StatsCard icon="🏁" value={team.stats.totalRounds} label="Rounds" />
            <StatsCard icon="👥" value={team.stats.totalDrivers} label="Drivers" />
            <StatsCard icon="🏆" value={team.stats.totalSeries} label="Series" />
          </div>
        )}
      </Section>
      
      {/* Current Drivers */}
      <Section
        title={
          !loading &&
          typeof team?.stats?.lastSeasonYear === 'number' &&
          team.stats.lastSeasonYear < new Date().getFullYear() - 1
        ? `Latest Drivers (${team?.stats?.lastSeasonYear})`
        : 'Current Drivers'
        }
      >
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <DriverCardSkeleton key={i} />
            ))}
          </div>
        ) : team?.currentDrivers && team.currentDrivers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {team.currentDrivers.map(driver => (
              <DriverCard key={driver.slug} driver={driver} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="👤"
            title="No current drivers"
            description="This team has no active drivers in the current season."
          />
        )}
      </Section>
      
      {/* Season History */}
      <Section title="Season History">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-neutral-800 rounded w-1/3 mb-2" />
                <div className="h-4 bg-neutral-800 rounded w-1/2 mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 bg-neutral-800 rounded w-20" />
                  <div className="h-6 bg-neutral-800 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : team?.seasonHistory && team.seasonHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.seasonHistory.map((season, index) => (
              <SeasonHistoryCard 
                key={`${season.year}-${season.seriesSlug}-${index}`} 
                season={season}
                teamSlug={teamSlug!}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title="No season history"
            description="Season participation data is not available for this team."
          />
        )}
      </Section>
    </MainLayout>
  );
}
