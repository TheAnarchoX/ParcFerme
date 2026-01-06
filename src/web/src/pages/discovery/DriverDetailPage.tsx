import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildDriverBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

const DRIVERS_DATA: Record<string, {
  firstName: string;
  lastName: string;
  number: number;
  team: string;
  nationality: string;
  bio: string;
}> = {
  'max-verstappen': {
    firstName: 'Max',
    lastName: 'Verstappen',
    number: 1,
    team: 'Red Bull Racing',
    nationality: 'Dutch',
    bio: 'Four-time World Champion and currently the dominant force in Formula 1.',
  },
  'lewis-hamilton': {
    firstName: 'Lewis',
    lastName: 'Hamilton',
    number: 44,
    team: 'Ferrari',
    nationality: 'British',
    bio: 'Seven-time World Champion and one of the greatest drivers in F1 history.',
  },
  'charles-leclerc': {
    firstName: 'Charles',
    lastName: 'Leclerc',
    number: 16,
    team: 'Ferrari',
    nationality: 'Monégasque',
    bio: 'Ferrari\'s star driver, known for his incredible qualifying pace.',
  },
};

// =========================
// Page Component
// =========================

/**
 * Driver detail page.
 */
export function DriverDetailPage() {
  const { driverSlug } = useParams<{ driverSlug: string }>();
  const driver = driverSlug ? DRIVERS_DATA[driverSlug] : null;
  
  useBreadcrumbs(
    driver && driverSlug
      ? buildDriverBreadcrumbs(`${driver.firstName} ${driver.lastName}`, driverSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
        ]
  );
  
  if (!driver || !driverSlug) {
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
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="👤"
        title={`${driver.firstName} ${driver.lastName}`}
        subtitle={`#${driver.number} • ${driver.team} • ${driver.nationality}`}
      />
      
      {/* Driver Profile Card */}
      <Section>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-neutral-800 rounded-xl flex items-center justify-center">
              <span className="text-4xl font-bold text-neutral-300 font-racing">
                {driver.number}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-neutral-300 mb-4">{driver.bio}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-neutral-500">
                  Team: <span className="text-neutral-300">{driver.team}</span>
                </span>
                <span className="text-neutral-500">
                  Nationality: <span className="text-neutral-300">{driver.nationality}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>
      
      {/* Career Stats */}
      <Section title="Career Statistics">
        <EmptyState
          icon="📊"
          title="Stats coming soon"
          description="Career statistics will be displayed here."
        />
      </Section>
      
      {/* Recent Results */}
      <Section title="Recent Results">
        <EmptyState
          icon="🏆"
          title="Results coming soon"
          description="Recent race results will be displayed here (spoiler-protected)."
        />
      </Section>
    </MainLayout>
  );
}
