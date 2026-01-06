import { MainLayout, PageHeader, Section } from '../components/layout/MainLayout';
import { SpoilerModeToggle } from '../components/ui/SpoilerModeToggle';
import { useBreadcrumbs } from '../components/navigation/Breadcrumbs';
import { ROUTES } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';

// =========================
// Page Component
// =========================

/**
 * User settings page.
 */
export function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ]);
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="⚙️"
        title="Settings"
        subtitle="Manage your Parc Fermé preferences"
      />
      
      {/* Spoiler Preferences */}
      <Section title="Spoiler Protection" subtitle="Control how race results are displayed">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-neutral-100 mb-2">
                Spoiler Mode
              </h3>
              <p className="text-sm text-neutral-400 mb-4">
                Choose how you want race results to be displayed. Strict mode hides all results
                until you've logged the session. Moderate mode shows results after 48 hours.
                None disables spoiler protection entirely.
              </p>
              <SpoilerModeToggle />
            </div>
          </div>
        </div>
      </Section>
      
      {/* Account Settings */}
      <Section title="Account" subtitle={isAuthenticated ? `Signed in as ${user?.displayName}` : 'Not signed in'}>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <p className="text-lg font-medium text-neutral-100">{user?.displayName}</p>
                  <p className="text-sm text-neutral-500">{user?.email}</p>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-4">
                <p className="text-sm text-neutral-400">
                  Account management options coming soon.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-neutral-400 mb-4">
                Sign in to sync your preferences across devices.
              </p>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-accent-green text-neutral-900 font-medium rounded-lg hover:bg-accent-green/90 transition-colors"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      </Section>
      
      {/* Notification Settings */}
      <Section title="Notifications" subtitle="Control how you receive updates">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm text-neutral-400">
            Notification preferences coming soon. You'll be able to configure email
            notifications, push notifications, and more.
          </p>
        </div>
      </Section>
      
      {/* Privacy Settings */}
      <Section title="Privacy" subtitle="Control your profile visibility">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm text-neutral-400">
            Privacy settings coming soon. You'll be able to control who can see your
            logs, reviews, and activity.
          </p>
        </div>
      </Section>
    </MainLayout>
  );
}
