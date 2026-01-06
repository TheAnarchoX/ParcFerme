import { Link } from 'react-router-dom';
import { MainLayout, PageHeader, Section } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

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
  series: string[];
}

const MOCK_CIRCUITS: Circuit[] = [
  { id: 1, name: 'Silverstone Circuit', slug: 'silverstone', location: 'Northamptonshire', country: 'United Kingdom', length: 5.891, turns: 18, series: ['F1', 'WEC'] },
  { id: 2, name: 'Circuit de Monaco', slug: 'monaco', location: 'Monte Carlo', country: 'Monaco', length: 3.337, turns: 19, series: ['F1', 'Formula E'] },
  { id: 3, name: 'Circuit de Spa-Francorchamps', slug: 'spa', location: 'Stavelot', country: 'Belgium', length: 7.004, turns: 19, series: ['F1', 'WEC'] },
  { id: 4, name: 'Suzuka International Racing Course', slug: 'suzuka', location: 'Suzuka', country: 'Japan', length: 5.807, turns: 18, series: ['F1'] },
  { id: 5, name: 'Autodromo Nazionale di Monza', slug: 'monza', location: 'Monza', country: 'Italy', length: 5.793, turns: 11, series: ['F1'] },
  { id: 6, name: 'Indianapolis Motor Speedway', slug: 'indianapolis', location: 'Indianapolis', country: 'United States', length: 4.023, turns: 4, series: ['IndyCar', 'NASCAR'] },
  { id: 7, name: 'Circuit de la Sarthe', slug: 'le-mans', location: 'Le Mans', country: 'France', length: 13.626, turns: 38, series: ['WEC'] },
  { id: 8, name: 'Nürburgring Nordschleife', slug: 'nordschleife', location: 'Nürburg', country: 'Germany', length: 20.832, turns: 154, series: ['WEC'] },
  { id: 9, name: 'Circuit of the Americas', slug: 'cota', location: 'Austin', country: 'United States', length: 5.513, turns: 20, series: ['F1', 'MotoGP', 'WEC'] },
  { id: 10, name: 'Interlagos', slug: 'interlagos', location: 'São Paulo', country: 'Brazil', length: 4.309, turns: 15, series: ['F1'] },
];

// =========================
// Components
// =========================

interface CircuitCardProps {
  circuit: Circuit;
}

function CircuitCard({ circuit }: CircuitCardProps) {
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
        <span className="text-2xl">🏁</span>
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
      
      <div className="flex flex-wrap gap-2">
        {circuit.series.map(series => (
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
 * Circuits discovery page.
 */
export function CircuitsPage() {
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🏁' },
  ]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏁"
        title="Circuits"
        subtitle="Explore racing circuits around the world"
      />
      
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_CIRCUITS.map(circuit => (
            <CircuitCard key={circuit.id} circuit={circuit} />
          ))}
        </div>
      </Section>
    </MainLayout>
  );
}
