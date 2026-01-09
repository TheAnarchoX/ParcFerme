import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Series name mapping (temporary until API provides this)
// =========================

const SERIES_NAMES: Record<string, string> = {
  'f1': 'Formula 1',
  'motogp': 'MotoGP',
  'wec': 'WEC',
  'indycar': 'IndyCar',
  'formula-e': 'Formula E',
};

// =========================
// Mock Data
// =========================

interface Team {
  id: number;
  name: string;
  slug: string;
  country: string;
  series: string[]; // Series slugs
  color: string;
}

const MOCK_TEAMS: Team[] = [
  { id: 1, name: 'Red Bull Racing', slug: 'red-bull-racing', country: 'Austria', series: ['f1'], color: '#1E41FF' },
  { id: 2, name: 'Ferrari', slug: 'ferrari', country: 'Italy', series: ['f1', 'wec'], color: '#DC0000' },
  { id: 3, name: 'Mercedes-AMG Petronas', slug: 'mercedes', country: 'Germany', series: ['f1', 'formula-e'], color: '#00D2BE' },
  { id: 4, name: 'McLaren', slug: 'mclaren', country: 'United Kingdom', series: ['f1', 'indycar'], color: '#FF8700' },
  { id: 5, name: 'Aston Martin', slug: 'aston-martin', country: 'United Kingdom', series: ['f1', 'wec'], color: '#006F62' },
  { id: 6, name: 'Alpine', slug: 'alpine', country: 'France', series: ['f1', 'wec'], color: '#0090FF' },
  { id: 7, name: 'Team Penske', slug: 'team-penske', country: 'United States', series: ['indycar'], color: '#FFD100' },
  { id: 8, name: 'Chip Ganassi Racing', slug: 'chip-ganassi', country: 'United States', series: ['indycar', 'wec'], color: '#00529F' },
  { id: 9, name: 'Porsche Motorsport', slug: 'porsche', country: 'Germany', series: ['wec', 'formula-e'], color: '#D5001C' },
  { id: 10, name: 'Toyota Gazoo Racing', slug: 'toyota-gazoo', country: 'Japan', series: ['wec'], color: '#EB0A1E' },
];

// =========================
// Components
// =========================

interface TeamCardProps {
  team: Team;
  showSeries?: boolean;
}

function TeamCard({ team, showSeries = true }: TeamCardProps) {
  return (
    <Link
      to={ROUTES.TEAM_DETAIL(team.slug)}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: team.color }}
        >
          {team.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-accent-green transition-colors">
            {team.name}
          </h3>
          <p className="text-sm text-neutral-500">{team.country}</p>
        </div>
      </div>
      
      {showSeries && (
        <div className="flex flex-wrap gap-2">
          {team.series.map(seriesSlug => (
            <span
              key={seriesSlug}
              className="px-2 py-1 text-xs font-medium bg-neutral-800 text-neutral-400 rounded"
            >
              {SERIES_NAMES[seriesSlug] || seriesSlug}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// =========================
// Filter Badge Component
// =========================

interface FilterBadgeProps {
  label: string;
  onClear: () => void;
}

function FilterBadge({ label, onClear }: FilterBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-pf-green/10 border border-pf-green/20 rounded-full text-sm">
      <span className="text-accent-green">{label}</span>
      <button
        onClick={onClear}
        className="text-accent-green/70 hover:text-accent-green transition-colors"
        aria-label={`Clear ${label} filter`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// =========================
// Page Component
// =========================

/**
 * Teams discovery page.
 * Supports filtering by series via query parameter (e.g., ?series=f1)
 */
export function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesFilter = searchParams.get('series');
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] : null;
  
  // Filter teams based on series
  const filteredTeams = seriesFilter
    ? MOCK_TEAMS.filter(team => team.series.includes(seriesFilter))
    : MOCK_TEAMS;
  
  // Build breadcrumbs - include series if filtered
  const breadcrumbItems = seriesFilter && seriesName
    ? [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesFilter), icon: '🏁' },
        { label: 'Teams', path: ROUTES.TEAMS_FILTERED(seriesFilter), icon: '🏎️' },
      ]
    : [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
      ];
  
  useBreadcrumbs(breadcrumbItems);
  
  const handleClearFilter = () => {
    setSearchParams({});
  };
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Teams` : 'Teams';
  const pageSubtitle = seriesName
    ? `All teams competing in ${seriesName}`
    : 'Explore racing teams across all series';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏎️"
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      
      {/* Active filter indicator */}
      {seriesFilter && seriesName && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          <FilterBadge label={seriesName} onClear={handleClearFilter} />
        </div>
      )}
      
      <Section>
        {filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map(team => (
              <TeamCard key={team.id} team={team} showSeries={!seriesFilter} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg mb-2">No teams found</p>
            <p className="text-sm">
              {seriesFilter 
                ? `No teams have been added for ${seriesName || seriesFilter} yet.`
                : 'No teams available.'}
            </p>
            {seriesFilter && (
              <button
                onClick={handleClearFilter}
                className="mt-4 text-accent-green hover:underline"
              >
                View all teams
              </button>
            )}
          </div>
        )}
      </Section>
    </MainLayout>
  );
}
