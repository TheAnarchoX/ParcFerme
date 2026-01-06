import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/layout/Header';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import type { SpoilerMode } from '../types/api';

type ProfileTab = 'profile' | 'settings';

export function ProfilePage() {
  const { user, updateProfile, isLoading, error } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  // Profile form state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [spoilerMode, setSpoilerMode] = useState<SpoilerMode>(user?.spoilerMode || 'Strict');
  
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    bio?: string;
  }>({});

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
      spoilerMode 
    });
    
    if (result.meta.requestStatus === 'fulfilled') {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

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

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
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

          {/* Tabs */}
          <div className="border-b border-neutral-800 mb-8">
            <nav className="flex gap-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'profile'
                    ? 'text-pf-green border-pf-green'
                    : 'text-neutral-400 border-transparent hover:text-neutral-200'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'settings'
                    ? 'text-pf-green border-pf-green'
                    : 'text-neutral-400 border-transparent hover:text-neutral-200'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Content */}
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

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-100 mb-6">Profile Information</h2>
                  
                  <div className="space-y-5">
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
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={isLoading}>
                    Save changes
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Spoiler Mode */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-100 mb-2">Spoiler Protection</h2>
                  <p className="text-sm text-neutral-400 mb-6">
                    Control how race results are displayed throughout the app.
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

                {/* Membership */}
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-100 mb-2">Membership</h2>
                  <p className="text-sm text-neutral-400 mb-6">
                    Your current subscription and benefits.
                  </p>

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
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={isLoading}>
                    Save settings
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
