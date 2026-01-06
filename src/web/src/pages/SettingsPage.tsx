import { useState, FormEvent } from 'react';
import { MainLayout, PageHeader, Section } from '../components/layout/MainLayout';
import { useBreadcrumbs } from '../components/navigation/Breadcrumbs';
import { ROUTES } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';
import { useSpoilerShield } from '../hooks/useSpoilerShield';
import { Button } from '../components/ui/Button';
import type { SpoilerMode } from '../types/api';

// =========================
// Page Component
// =========================

/**
 * User settings page - spoiler preferences, membership, notifications, privacy.
 */
export function SettingsPage() {
  const { user, isAuthenticated, updateProfile, isLoading } = useAuth();
  const { mode: currentSpoilerMode, setMode } = useSpoilerShield();
  
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>(user?.spoilerMode || currentSpoilerMode);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ]);
  
  const spoilerModeOptions: { value: SpoilerMode; label: string; description: string }[] = [
    { 
      value: 'Strict', 
      label: 'Strict', 
      description: 'Hide all results until you log a session' 
    },
    { 
      value: 'Moderate', 
      label: 'Moderate', 
      description: 'Hide results for sessions less than 7 days old' 
    },
    { 
      value: 'None', 
      label: 'None', 
      description: 'Show all results (spoiler warning will still appear)' 
    },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    // Update local spoiler mode in Redux store
    setMode(spoilerMode);
    
    // If authenticated, also persist to backend
    if (isAuthenticated && user) {
      const result = await updateProfile({
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        spoilerMode,
      });
      
      if (result.meta.requestStatus === 'fulfilled') {
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to save settings. Please try again.');
      }
    } else {
      // For unauthenticated users, just show success (local only)
      setSuccessMessage('Settings saved locally!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };
  
  return (
    <MainLayout showBreadcrumbs>
      <PageHeader
        icon="⚙️"
        title="Settings"
        subtitle="Manage your Parc Fermé preferences"
      />
      
      <form onSubmit={handleSubmit}>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-3 rounded-lg bg-pf-green/10 border border-pf-green/20">
            <p className="text-sm text-pf-green">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-pf-red-500/10 border border-pf-red-500/20">
            <p className="text-sm text-pf-red-500">{errorMessage}</p>
          </div>
        )}
        
        {/* Spoiler Preferences */}
        <Section title="Spoiler Protection" subtitle="Control how race results are displayed">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <p className="text-sm text-neutral-400 mb-6">
              Choose how you want race results to be displayed. Strict mode hides all results
              until you've logged the session. Moderate mode shows results after 7 days.
              None disables spoiler protection entirely.
            </p>
            
            <div className="space-y-3">
              {spoilerModeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors
                    ${spoilerMode === option.value
                      ? 'bg-pf-green/5 border-pf-green/30'
                      : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="spoilerMode"
                    value={option.value}
                    checked={spoilerMode === option.value}
                    onChange={(e) => setSpoilerMode(e.target.value as SpoilerMode)}
                    className="mt-1 w-4 h-4 text-pf-green bg-neutral-800 border-neutral-600 focus:ring-pf-green focus:ring-offset-neutral-900"
                  />
                  <div>
                    <span className="block text-neutral-100 font-medium">{option.label}</span>
                    <span className="block text-sm text-neutral-400 mt-0.5">
                      {option.description}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Section>
        
        {/* Membership */}
        <Section title="Membership" subtitle="Your current subscription and benefits">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            {isAuthenticated ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
                <div>
                  <span className={`
                    inline-block px-3 py-1 rounded-full text-sm font-medium
                    ${user?.membershipTier === 'PaddockPass'
                      ? 'bg-pf-yellow/20 text-pf-yellow'
                      : 'bg-neutral-700 text-neutral-300'
                    }
                  `}>
                    {user?.membershipTier === 'PaddockPass' ? '🏎️ PaddockPass' : 'Free'}
                  </span>
                  {user?.membershipExpiresAt && (
                    <p className="text-xs text-neutral-500 mt-2">
                      Renews {new Date(user.membershipExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {user?.membershipTier !== 'PaddockPass' && (
                  <Button variant="secondary" type="button">
                    Upgrade to PaddockPass
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-neutral-400 mb-4">
                  Sign in to manage your membership and unlock premium features.
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
        
        <div className="flex justify-end mt-6">
          <Button type="submit" isLoading={isLoading}>
            Save settings
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
