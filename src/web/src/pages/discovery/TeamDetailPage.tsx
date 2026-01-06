import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildTeamBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

const TEAMS_DATA: Record<string, {
  name: string;
  country: string;
  founded: number;
  headquarters: string;
  series: string[];
  color: string;
  description: string;
}> = {
  'red-bull-racing': {
    name: 'Red Bull Racing',
    country: 'Austria',
    founded: 2005,
    headquarters: 'Milton Keynes, UK',
    series: ['F1'],
    color: '#1E41FF',
    description: 'Oracle Red Bull Racing is a Formula One racing team, competing under an Austrian licence and based in the United Kingdom.',
  },
  'ferrari': {
    name: 'Scuderia Ferrari',
    country: 'Italy',
    founded: 1929,
    headquarters: 'Maranello, Italy',
    series: ['F1', 'WEC'],
    color: '#DC0000',
    description: 'Scuderia Ferrari is the racing division of luxury Italian auto manufacturer Ferrari and the racing team that competes in Formula One.',
  },
  'mclaren': {
    name: 'McLaren Racing',
    country: 'United Kingdom',
    founded: 1963,
    headquarters: 'Woking, UK',
    series: ['F1', 'IndyCar'],
    color: '#FF8700',
    description: 'McLaren Racing Limited is a British motor racing team based at the McLaren Technology Centre in Woking, Surrey.',
  },
};

// =========================
// Page Component
// =========================

/**
 * Team detail page.
 */
export function TeamDetailPage() {
  const { teamSlug } = useParams<{ teamSlug: string }>();
  const team = teamSlug ? TEAMS_DATA[teamSlug] : null;
  
  useBreadcrumbs(
    team && teamSlug
      ? buildTeamBreadcrumbs(team.name, teamSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Teams', path: ROUTES.TEAMS, icon: '🏎️' },
        ]
  );
  
  if (!team || !teamSlug) {
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
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏎️"
        title={team.name}
        subtitle={`${team.country} • Founded ${team.founded}`}
      />
      
      {/* Team Profile Card */}
      <Section>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-start gap-6">
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: team.color }}
            >
              {team.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
            </div>
            <div className="flex-1">
              <p className="text-neutral-300 mb-4">{team.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-neutral-500">
                  HQ: <span className="text-neutral-300">{team.headquarters}</span>
                </span>
                <span className="text-neutral-500">
                  Series:{' '}
                  <span className="text-neutral-300">{team.series.join(', ')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>
      
      {/* Current Drivers */}
      <Section title="Current Drivers">
        <EmptyState
          icon="👤"
          title="Drivers coming soon"
          description="Current team drivers will be displayed here."
        />
      </Section>
      
      {/* Team History */}
      <Section title="Championship History">
        <EmptyState
          icon="🏆"
          title="History coming soon"
          description="Championship history and achievements will be displayed here."
        />
      </Section>
    </MainLayout>
  );
}
