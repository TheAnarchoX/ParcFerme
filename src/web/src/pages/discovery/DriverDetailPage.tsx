import { Link, useParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildDriverBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { driversApi } from '../../services/driversService';
import type { DriverDetailDto, DriverCareerEntryDto } from '../../types/driver';
import { getNationalityFlag, getDriverFullName, calculateAge } from '../../types/driver';
import { getDriverRoleLabel, getDriverRoleBadgeClasses } from '../../types/team';

// =========================
// Loading Skeleton
// =========================

function ProfileCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 bg-neutral-800 rounded-xl" />
        <div className="flex-1">
          <div className="h-5 bg-neutral-800 rounded w-3/4 mb-4" />
          <div className="flex items-center gap-4">
            <div className="h-4 bg-neutral-800 rounded w-24" />
            <div className="h-4 bg-neutral-800 rounded w-24" />
          </div>
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

function CareerEntrySkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-neutral-900/30 rounded-lg animate-pulse">
      <div className="h-6 bg-neutral-800 rounded w-12" />
      <div className="h-6 bg-neutral-800 rounded w-32" />
      <div className="flex-1" />
      <div className="h-6 bg-neutral-800 rounded w-20" />
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
}

function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-neutral-100">{value}</p>
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// =========================
// Career Entry Component
// =========================

interface CareerEntryProps {
  entry: DriverCareerEntryDto;
  driverSlug: string;
}

function CareerEntry({ entry, driverSlug }: CareerEntryProps) {
  const isNonRegular = entry.role !== 'regular';
  const badgeClasses = getDriverRoleBadgeClasses(entry.role);
  
  return (
    <Link
      to={ROUTES.SEASON_DETAIL_FILTERED_BY_DRIVER(entry.seriesSlug, entry.year, driverSlug)}
      className="flex items-center gap-4 p-4 bg-neutral-900/30 rounded-lg hover:bg-neutral-900/50 transition-colors group"
      title={`View ${entry.year} ${entry.seriesName} rounds featuring this driver`}
    >
      <span className="text-lg font-bold text-neutral-300 w-16">{entry.year}</span>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {entry.team.logoUrl && (
          <div className="w-8 h-8 rounded bg-white p-1 flex items-center justify-center">
            <img 
              src={entry.team.logoUrl} 
              alt={entry.team.name}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        {!entry.team.logoUrl && entry.team.primaryColor && (
          <div 
            className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: entry.team.primaryColor }}
          >
            {entry.team.name.charAt(0)}
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <Link 
            to={ROUTES.TEAM_DETAIL(entry.team.slug)}
            className="text-neutral-200 group-hover:text-accent-green transition-colors font-medium truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {entry.team.name}
          </Link>
          {isNonRegular && (
            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClasses}`}>
              {getDriverRoleLabel(entry.role)}
            </span>
          )}
        </div>
      </div>
      
      <span className="text-sm text-neutral-500">
        {entry.seriesName}
      </span>
      
      <span className="text-sm text-neutral-400">
        {entry.roundsParticipated} round{entry.roundsParticipated !== 1 ? 's' : ''}
      </span>
    </Link>
  );
}

// =========================
// Grouping Types & Controls
// =========================

type CareerGrouping = 'chronological' | 'team' | 'series';

interface GroupingControlsProps {
  grouping: CareerGrouping;
  onGroupingChange: (grouping: CareerGrouping) => void;
}

function GroupingControls({ grouping, onGroupingChange }: GroupingControlsProps) {
  const options: { id: CareerGrouping; label: string; icon: string }[] = [
    { id: 'chronological', label: 'By Year', icon: '📅' },
    { id: 'team', label: 'By Team', icon: '🏎️' },
    { id: 'series', label: 'By Series', icon: '🏁' },
  ];

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-neutral-500">Group by:</span>
      <div className="flex gap-1">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => onGroupingChange(option.id)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1.5 ${
              grouping === option.id
                ? 'bg-accent-green text-neutral-900 font-medium'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
            }`}
          >
            <span>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =========================
// Grouped Career Display
// =========================

interface GroupedCareerEntry {
  groupKey: string;
  groupLabel: string;
  groupIcon?: string;
  entries: DriverCareerEntryDto[];
  totalRounds: number;
  yearRange: string;
}

function groupCareerEntries(
  entries: DriverCareerEntryDto[],
  grouping: CareerGrouping
): GroupedCareerEntry[] {
  if (grouping === 'chronological') {
    // Return as single group for chronological
    return [];
  }

  const groups = new Map<string, DriverCareerEntryDto[]>();

  entries.forEach(entry => {
    const key = grouping === 'team' ? entry.team.slug : entry.seriesSlug;
    const existing = groups.get(key) || [];
    existing.push(entry);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).map(([key, groupEntries]) => {
    const sortedEntries = [...groupEntries].sort((a, b) => b.year - a.year);
    const years = sortedEntries.map(e => e.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearRange = minYear === maxYear ? `${minYear}` : `${minYear}-${maxYear}`;
    
    const firstEntry = sortedEntries[0]!; // Safe because we're iterating over non-empty groups
    const groupLabel = grouping === 'team' ? firstEntry.team.name : firstEntry.seriesName;
    
    return {
      groupKey: key,
      groupLabel,
      entries: sortedEntries,
      totalRounds: sortedEntries.reduce((sum, e) => sum + e.roundsParticipated, 0),
      yearRange,
    };
  }).sort((a, b) => {
    // Sort groups by most recent year
    const aMaxYear = Math.max(...a.entries.map(e => e.year));
    const bMaxYear = Math.max(...b.entries.map(e => e.year));
    return bMaxYear - aMaxYear;
  });
}

interface GroupedCareerSectionProps {
  group: GroupedCareerEntry;
  driverSlug: string;
  grouping: CareerGrouping;
}

function GroupedCareerSection({ group, driverSlug, grouping }: GroupedCareerSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-all mb-2"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {grouping === 'team' ? '🏎️' : '🏁'}
          </span>
          <div className="text-left">
            <h4 className="font-semibold text-neutral-100">{group.groupLabel}</h4>
            <p className="text-sm text-neutral-500">
              {group.yearRange} • {group.entries.length} season{group.entries.length !== 1 ? 's' : ''} • {group.totalRounds} rounds
            </p>
          </div>
        </div>
        <span className={`text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className="space-y-2 pl-4 border-l-2 border-neutral-800">
          {group.entries.map(entry => (
            <CareerEntry
              key={`${entry.year}-${entry.seriesSlug}-${entry.team.id}`}
              entry={entry}
              driverSlug={driverSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// Page Component
// =========================

/**
 * Driver detail page.
 */
export function DriverDetailPage() {
  const { driverSlug } = useParams<{ driverSlug: string }>();
  
  // State
  const [driver, setDriver] = useState<DriverDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [careerGrouping, setCareerGrouping] = useState<CareerGrouping>('chronological');
  
  // Compute grouped career entries
  const groupedCareer = useMemo(() => {
    if (!driver || careerGrouping === 'chronological') return [];
    return groupCareerEntries(driver.career, careerGrouping);
  }, [driver, careerGrouping]);
  
  // Fetch driver data
  useEffect(() => {
    async function fetchDriver() {
      if (!driverSlug) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await driversApi.getDriverBySlug(driverSlug);
        setDriver(response);
      } catch (err) {
        console.error('Failed to fetch driver:', err);
        setError('Driver not found');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDriver();
  }, [driverSlug]);
  
  // Breadcrumbs
  useBreadcrumbs(
    driver && driverSlug
      ? buildDriverBreadcrumbs(getDriverFullName(driver), driverSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
        ]
  );
  
  // Loading state
  if (isLoading) {
    return (
      <MainLayout showBreadcrumbs>
        <div className="animate-pulse mb-6">
          <div className="h-10 bg-neutral-800 rounded w-64 mb-2" />
          <div className="h-5 bg-neutral-800 rounded w-48" />
        </div>
        <ProfileCardSkeleton />
        <div className="mt-8">
          <div className="h-6 bg-neutral-800 rounded w-32 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="mt-8">
          <div className="h-6 bg-neutral-800 rounded w-32 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <CareerEntrySkeleton key={i} />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Error / Not found state
  if (error || !driver || !driverSlug) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Driver not found"
          description="The driver you're looking for doesn't exist in our database."
          action={
            <Link to={ROUTES.DRIVERS} className="text-accent-green hover:underline">
              Browse all drivers
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  const fullName = getDriverFullName(driver);
  const flag = getNationalityFlag(driver.nationality);
  const age = calculateAge(driver.dateOfBirth);
  
  // Build subtitle with available info
  const subtitleParts: string[] = [];
  if (driver.driverNumber) subtitleParts.push(`#${driver.driverNumber}`);
  if (driver.nationality) subtitleParts.push(driver.nationality);
  if (age) subtitleParts.push(`${age} years old`);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon={flag}
        title={fullName}
        subtitle={subtitleParts.join(' • ') || 'Racing driver'}
      />
      
      {/* Driver Profile Card */}
      <Section>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-neutral-800 rounded-xl flex items-center justify-center">
              {driver.headshotUrl ? (
                <img 
                  src={driver.headshotUrl} 
                  alt={fullName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : driver.driverNumber ? (
                <span className="text-4xl font-bold text-neutral-300 font-racing">
                  {driver.driverNumber}
                </span>
              ) : (
                <span className="text-4xl">{flag}</span>
              )}
            </div>
            <div className="flex-1">
              {driver.abbreviation && (
                <span className="inline-block px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded mb-2 font-mono">
                  {driver.abbreviation}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {driver.nationality && (
                  <span className="text-neutral-500">
                    Nationality: <span className="text-neutral-300">{driver.nationality}</span>
                  </span>
                )}
                {driver.dateOfBirth && (
                  <span className="text-neutral-500">
                    Born: <span className="text-neutral-300">
                      {new Date(driver.dateOfBirth).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </span>
                )}
                {driver.wikipediaUrl && (
                  <a 
                    href={driver.wikipediaUrl}
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
      </Section>
      
      {/* Career Stats */}
      <Section title="Career Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard 
            icon="📅" 
            label="Seasons" 
            value={driver.stats.totalSeasons} 
          />
          <StatsCard 
            icon="🏁" 
            label="Rounds" 
            value={driver.stats.totalRounds} 
          />
          <StatsCard 
            icon="🏎️" 
            label="Teams" 
            value={driver.stats.totalTeams} 
          />
          <StatsCard 
            icon="🏆" 
            label="Series" 
            value={driver.stats.totalSeries} 
          />
        </div>
        
        {driver.stats.firstSeasonYear && driver.stats.lastSeasonYear && (
          <p className="text-sm text-neutral-500 mt-4">
            Career span: {driver.stats.firstSeasonYear} - {driver.stats.lastSeasonYear}
            {driver.stats.firstSeasonYear === driver.stats.lastSeasonYear && ' (debut season)'}
          </p>
        )}
      </Section>
      
      {/* Career History */}
      <Section 
        title="Career History" 
        subtitle="Teams and seasons"
      >
        {driver.career.length > 0 ? (
          <>
            <GroupingControls
              grouping={careerGrouping}
              onGroupingChange={setCareerGrouping}
            />
            
            {careerGrouping === 'chronological' ? (
              <div className="space-y-2">
                {driver.career.map((entry) => (
                  <CareerEntry 
                    key={`${entry.year}-${entry.seriesSlug}-${entry.team.id}`} 
                    entry={entry}
                    driverSlug={driverSlug}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {groupedCareer.map(group => (
                  <GroupedCareerSection
                    key={group.groupKey}
                    group={group}
                    driverSlug={driverSlug}
                    grouping={careerGrouping}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="📊"
            title="No career data"
            description="Career history will be displayed here when available."
          />
        )}
      </Section>
    </MainLayout>
  );
}
