import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MainLayout, Section } from '../components/layout/MainLayout';
import { useBreadcrumbs } from '../components/navigation/Breadcrumbs';
import { ROUTES } from '../types/navigation';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

/**
 * User profile page - displays and allows editing of profile information.
 * Settings have been moved to /settings.
 */
export function ProfilePage() {
  const { user, updateProfile, isLoading, error } = useAuth();

  // Profile form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    bio?: string;
  }>({});

  // Set breadcrumbs
  useBreadcrumbs([
    { label: 'Home', path: ROUTES.HOME, icon: '🏠' },
    { label: 'Profile', path: '/profile', icon: '👤' },
  ]);

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!displayName) {
      errors.displayName = 'Display name is required';
    } else if (displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    } else if (displayName.length > 50) {
      errors.displayName = 'Display name must be less than 50 characters';
    }

    if (bio && bio.length > 500) {
      errors.bio = 'Bio must be less than 500 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    
    if (!validateForm()) return;

    const result = await updateProfile({ 
      displayName, 
      bio: bio || undefined, 
      avatarUrl: avatarUrl || undefined,
      spoilerMode: user?.spoilerMode || 'Strict',
    });
    
    if (result.meta.requestStatus === 'fulfilled') {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <MainLayout showBreadcrumbs>
      {/* Profile Header */}
      <div className="flex items-center gap-6 mb-8">
        {/* Avatar */}
        <div className="relative">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.displayName}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-pf-green/20 flex items-center justify-center">
              <span className="text-accent-green text-3xl font-racing">
                {user?.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Membership Badge */}
          {user?.membershipTier === 'PaddockPass' && (
            <div className="absolute -bottom-1 -right-1 bg-pf-yellow text-neutral-950 text-xs font-bold px-2 py-0.5 rounded-full">
              PASS
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{user?.displayName}</h1>
          <p className="text-neutral-400">{user?.email}</p>
          <p className="text-sm text-neutral-500 mt-1">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit}>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-3 rounded-lg bg-pf-green/10 border border-pf-green/20">
            <p className="text-sm text-pf-green">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-pf-red-500/10 border border-pf-red-500/20">
            <p className="text-sm text-pf-red-500">{error}</p>
          </div>
        )}

        <Section title="Profile Information" subtitle="Update your public profile details">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-5">
            <Input
              label="Display name"
              type="text"
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={validationErrors.displayName}
              disabled={isLoading}
            />

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Bio
              </label>
              <textarea
                name="bio"
                rows={4}
                placeholder="Tell others about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isLoading}
                className={`
                  w-full px-4 py-2.5 rounded-lg
                  bg-neutral-900 border border-neutral-700
                  text-neutral-100 placeholder-neutral-500
                  focus:outline-none focus:ring-2 focus:ring-pf-green/50 focus:border-pf-green
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors resize-none
                  ${validationErrors.bio ? 'border-pf-red-500' : ''}
                `}
              />
              <div className="flex justify-between mt-1.5">
                {validationErrors.bio ? (
                  <p className="text-sm text-pf-red-500">{validationErrors.bio}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-neutral-500">{bio.length}/500</span>
              </div>
            </div>

            <Input
              label="Avatar URL"
              type="url"
              name="avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </Section>

        {/* Activity Stats (placeholder) */}
        <Section title="Activity" subtitle="Your Parc Fermé stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Sessions Logged', value: '0', icon: '📺' },
              { label: 'Races Attended', value: '0', icon: '🎫' },
              { label: 'Reviews Written', value: '0', icon: '✍️' },
              { label: 'Lists Created', value: '0', icon: '📋' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-center"
              >
                <span className="text-2xl mb-2 block">{stat.icon}</span>
                <p className="text-2xl font-bold text-neutral-100">{stat.value}</p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex justify-end mt-6">
          <Button type="submit" isLoading={isLoading}>
            Save changes
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
