import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
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
 */
export function SpoilerModeToggle({ variant = 'default', className = '' }: SpoilerModeToggleProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentMode = useSelector((state: RootState) => state.spoiler.mode);
  
  const handleChange = (mode: SpoilerMode) => {
    dispatch(setSpoilerMode(mode));
    // TODO: Persist to user preferences API when authenticated
  };
  
  // Compact variant (for user dropdown)
  if (variant === 'compact') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">
            Spoiler Shield
          </span>
          <span className="text-xs text-neutral-400">
            {SPOILER_MODES.find(m => m.value === currentMode)?.icon}
          </span>
        </div>
        <div className="flex gap-1">
          {SPOILER_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleChange(mode.value)}
              className={`
                flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors
                ${currentMode === mode.value 
                  ? 'bg-pf-green/20 text-accent-green' 
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }
              `}
              title={mode.description}
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
        <label className="text-sm text-neutral-400 mb-2 block">
          🛡️ Spoiler Shield
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SPOILER_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleChange(mode.value)}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors
                ${currentMode === mode.value 
                  ? 'bg-pf-green/20 text-accent-green border border-pf-green/30' 
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700'
                }
              `}
            >
              <span className="text-lg">{mode.icon}</span>
              <span className="text-xs font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          {SPOILER_MODES.find(m => m.value === currentMode)?.description}
        </p>
      </div>
    );
  }
  
  // Default variant (full width with descriptions)
  return (
    <div className={`${className}`}>
      <label className="text-sm text-neutral-300 font-medium mb-3 block">
        🛡️ Spoiler Shield Mode
      </label>
      <div className="space-y-2">
        {SPOILER_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => handleChange(mode.value)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
              ${currentMode === mode.value 
                ? 'bg-pf-green/10 border border-pf-green/30' 
                : 'bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800'
              }
            `}
          >
            <span className="text-xl">{mode.icon}</span>
            <div className="flex-1">
              <p className={`font-medium ${currentMode === mode.value ? 'text-accent-green' : 'text-neutral-200'}`}>
                {mode.label}
              </p>
              <p className="text-xs text-neutral-400">{mode.description}</p>
            </div>
            {currentMode === mode.value && (
              <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
