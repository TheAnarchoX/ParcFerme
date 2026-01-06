import { Link } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

interface Team {
  id: number;
  name: string;
  slug: string;
  country: string;
  series: string[];
  color: string;
}

const MOCK_TEAMS: Team[] = [
  { id: 1, name: 'Red Bull Racing', slug: 'red-bull-racing', country: 'Austria', series: ['F1'], color: '#1E41FF' },
  { id: 2, name: 'Ferrari', slug: 'ferrari', country: 'Italy', series: ['F1', 'WEC'], color: '#DC0000' },
  { id: 3, name: 'Mercedes-AMG Petronas', slug: 'mercedes', country: 'Germany', series: ['F1', 'Formula E'], color: '#00D2BE' },
  { id: 4, name: 'McLaren', slug: 'mclaren', country: 'United Kingdom', series: ['F1', 'IndyCar'], color: '#FF8700' },
  { id: 5, name: 'Aston Martin', slug: 'aston-martin', country: 'United Kingdom', series: ['F1', 'WEC'], color: '#006F62' },
  { id: 6, name: 'Alpine', slug: 'alpine', country: 'France', series: ['F1', 'WEC'], color: '#0090FF' },
  { id: 7, name: 'Team Penske', slug: 'team-penske', country: 'United States', series: ['IndyCar', 'NASCAR'], color: '#FFD100' },
  { id: 8, name: 'Chip Ganassi Racing', slug: 'chip-ganassi', country: 'United States', series: ['IndyCar', 'WEC'], color: '#00529F' },
  { id: 9, name: 'Porsche Motorsport', slug: 'porsche', country: 'Germany', series: ['WEC', 'Formula E'], color: '#D5001C' },
  { id: 10, name: 'Toyota Gazoo Racing', slug: 'toyota-gazoo', country: 'Japan', series: ['WEC'], color: '#EB0A1E' },
];

// =========================
// Components
// =========================

interface TeamCardProps {
  team: Team;
}

function TeamCard({ team }: TeamCardProps) {
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
      
      <div className="flex flex-wrap gap-2">
        {team.series.map(series => (
          <span
            key={series}
            className="px-2 py-1 text-xs font-medium bg-neutral-800 text-neutral-400 rounded"
          >
            {series}
          </span>
        ))}
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Teams discovery page.
 */
export function TeamsPage() {
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
  ]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏎️"
        title="Teams"
        subtitle="Explore racing teams across all series"
      />
      
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_TEAMS.map(team => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
