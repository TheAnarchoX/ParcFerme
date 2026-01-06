import { Link, useParams } from 'react-router-dom';
import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs, buildCircuitBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

// =========================
// Mock Data
// =========================

const CIRCUITS_DATA: Record<string, {
  name: string;
  location: string;
  country: string;
  length: number;
  turns: number;
  lapRecord: string;
  lapRecordHolder: string;
  lapRecordYear: number;
  firstGP: number;
  description: string;
}> = {
  silverstone: {
    name: 'Silverstone Circuit',
    location: 'Northamptonshire',
    country: 'United Kingdom',
    length: 5.891,
    turns: 18,
    lapRecord: '1:27.097',
    lapRecordHolder: 'Max Verstappen',
    lapRecordYear: 2020,
    firstGP: 1950,
    description: 'Silverstone Circuit is a motor racing circuit in Northamptonshire, England. The circuit, which was originally laid out on the site of a World War II airfield, hosted the first Formula One World Championship race.',
  },
  monaco: {
    name: 'Circuit de Monaco',
    location: 'Monte Carlo',
    country: 'Monaco',
    length: 3.337,
    turns: 19,
    lapRecord: '1:12.909',
    lapRecordHolder: 'Lewis Hamilton',
    lapRecordYear: 2021,
    firstGP: 1950,
    description: 'The Circuit de Monaco is a street circuit laid out on the city streets of Monte Carlo and La Condamine around the harbour of the Principality of Monaco.',
  },
  spa: {
    name: 'Circuit de Spa-Francorchamps',
    location: 'Stavelot',
    country: 'Belgium',
    length: 7.004,
    turns: 19,
    lapRecord: '1:46.286',
    lapRecordHolder: 'Valtteri Bottas',
    lapRecordYear: 2018,
    firstGP: 1950,
    description: 'The Circuit de Spa-Francorchamps is a motor racing circuit located in Stavelot, Belgium. It is the current venue of the Formula One Belgian Grand Prix.',
  },
};

// =========================
// Page Component
// =========================

/**
 * Circuit detail page with venue guide information.
 */
export function CircuitDetailPage() {
  const { circuitSlug } = useParams<{ circuitSlug: string }>();
  const circuit = circuitSlug ? CIRCUITS_DATA[circuitSlug] : null;
  
  useBreadcrumbs(
    circuit && circuitSlug
      ? buildCircuitBreadcrumbs(circuit.name, circuitSlug)
      : [
          { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
          { label: 'Circuits', path: ROUTES.CIRCUITS, icon: '🏁' },
        ]
  );
  
  if (!circuit || !circuitSlug) {
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
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="🏁"
        title={circuit.name}
        subtitle={`${circuit.location}, ${circuit.country}`}
      />
      
      {/* Circuit Info Card */}
      <Section>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-300 mb-6">{circuit.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="text-sm text-neutral-500">Length</span>
              <p className="text-xl font-semibold text-neutral-100">
                {circuit.length.toFixed(3)} km
              </p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Turns</span>
              <p className="text-xl font-semibold text-neutral-100">{circuit.turns}</p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">First GP</span>
              <p className="text-xl font-semibold text-neutral-100">{circuit.firstGP}</p>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Lap Record</span>
              <p className="text-xl font-semibold text-neutral-100">{circuit.lapRecord}</p>
              <p className="text-sm text-neutral-500">
                {circuit.lapRecordHolder} ({circuit.lapRecordYear})
              </p>
            </div>
          </div>
        </div>
      </Section>
      
      {/* Circuit Guide */}
      <Section title="Venue Guide" subtitle="Crowdsourced tips from race attendees">
        <EmptyState
          icon="📍"
          title="Circuit Guide coming soon"
          description="User reviews, grandstand recommendations, and seat views will be displayed here."
        />
      </Section>
      
      {/* Upcoming Races */}
      <Section title="Upcoming Races">
        <EmptyState
          icon="📅"
          title="Calendar coming soon"
          description="Upcoming events at this circuit will be displayed here."
        />
      </Section>
    </MainLayout>
  );
}
