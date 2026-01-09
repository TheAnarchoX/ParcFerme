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

interface DriverData {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  team: string;
  number: number;
  nationality: string;
  series: string[]; // Series slugs this driver has participated in
}

const DRIVERS_DATA: DriverData[] = [
  { id: '1', firstName: 'Max', lastName: 'Verstappen', slug: 'max-verstappen', team: 'Red Bull Racing', number: 1, nationality: 'Dutch', series: ['f1'] },
  { id: '2', firstName: 'Lewis', lastName: 'Hamilton', slug: 'lewis-hamilton', team: 'Ferrari', number: 44, nationality: 'British', series: ['f1'] },
  { id: '3', firstName: 'Charles', lastName: 'Leclerc', slug: 'charles-leclerc', team: 'Ferrari', number: 16, nationality: 'Monégasque', series: ['f1'] },
  { id: '4', firstName: 'Lando', lastName: 'Norris', slug: 'lando-norris', team: 'McLaren', number: 4, nationality: 'British', series: ['f1'] },
  { id: '5', firstName: 'Oscar', lastName: 'Piastri', slug: 'oscar-piastri', team: 'McLaren', number: 81, nationality: 'Australian', series: ['f1'] },
  { id: '6', firstName: 'George', lastName: 'Russell', slug: 'george-russell', team: 'Mercedes', number: 63, nationality: 'British', series: ['f1'] },
  { id: '7', firstName: 'Kimi', lastName: 'Antonelli', slug: 'kimi-antonelli', team: 'Mercedes', number: 12, nationality: 'Italian', series: ['f1'] },
  { id: '8', firstName: 'Fernando', lastName: 'Alonso', slug: 'fernando-alonso', team: 'Aston Martin', number: 14, nationality: 'Spanish', series: ['f1', 'wec', 'indycar'] },
  { id: '9', firstName: 'Carlos', lastName: 'Sainz', slug: 'carlos-sainz', team: 'Williams', number: 55, nationality: 'Spanish', series: ['f1'] },
];

// =========================
// Driver Card Component
// =========================

interface DriverCardProps {
  driver: DriverData;
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
 * Drivers discovery page.
 * Supports filtering by series via query parameter (e.g., ?series=f1)
 */
export function DriversPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesFilter = searchParams.get('series');
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] : null;
  
  // Filter drivers based on series
  const filteredDrivers = seriesFilter
    ? DRIVERS_DATA.filter(driver => driver.series.includes(seriesFilter))
    : DRIVERS_DATA;
  
  // Build breadcrumbs - include series if filtered
  const breadcrumbItems = seriesFilter && seriesName
    ? [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesFilter), icon: '🏁' },
        { label: 'Drivers', path: ROUTES.DRIVERS_FILTERED(seriesFilter), icon: '👤' },
      ]
    : [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: 'Drivers', path: ROUTES.DRIVERS, icon: '👤' },
      ];
  
  useBreadcrumbs(breadcrumbItems);
  
  const handleClearFilter = () => {
    setSearchParams({});
  };
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Drivers` : 'Drivers';
  const pageSubtitle = seriesName
    ? `All drivers who have competed in ${seriesName}`
    : 'Discover drivers across all racing series';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="👤"
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
      
      <Section 
        title={seriesFilter ? undefined : "Current F1 Drivers"} 
        subtitle={seriesFilter ? undefined : "2025 Season"}
      >
        {filteredDrivers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg mb-2">No drivers found</p>
            <p className="text-sm">
              {seriesFilter 
                ? `No drivers have been added for ${seriesName || seriesFilter} yet.`
                : 'No drivers available.'}
            </p>
            {seriesFilter && (
              <button
                onClick={handleClearFilter}
                className="mt-4 text-accent-green hover:underline"
              >
                View all drivers
              </button>
            )}
          </div>
        )}
      </Section>
    </MainLayout>
  );
}
