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
  'nascar': 'NASCAR',
};

// =========================
// Mock Data
// =========================

interface Circuit {
  id: number;
  name: string;
  slug: string;
  location: string;
  country: string;
  length: number; // km
  turns: number;
  series: string[]; // Series slugs
}

const MOCK_CIRCUITS: Circuit[] = [
  { id: 1, name: 'Silverstone Circuit', slug: 'silverstone', location: 'Northamptonshire', country: 'United Kingdom', length: 5.891, turns: 18, series: ['f1', 'wec'] },
  { id: 2, name: 'Circuit de Monaco', slug: 'monaco', location: 'Monte Carlo', country: 'Monaco', length: 3.337, turns: 19, series: ['f1', 'formula-e'] },
  { id: 3, name: 'Circuit de Spa-Francorchamps', slug: 'spa', location: 'Stavelot', country: 'Belgium', length: 7.004, turns: 19, series: ['f1', 'wec'] },
  { id: 4, name: 'Suzuka International Racing Course', slug: 'suzuka', location: 'Suzuka', country: 'Japan', length: 5.807, turns: 18, series: ['f1'] },
  { id: 5, name: 'Autodromo Nazionale di Monza', slug: 'monza', location: 'Monza', country: 'Italy', length: 5.793, turns: 11, series: ['f1'] },
  { id: 6, name: 'Indianapolis Motor Speedway', slug: 'indianapolis', location: 'Indianapolis', country: 'United States', length: 4.023, turns: 4, series: ['indycar', 'nascar'] },
  { id: 7, name: 'Circuit de la Sarthe', slug: 'le-mans', location: 'Le Mans', country: 'France', length: 13.626, turns: 38, series: ['wec'] },
  { id: 8, name: 'Nürburgring Nordschleife', slug: 'nordschleife', location: 'Nürburg', country: 'Germany', length: 20.832, turns: 154, series: ['wec'] },
  { id: 9, name: 'Circuit of the Americas', slug: 'cota', location: 'Austin', country: 'United States', length: 5.513, turns: 20, series: ['f1', 'motogp', 'wec'] },
  { id: 10, name: 'Interlagos', slug: 'interlagos', location: 'São Paulo', country: 'Brazil', length: 4.309, turns: 15, series: ['f1'] },
];

// =========================
// Components
// =========================

interface CircuitCardProps {
  circuit: Circuit;
  showSeries?: boolean;
}

function CircuitCard({ circuit, showSeries = true }: CircuitCardProps) {
  return (
    <Link
      to={ROUTES.CIRCUIT_DETAIL(circuit.slug)}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-accent-green transition-colors">
            {circuit.name}
          </h3>
          <p className="text-sm text-neutral-500">
            {circuit.location}, {circuit.country}
          </p>
        </div>
        <span className="text-2xl">🗺️</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-neutral-500">Length</span>
          <p className="text-neutral-200 font-medium">{circuit.length.toFixed(3)} km</p>
        </div>
        <div>
          <span className="text-neutral-500">Turns</span>
          <p className="text-neutral-200 font-medium">{circuit.turns}</p>
        </div>
      </div>
      
      {showSeries && (
        <div className="flex flex-wrap gap-2">
          {circuit.series.map(seriesSlug => (
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
 * Circuits discovery page.
 * Supports filtering by series via query parameter (e.g., ?series=f1)
 */
export function CircuitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesFilter = searchParams.get('series');
  const seriesName = seriesFilter ? SERIES_NAMES[seriesFilter] : null;
  
  // Filter circuits based on series
  const filteredCircuits = seriesFilter
    ? MOCK_CIRCUITS.filter(circuit => circuit.series.includes(seriesFilter))
    : MOCK_CIRCUITS;
  
  // Build breadcrumbs - include series if filtered
  const breadcrumbItems = seriesFilter && seriesName
    ? [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: seriesName, path: ROUTES.SERIES_DETAIL(seriesFilter), icon: '🏁' },
        { label: 'Circuits', path: ROUTES.CIRCUITS_FILTERED(seriesFilter), icon: '🗺️' },
      ]
    : [
        { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
        { label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🗺️' },
      ];
  
  useBreadcrumbs(breadcrumbItems);
  
  const handleClearFilter = () => {
    setSearchParams({});
  };
  
  // Generate page title and subtitle based on filter
  const pageTitle = seriesName ? `${seriesName} Circuits` : 'Circuits';
  const pageSubtitle = seriesName
    ? `Circuits used in ${seriesName}`
    : 'Explore racing circuits around the world';
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🗺️"
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
        {filteredCircuits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCircuits.map(circuit => (
              <CircuitCard key={circuit.id} circuit={circuit} showSeries={!seriesFilter} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg mb-2">No circuits found</p>
            <p className="text-sm">
              {seriesFilter 
                ? `No circuits have been added for ${seriesName || seriesFilter} yet.`
                : 'No circuits available.'}
            </p>
            {seriesFilter && (
              <button
                onClick={handleClearFilter}
                className="mt-4 text-accent-green hover:underline"
              >
                View all circuits
              </button>
            )}
          </div>
        )}
      </Section>
    </MainLayout>
  );
}
