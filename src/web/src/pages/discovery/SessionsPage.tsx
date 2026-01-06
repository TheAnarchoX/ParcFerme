import { MainLayout, PageHeader, Section, EmptyState } from '../../components/layout/MainLayout';
import { useBreadcrumbs } from '../../components/navigation/Breadcrumbs';
import { ROUTES } from '../../types/navigation';

/**
 * Sessions discovery page - browse recent and upcoming sessions.
 */
export function SessionsPage() {
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Sessions', path: ROUTES.SESSIONS, icon: '📺' },
  ]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="📺"
        title="Sessions"
        subtitle="Browse and discover racing sessions across all series"
      />
      
      <Section title="Recent Sessions" subtitle="Sessions from the last 7 days">
        <EmptyState
          icon="📺"
          title="Coming soon"
          description="Session discovery will be available once data is loaded. Browse by series for now."
        />
      </Section>
      
      <Section title="Upcoming Sessions" subtitle="Don't miss these upcoming sessions">
        <EmptyState
          icon="📅"
          title="Coming soon"
          description="Upcoming session schedule will be displayed here."
        />
      </Section>
    </MainLayout>
  );
}
