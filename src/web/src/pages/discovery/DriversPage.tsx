import { Link } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

const DRIVERS_DATA = [
  { id: '1', firstName: 'Max', lastName: 'Verstappen', slug: 'max-verstappen', team: 'Red Bull Racing', number: 1, nationality: 'Dutch' },
  { id: '2', firstName: 'Lewis', lastName: 'Hamilton', slug: 'lewis-hamilton', team: 'Ferrari', number: 44, nationality: 'British' },
  { id: '3', firstName: 'Charles', lastName: 'Leclerc', slug: 'charles-leclerc', team: 'Ferrari', number: 16, nationality: 'Monégasque' },
  { id: '4', firstName: 'Lando', lastName: 'Norris', slug: 'lando-norris', team: 'McLaren', number: 4, nationality: 'British' },
  { id: '5', firstName: 'Oscar', lastName: 'Piastri', slug: 'oscar-piastri', team: 'McLaren', number: 81, nationality: 'Australian' },
  { id: '6', firstName: 'George', lastName: 'Russell', slug: 'george-russell', team: 'Mercedes', number: 63, nationality: 'British' },
  { id: '7', firstName: 'Kimi', lastName: 'Antonelli', slug: 'kimi-antonelli', team: 'Mercedes', number: 12, nationality: 'Italian' },
  { id: '8', firstName: 'Fernando', lastName: 'Alonso', slug: 'fernando-alonso', team: 'Aston Martin', number: 14, nationality: 'Spanish' },
  { id: '9', firstName: 'Carlos', lastName: 'Sainz', slug: 'carlos-sainz', team: 'Williams', number: 55, nationality: 'Spanish' },
];

// =========================
// Driver Card Component
// =========================

interface DriverCardProps {
  driver: typeof DRIVERS_DATA[0];
}

function DriverCard({ driver }: DriverCardProps) {
  return (
    <Link
      to={ROUTES.DRIVER_DETAIL(driver.slug)}
      className="group block bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-all"
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Number */}
          <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-neutral-300 font-racing">
              {driver.number}
            </span>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-neutral-100 group-hover:text-accent-green transition-colors truncate">
              {driver.firstName} {driver.lastName}
            </h3>
            <p className="text-sm text-neutral-400 truncate">
              {driver.team}
            </p>
          </div>
          
          {/* Flag placeholder */}
          <span className="text-xl" title={driver.nationality}>
            🏁
          </span>
        </div>
      </div>
    </Link>
  );
}

// =========================
// Page Component
// =========================

/**
 * Drivers discovery page.
 */
export function DriversPage() {
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
  ]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="👤"
        title="Drivers"
        subtitle="Discover drivers across all racing series"
      />
      
      <Section title="Current F1 Drivers" subtitle="2025 Season">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DRIVERS_DATA.map((driver) => (
            <DriverCard key={driver.id} driver={driver} />
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
