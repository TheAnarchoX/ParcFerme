import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildCircuitBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';
import { circuitsApi } from '../../services/circuitsService';
import type { CircuitDiscoveryDetailDto, GrandstandDto } from '../../types/circuit';
import { getCountryFlag, formatCircuitLength, formatAltitude, getGoogleMapsUrl } from '../../types/circuit';

// =========================
// Loading Skeleton Components
// =========================

function ProfileSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-6 mb-6">
        <div className="w-32 h-32 rounded-xl bg-neutral-800" />
        <div className="flex-1">
          <div className="h-6 bg-neutral-800 rounded w-3/4 mb-4" />
          <div className="h-4 bg-neutral-800 rounded w-1/2 mb-2" />
          <div className="h-4 bg-neutral-800 rounded w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-neutral-800 rounded w-1/2 mb-1" />
            <div className="h-6 bg-neutral-800 rounded w-3/4" />
          </div>
        ))}
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
// Grandstand Card Component
// =========================

interface GrandstandCardProps {
  grandstand: GrandstandDto;
}

function GrandstandCard({ grandstand }: GrandstandCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
      <h4 className="font-semibold text-neutral-100 mb-1">{grandstand.name}</h4>
      {grandstand.description && (
        <p className="text-sm text-neutral-500">{grandstand.description}</p>
      )}
    </div>
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
    roundName: string;
    roundSlug: string;
    roundNumber: number;
  };
}

function SeasonHistoryCard({ season }: SeasonHistoryCardProps) {
  return (
    <Link
      to={ROUTES.ROUND_DETAIL(season.seriesSlug, season.year, season.roundSlug)}
      className="block bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-semibold text-neutral-100 group-hover:text-accent-green transition-colors">{season.year}</span>
        <span className="text-sm text-neutral-500">Round {season.roundNumber}</span>
      </div>
      <p className="text-neutral-300 text-sm mb-1">{season.roundName}</p>
      <span className="text-xs text-neutral-500">
        {season.seriesName}
      </span>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Circuit detail page with venue guide information.
 */
export function CircuitDetailPage() {
  const { circuitSlug } = useParams<{ circuitSlug: string }>();
  
  // State
  const [circuit, setCircuit] = useState<CircuitDiscoveryDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch circuit data
  const fetchCircuit = useCallback(async () => {
    if (!circuitSlug) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await circuitsApi.getCircuitBySlug(circuitSlug);
      setCircuit(data);
    } catch (err: unknown) {
      console.error('Failed to fetch circuit:', err);
      const errorObj = err as { response?: { status?: number } };
      if (errorObj.response?.status === 404) {
        setError('Circuit not found');
      } else {
        setError('Failed to load circuit. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [circuitSlug]);
  
  useEffect(() => {
    fetchCircuit();
  }, [fetchCircuit]);
  
  // Build breadcrumbs
  useBreadcrumbs(
    circuit && circuitSlug
      ? buildCircuitBreadcrumbs(circuit.name, circuitSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🏁' },
        ]
  );
  
  // Not found state
  if (!loading && (error === 'Circuit not found' || !circuitSlug)) {
    return (
      <MainLayout showBreadcrumbs>
        <EmptyState
          icon="🔍"
          title="Circuit not found"
          description="The circuit you're looking for doesn't exist in our database."
          action={
            <Link to={ROUTES.CIRCUITS} className="text-accent-green hover:underline">
              Browse all circuits
            </Link>
          }
        />
      </MainLayout>
    );
  }
  
  // Error state
  if (!loading && error && error !== 'Circuit not found') {
    return (
      <MainLayout showBreadcrumbs>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchCircuit}
            className="px-4 py-2 bg-accent-green text-neutral-900 rounded-lg font-semibold hover:bg-accent-green/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </MainLayout>
    );
  }
  
  // Get display values
  const flag = getCountryFlag(circuit?.country, circuit?.countryCode);
  const mapsUrl = circuit ? getGoogleMapsUrl(circuit.latitude, circuit.longitude) : null;
  
  // Calculate active years string
  const activeYears = circuit?.stats?.firstSeasonYear && circuit?.stats?.lastSeasonYear
    ? `${circuit.stats.firstSeasonYear} - ${circuit.stats.lastSeasonYear}`
    : '';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏁"
        title={loading ? 'Loading...' : circuit?.name || 'Circuit'}
        subtitle={loading ? '' : `${flag} ${circuit?.location}, ${circuit?.country} ${activeYears ? `• ${activeYears}` : ''}`}
      />
      
      {/* Circuit Info Card */}
      <Section>
        {loading ? (
          <ProfileSkeleton />
        ) : circuit && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {circuit.layoutMapUrl && (
                <img
                  src={circuit.layoutMapUrl}
                  alt={`${circuit.name} layout`}
                  className="w-32 h-32 rounded-xl object-contain bg-neutral-800"
                />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-neutral-100 mb-2">{circuit.name}</h2>
                <p className="text-neutral-400 mb-2">
                  {flag} {circuit.location}, {circuit.country}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {circuit.wikipediaUrl && (
                    <a
                      href={circuit.wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-green hover:underline"
                    >
                      Wikipedia →
                    </a>
                  )}
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-green hover:underline"
                    >
                      View on Map →
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-sm text-neutral-500">Length</span>
                <p className="text-xl font-semibold text-neutral-100">
                  {formatCircuitLength(circuit.lengthMeters)}
                </p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Altitude</span>
                <p className="text-xl font-semibold text-neutral-100">
                  {formatAltitude(circuit.altitude)}
                </p>
              </div>
              {circuit.latitude && circuit.longitude && (
                <div className="col-span-2">
                  <span className="text-sm text-neutral-500">Coordinates</span>
                  <p className="text-xl font-semibold text-neutral-100">
                    {circuit.latitude.toFixed(4)}°, {circuit.longitude.toFixed(4)}°
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>
      
      {/* Stats */}
      <Section title="Statistics">
        {loading ? (
          <StatsSkeleton />
        ) : circuit?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard icon="🏁" value={circuit.stats.totalRounds} label="Rounds Hosted" />
            <StatsCard icon="📅" value={circuit.stats.totalSeasons} label="Seasons" />
            <StatsCard icon="🏆" value={circuit.stats.totalSeries} label="Series" />
            <StatsCard 
              icon="📆" 
              value={circuit.stats.firstSeasonYear || 'N/A'} 
              label="First Event" 
            />
          </div>
        )}
      </Section>
      
      {/* Grandstands / Venue Guide */}
      <Section title="Venue Guide" subtitle="Grandstands and seating areas">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-pulse">
                <div className="h-5 bg-neutral-800 rounded w-3/4 mb-2" />
                <div className="h-4 bg-neutral-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : circuit?.grandstands && circuit.grandstands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {circuit.grandstands.map(grandstand => (
              <GrandstandCard key={grandstand.id} grandstand={grandstand} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📍"
            title="No grandstand data"
            description="Grandstand and seating information is not available for this circuit yet."
          />
        )}
      </Section>
      
      {/* Event History */}
      <Section title="Event History">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-neutral-800 rounded w-1/3 mb-2" />
                <div className="h-4 bg-neutral-800 rounded w-3/4 mb-1" />
                <div className="h-3 bg-neutral-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : circuit?.seasonHistory && circuit.seasonHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {circuit.seasonHistory.map((season, index) => (
              <SeasonHistoryCard key={`${season.year}-${season.seriesSlug}-${index}`} season={season} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title="No event history"
            description="Event history is not available for this circuit."
          />
        )}
      </Section>
    </MainLayout>
  );
}
