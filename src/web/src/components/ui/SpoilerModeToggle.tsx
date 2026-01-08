import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../store';
import { updateProfile, selectUser } from '../../store/slices/authSlice';
import { setSpoilerMode } from '../../store/slices/spoilerSlice';
import type { SpoilerMode } from '../../types/api';

// =========================
// Spoiler Mode Options
// =========================

const SPOILER_MODES: { value: SpoilerMode; label: string; description: string; icon: string }[] = [
  { 
    value: 'Strict', 
    label: 'Strict', 
    description: 'Hide all results until logged',
    icon: '🛡️'
  },
  { 
    value: 'Moderate', 
    label: 'Moderate', 
    description: 'Hide races from last 7 days',
    icon: '⚠️'
  },
  { 
    value: 'None', 
    label: 'None', 
    description: 'Show all results',
    icon: '👁️'
  },
];

// =========================
// Component Props
// =========================

interface SpoilerModeToggleProps {
  /** Display variant */
  variant?: 'default' | 'compact' | 'mobile';
  /** Optional class name */
  className?: string;
}

// =========================
// Component
// =========================

/**
 * Toggle for spoiler mode preference.
 * Allows users to control how race results are displayed.
 * Follows WCAG 2.1 AA accessibility guidelines using radio group semantics.
 */
export function SpoilerModeToggle({ variant = 'default', className = '' }: SpoilerModeToggleProps) {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectUser);
  const currentMode = user?.spoilerMode ?? 'Strict';
  
  const handleChange = async (mode: SpoilerMode) => {
    // Update local spoiler slice for immediate UI feedback
    dispatch(setSpoilerMode(mode));
    
    // Persist to backend if user is authenticated
    if (user) {
      await dispatch(updateProfile({ spoilerMode: mode }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, modes: typeof SPOILER_MODES) => {
    const currentIndex = modes.findIndex(m => m.value === currentMode);
    let newIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % modes.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + modes.length) % modes.length;
    }

    if (newIndex !== currentIndex) {
      handleChange(modes[newIndex].value);
    }
  };
  
  // Compact variant (for user dropdown)
  if (variant === 'compact') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span id="spoiler-compact-label" className="text-xs text-neutral-500 uppercase tracking-wider">
            Spoiler Shield
          </span>
          <span className="text-xs text-neutral-400" aria-hidden="true">
            {SPOILER_MODES.find(m => m.value === currentMode)?.icon}
          </span>
        </div>
        <div 
          role="radiogroup" 
          aria-labelledby="spoiler-compact-label"
          className="flex gap-1"
          onKeyDown={(e) => handleKeyDown(e, SPOILER_MODES)}
        >
          {SPOILER_MODES.map((mode) => (
            <button
              key={mode.value}
              role="radio"
              aria-checked={currentMode === mode.value}
              onClick={() => handleChange(mode.value)}
              tabIndex={currentMode === mode.value ? 0 : -1}
              className={`
                flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors
                focus:outline-none focus:ring-2 focus:ring-pf-green/50
                ${currentMode === mode.value 
                  ? 'bg-pf-green/20 text-accent-green' 
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }
              `}
              aria-label={`${mode.label}: ${mode.description}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  // Mobile variant (larger touch targets)
  if (variant === 'mobile') {
    return (
      <div className={`${className}`}>
        <span id="spoiler-mobile-label" className="text-sm text-neutral-400 mb-2 block">
          🛡️ Spoiler Shield
        </span>
        <div 
          role="radiogroup"
          aria-labelledby="spoiler-mobile-label"
          className="grid grid-cols-3 gap-2"
          onKeyDown={(e) => handleKeyDown(e, SPOILER_MODES)}
        >
          {SPOILER_MODES.map((mode) => (
            <button
              key={mode.value}
              role="radio"
              aria-checked={currentMode === mode.value}
              onClick={() => handleChange(mode.value)}
              tabIndex={currentMode === mode.value ? 0 : -1}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-pf-green/50
                ${currentMode === mode.value 
                  ? 'bg-pf-green/20 text-accent-green border border-pf-green/30' 
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
                }
              `}
              aria-label={`${mode.label}: ${mode.description}`}
            >
              <span className="text-lg" aria-hidden="true">{mode.icon}</span>
              <span className="text-xs font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-2" aria-live="polite">
          {SPOILER_MODES.find(m => m.value === currentMode)?.description}
        </p>
      </div>
    );
  }
  
  // Default variant (full width with descriptions)
  return (
    <div className={`${className}`}>
      <span id="spoiler-default-label" className="text-sm text-neutral-300 font-medium mb-3 block">
        🛡️ Spoiler Shield Mode
      </span>
      <div 
        role="radiogroup"
        aria-labelledby="spoiler-default-label"
        className="space-y-2"
        onKeyDown={(e) => handleKeyDown(e, SPOILER_MODES)}
      >
        {SPOILER_MODES.map((mode) => (
          <button
            key={mode.value}
            role="radio"
            aria-checked={currentMode === mode.value}
            onClick={() => handleChange(mode.value)}
            tabIndex={currentMode === mode.value ? 0 : -1}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
              focus:outline-none focus:ring-2 focus:ring-pf-green/50
              ${currentMode === mode.value 
                ? 'bg-pf-green/10 border border-pf-green/30' 
                : 'bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800'
              }
            `}
          >
            <span className="text-xl" aria-hidden="true">{mode.icon}</span>
            <div className="flex-1">
              <p className={`font-medium ${currentMode === mode.value ? 'text-accent-green' : 'text-neutral-200'}`}>
                {mode.label}
              </p>
              <p className="text-xs text-neutral-400">{mode.description}</p>
            </div>
            {currentMode === mode.value && (
              <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
