import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { logsApi } from '../../services/logsService';
import type {
  LogWeekendRequest,
  LogWeekendResponse,
  LogSessionEntry,
  CreateExperienceRequest,
  CreateReviewRequest,
} from '../../types/log';
import type { RoundPageDetailDto, SessionTimelineDto } from '../../types/round';
import { Button } from '../ui/Button';

// =========================
// Types
// =========================

interface WeekendWrapperModalProps {
  round: RoundPageDetailDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: LogWeekendResponse) => void;
}

type WeekendStep = 'type' | 'sessions' | 'ratings' | 'reviews' | 'experience';

interface SessionState {
  selected: boolean;
  starRating: number;
  excitementRating: number;
  reviewText: string;
  containsSpoilers: boolean;
  liked: boolean;
}

// =========================
// Session Type Ordering
// =========================

const SESSION_TYPE_ORDER: Record<string, number> = {
  'FP1': 1,
  'FP2': 2,
  'FP3': 3,
  'SprintQualifying': 4,
  'Sprint': 5,
  'Qualifying': 6,
  'Race': 7,
  // MotoGP specific
  'Moto3Race': 8,
  'Moto2Race': 9,
  'MotoGPRace': 10,
  // WEC specific
  'Warmup': 3.5,
};

function getSessionOrder(type: string): number {
  return SESSION_TYPE_ORDER[type] ?? 99;
}

// =========================
// Star Rating Component (Compact)
// =========================

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
}

function StarRating({ value, onChange, size = 'sm' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
  };

  const stars = [];
  for (let i = 0.5; i <= 5; i += 0.5) {
    const isFilled = (hoverValue ?? value) >= i;
    
    stars.push(
      <button
        key={i}
        type="button"
        className={`${sizeClasses[size]} transition-transform hover:scale-110 focus:outline-none`}
        onMouseEnter={() => setHoverValue(i)}
        onMouseLeave={() => setHoverValue(null)}
        onClick={() => onChange(i === value ? 0 : i)}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-full h-full ${isFilled ? 'text-yellow-400' : 'text-neutral-600'}`}
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="ml-2 text-xs text-neutral-400">
        {value > 0 ? `${value.toFixed(1)}` : '-'}
      </span>
    </div>
  );
}

// =========================
// Excitement Mini Slider
// =========================

interface ExcitementMiniProps {
  value: number;
  onChange: (value: number) => void;
}

function ExcitementMini({ value, onChange }: ExcitementMiniProps) {
  const color = value >= 8 ? '#22c55e' : value >= 6 ? '#eab308' : value >= 4 ? '#f97316' : '#ef4444';
  
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-20 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value * 10}%, #404040 ${value * 10}%, #404040 100%)`
        }}
      />
      <span className="text-xs text-neutral-400 w-8">{value}/10</span>
    </div>
  );
}

// =========================
// Venue Rating Component
// =========================

interface VenueRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: string;
}

function VenueRating({ label, value, onChange, icon }: VenueRatingProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-neutral-300">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i === value ? 0 : i)}
            className={`w-8 h-8 rounded-md border transition-colors ${
              i <= value
                ? 'bg-pf-green/20 border-pf-green text-pf-green'
                : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-500'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

// =========================
// Session Selection Card
// =========================

interface SessionCardProps {
  session: SessionTimelineDto;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
  primaryColor?: string;
}

function SessionSelectionCard({ session, isSelected, isDisabled, onToggle, primaryColor }: SessionCardProps) {
  const isMainEvent = session.type === 'Race' || session.type === 'Sprint' || 
                      session.type === 'MotoGPRace' || session.type === 'Moto2Race' || 
                      session.type === 'Moto3Race';

  const formatSessionTime = (utcTime: string): string => {
    const date = new Date(utcTime);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isDisabled}
      className={`
        w-full p-3 rounded-lg border text-left transition-all
        ${isDisabled 
          ? 'bg-neutral-900/30 border-neutral-800 opacity-50 cursor-not-allowed' 
          : isSelected
            ? 'border-pf-green bg-pf-green/10'
            : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-500'
        }
        ${isMainEvent && !isDisabled ? 'ring-1 ring-inset' : ''}
      `}
      style={isMainEvent && !isDisabled ? { 
        boxShadow: `inset 0 0 0 1px ${primaryColor || '#4ade80'}`,
        borderColor: isSelected ? undefined : `${primaryColor}40`
      } : undefined}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox indicator */}
        <div className={`
          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
          ${isDisabled 
            ? 'border-neutral-700 bg-neutral-800' 
            : isSelected 
              ? 'border-pf-green bg-pf-green' 
              : 'border-neutral-600'
          }
        `}>
          {isSelected && !isDisabled && (
            <svg className="w-3 h-3 text-neutral-900" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {isDisabled && (
            <svg className="w-3 h-3 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isMainEvent ? 'text-neutral-100' : 'text-neutral-300'}`}>
              {session.displayName}
            </span>
            {isMainEvent && <span className="text-sm">🏆</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{formatSessionTime(session.startTimeUtc)}</span>
            {isDisabled && <span className="text-accent-green">✓ Already logged</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

// =========================
// Session Rating Row
// =========================

interface SessionRatingRowProps {
  session: SessionTimelineDto;
  state: SessionState;
  onChange: (updates: Partial<SessionState>) => void;
}

function SessionRatingRow({ session, state, onChange }: SessionRatingRowProps) {
  const isMainEvent = session.type === 'Race' || session.type === 'Sprint';

  return (
    <div className={`p-3 rounded-lg border ${isMainEvent ? 'bg-neutral-800/70 border-neutral-700' : 'bg-neutral-900/50 border-neutral-800'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-medium ${isMainEvent ? 'text-neutral-100' : 'text-neutral-300'}`}>
          {session.displayName}
          {isMainEvent && <span className="ml-2">🏆</span>}
        </span>
        <button
          type="button"
          onClick={() => onChange({ liked: !state.liked })}
          className={`p-1 rounded transition-colors ${state.liked ? 'text-red-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          {state.liked ? '❤️' : '🤍'}
        </button>
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Stars:</span>
          <StarRating value={state.starRating} onChange={(v) => onChange({ starRating: v })} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Excitement:</span>
          <ExcitementMini value={state.excitementRating} onChange={(v) => onChange({ excitementRating: v })} />
        </div>
      </div>
    </div>
  );
}

// =========================
// Weekend Complete Badge
// =========================

interface WeekendCompleteBadgeProps {
  isComplete: boolean;
  selectedCount: number;
  totalCount: number;
}

function WeekendCompleteBadge({ isComplete, selectedCount, totalCount }: WeekendCompleteBadgeProps) {
  if (isComplete) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-pf-green/10 border border-pf-green/30 rounded-lg animate-pulse">
        <span className="text-xl">🏁</span>
        <span className="font-bold text-pf-green">FULL WEEKEND!</span>
        <span className="text-sm text-neutral-400">All {totalCount} sessions selected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg">
      <span className="text-neutral-400">{selectedCount} of {totalCount} sessions selected</span>
    </div>
  );
}

// =========================
// Aggregate Rating Display
// =========================

interface AggregateRatingProps {
  sessions: Map<string, SessionState>;
}

function AggregateRatingDisplay({ sessions }: AggregateRatingProps) {
  const { avgStars, avgExcitement, ratedCount } = useMemo(() => {
    const selected = [...sessions.values()].filter(s => s.selected);
    const withStars = selected.filter(s => s.starRating > 0);
    const avgStars = withStars.length > 0 
      ? withStars.reduce((sum, s) => sum + s.starRating, 0) / withStars.length 
      : 0;
    const avgExcitement = selected.length > 0
      ? selected.reduce((sum, s) => sum + s.excitementRating, 0) / selected.length
      : 0;
    return { avgStars, avgExcitement, ratedCount: withStars.length };
  }, [sessions]);

  if (ratedCount === 0) {
    return (
      <div className="text-center text-neutral-500 py-2">
        Rate sessions to see your weekend average
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-6 py-3 px-4 bg-neutral-800/50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-400">{avgStars.toFixed(1)}</div>
        <div className="text-xs text-neutral-500">Avg Stars</div>
      </div>
      <div className="w-px h-8 bg-neutral-700" />
      <div className="text-center">
        <div className={`text-2xl font-bold ${avgExcitement >= 7 ? 'text-green-400' : avgExcitement >= 5 ? 'text-yellow-400' : 'text-orange-400'}`}>
          {avgExcitement.toFixed(1)}
        </div>
        <div className="text-xs text-neutral-500">Avg Excitement</div>
      </div>
    </div>
  );
}

// =========================
// Main Weekend Wrapper Modal
// =========================

export function WeekendWrapperModal({ round, isOpen, onClose, onSuccess }: WeekendWrapperModalProps) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Get primary color from series
  const primaryColor = round.series.brandColors?.[0] ?? '#4ade80';
  
  // Filter and sort sessions
  const availableSessions = useMemo(() => {
    return round.sessions
      .filter(s => s.status === 'Completed' || s.status === 'InProgress')
      .sort((a, b) => getSessionOrder(a.type) - getSessionOrder(b.type));
  }, [round.sessions]);
  
  const unloggedSessions = useMemo(() => {
    return availableSessions.filter(s => !s.isLogged);
  }, [availableSessions]);
  
  // Form state
  const [step, setStep] = useState<WeekendStep>('type');
  const [isAttended, setIsAttended] = useState(false);
  const [dateWatched, setDateWatched] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today ?? '';
  });
  const [sessionStates, setSessionStates] = useState<Map<string, SessionState>>(() => {
    const map = new Map<string, SessionState>();
    availableSessions.forEach(s => {
      map.set(s.id, {
        selected: !s.isLogged, // Pre-select unlogged sessions
        starRating: 0,
        excitementRating: 5,
        liked: false,
        reviewText: '',
        containsSpoilers: true, // Default to true for safety
      });
    });
    return map;
  });
  
  // Experience state (for attended)
  const [venueRating, setVenueRating] = useState(0);
  const [viewRating, setViewRating] = useState(0);
  const [accessRating, setAccessRating] = useState(0);
  const [facilitiesRating, setFacilitiesRating] = useState(0);
  const [atmosphereRating, setAtmosphereRating] = useState(0);
  const [seatDescription, setSeatDescription] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Derived state
  const selectedSessions = useMemo(() => {
    return availableSessions.filter(s => {
      const state = sessionStates.get(s.id);
      return state?.selected && !s.isLogged;
    });
  }, [availableSessions, sessionStates]);
  
  const isWeekendComplete = useMemo(() => {
    return unloggedSessions.length > 0 && 
           unloggedSessions.every(s => sessionStates.get(s.id)?.selected);
  }, [unloggedSessions, sessionStates]);
  
  // Update session state helper
  const updateSessionState = useCallback((sessionId: string, updates: Partial<SessionState>) => {
    setSessionStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(sessionId);
      if (current) {
        newMap.set(sessionId, { ...current, ...updates });
      }
      return newMap;
    });
  }, []);
  
  // Toggle session selection
  const toggleSession = useCallback((sessionId: string) => {
    const session = availableSessions.find(s => s.id === sessionId);
    if (session?.isLogged) return; // Can't toggle already logged
    
    setSessionStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(sessionId);
      if (current) {
        newMap.set(sessionId, { ...current, selected: !current.selected });
      }
      return newMap;
    });
  }, [availableSessions]);
  
  // Select/deselect all
  const selectAll = useCallback(() => {
    setSessionStates(prev => {
      const newMap = new Map(prev);
      unloggedSessions.forEach(s => {
        const current = newMap.get(s.id);
        if (current) {
          newMap.set(s.id, { ...current, selected: true });
        }
      });
      return newMap;
    });
  }, [unloggedSessions]);
  
  const deselectAll = useCallback(() => {
    setSessionStates(prev => {
      const newMap = new Map(prev);
      unloggedSessions.forEach(s => {
        const current = newMap.get(s.id);
        if (current) {
          newMap.set(s.id, { ...current, selected: false });
        }
      });
      return newMap;
    });
  }, [unloggedSessions]);
  
  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      setError('You must be logged in to log sessions');
      return;
    }
    
    if (selectedSessions.length === 0) {
      setError('Please select at least one session to log');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Build session entries with optional reviews
      const sessions: LogSessionEntry[] = selectedSessions.map(s => {
        const state = sessionStates.get(s.id)!;
        
        // Build review if there's review text
        let review: CreateReviewRequest | undefined;
        if (state.reviewText.trim()) {
          review = {
            body: state.reviewText.trim(),
            containsSpoilers: state.containsSpoilers,
          };
        }
        
        return {
          sessionId: s.id,
          starRating: state.starRating > 0 ? state.starRating : undefined,
          excitementRating: state.excitementRating,
          liked: state.liked,
          review,
        };
      });
      
      // Build experience request if attended
      let experience: CreateExperienceRequest | undefined;
      if (isAttended) {
        experience = {
          venueRating: venueRating || undefined,
          viewRating: viewRating || undefined,
          accessRating: accessRating || undefined,
          facilitiesRating: facilitiesRating || undefined,
          atmosphereRating: atmosphereRating || undefined,
          seatDescription: seatDescription.trim() || undefined,
        };
      }
      
      const request: LogWeekendRequest = {
        roundId: round.id,
        sessions,
        isAttended,
        dateWatched,
        experience,
      };
      
      const response = await logsApi.logWeekend(request);
      
      onSuccess?.(response);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log weekend';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthenticated, selectedSessions, sessionStates, round.id,
    isAttended, dateWatched, venueRating, viewRating, accessRating,
    facilitiesRating, atmosphereRating, seatDescription, onSuccess, onClose
  ]);
  
  // Navigation
  const nextStep = useCallback(() => {
    if (step === 'type') setStep('sessions');
    else if (step === 'sessions') setStep('ratings');
    else if (step === 'ratings') setStep('reviews');
    else if (step === 'reviews' && isAttended) setStep('experience');
    else handleSubmit();
  }, [step, isAttended, handleSubmit]);
  
  const prevStep = useCallback(() => {
    if (step === 'sessions') setStep('type');
    else if (step === 'ratings') setStep('sessions');
    else if (step === 'reviews') setStep('ratings');
    else if (step === 'experience') setStep('reviews');
  }, [step]);
  
  const canProceed = useCallback(() => {
    if (step === 'sessions') return selectedSessions.length > 0;
    return true;
  }, [step, selectedSessions.length]);
  
  // Get steps for progress indicator
  const steps = useMemo(() => {
    const base = ['type', 'sessions', 'ratings', 'reviews'];
    if (isAttended) base.push('experience');
    return base;
  }, [isAttended]);
  
  if (!isOpen) return null;
  
  // No sessions to log
  if (unloggedSessions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md mx-4 p-6 text-center">
          <div className="text-4xl mb-4">🏁</div>
          <h2 className="text-xl font-bold text-neutral-100 mb-2">Weekend Complete!</h2>
          <p className="text-neutral-400 mb-4">You've already logged all sessions for this weekend.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div 
          className="sticky top-0 z-10 p-4 border-b border-neutral-800"
          style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, transparent 50%)` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">
                Log Weekend
              </h2>
              <p className="text-sm text-neutral-400">
                {round.name} • {round.circuit.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s === step 
                    ? 'bg-pf-green' 
                    : i < steps.indexOf(step)
                      ? 'bg-pf-green/50'
                      : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Type Selection */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-200">How did you experience this weekend?</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setIsAttended(false); nextStep(); }}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    !isAttended
                      ? 'border-pf-green bg-pf-green/10'
                      : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50'
                  }`}
                >
                  <div className="text-4xl mb-3">📺</div>
                  <div className="font-semibold text-neutral-200">Watched</div>
                  <div className="text-sm text-neutral-400 mt-1">Broadcast / Stream</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => { setIsAttended(true); nextStep(); }}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    isAttended
                      ? 'border-pf-green bg-pf-green/10'
                      : 'border-neutral-700 hover:border-neutral-500 bg-neutral-800/50'
                  }`}
                >
                  <div className="text-4xl mb-3">🏟️</div>
                  <div className="font-semibold text-neutral-200">Attended</div>
                  <div className="text-sm text-neutral-400 mt-1">In Person</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Session Selection */}
          {step === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-200">Select sessions</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-pf-green hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-neutral-600">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-neutral-400 hover:underline"
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableSessions.map(session => (
                  <SessionSelectionCard
                    key={session.id}
                    session={session}
                    isSelected={sessionStates.get(session.id)?.selected ?? false}
                    isDisabled={session.isLogged}
                    onToggle={() => toggleSession(session.id)}
                    primaryColor={primaryColor}
                  />
                ))}
              </div>
              
              <WeekendCompleteBadge 
                isComplete={isWeekendComplete}
                selectedCount={selectedSessions.length}
                totalCount={unloggedSessions.length}
              />
              
              {/* Date watched */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <label className="text-sm text-neutral-400">When did you {isAttended ? 'attend' : 'watch'}?</label>
                <input
                  type="date"
                  value={dateWatched}
                  onChange={(e) => setDateWatched(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 focus:outline-none focus:border-pf-green"
                />
              </div>
            </div>
          )}

          {/* Step 3: Ratings */}
          {step === 'ratings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-200">Rate each session</h3>
              <p className="text-sm text-neutral-500">Ratings are optional - leave blank if you prefer.</p>
              
              <div className="space-y-3">
                {selectedSessions.map(session => (
                  <SessionRatingRow
                    key={session.id}
                    session={session}
                    state={sessionStates.get(session.id)!}
                    onChange={(updates) => updateSessionState(session.id, updates)}
                  />
                ))}
              </div>
              
              <AggregateRatingDisplay sessions={sessionStates} />
            </div>
          )}

          {/* Step 4: Reviews (optional) */}
          {step === 'reviews' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-200">Write reviews</h3>
                <p className="text-sm text-neutral-500">Optional - add your thoughts on any session.</p>
              </div>
              
              <div className="space-y-4">
                {selectedSessions.map(session => {
                  const state = sessionStates.get(session.id)!;
                  const isMainEvent = session.type === 'Race' || session.type === 'Sprint' || 
                                      session.type === 'MotoGPRace' || session.type === 'Moto2Race' || 
                                      session.type === 'Moto3Race';
                  
                  return (
                    <div 
                      key={session.id}
                      className={`p-4 rounded-lg border ${isMainEvent ? 'bg-neutral-800/70 border-neutral-700' : 'bg-neutral-900/50 border-neutral-800'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-medium ${isMainEvent ? 'text-neutral-100' : 'text-neutral-300'}`}>
                          {session.displayName}
                          {isMainEvent && <span className="ml-2">🏆</span>}
                        </span>
                        {state.reviewText.trim() && (
                          <span className="text-xs text-pf-green">✓ Has review</span>
                        )}
                      </div>
                      
                      <textarea
                        value={state.reviewText}
                        onChange={(e) => updateSessionState(session.id, { reviewText: e.target.value })}
                        placeholder="Write your thoughts about this session... (optional)"
                        rows={3}
                        maxLength={10000}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 text-sm focus:outline-none focus:border-pf-green resize-none"
                      />
                      
                      {state.reviewText.trim() && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.containsSpoilers}
                              onChange={(e) => updateSessionState(session.id, { containsSpoilers: e.target.checked })}
                              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-pf-green focus:ring-pf-green"
                            />
                            Contains spoilers
                          </label>
                          <span className="text-xs text-neutral-500">
                            ({state.reviewText.length}/10,000)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="text-sm text-neutral-500 bg-neutral-800/30 p-3 rounded-lg">
                💡 <strong>Tip:</strong> You can skip this step and add reviews later from the session page.
              </div>
            </div>
          )}

          {/* Step 5: Experience (attended only) */}
          {step === 'experience' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-200">Rate the venue experience</h3>
              <p className="text-sm text-neutral-500">These ratings apply to your overall weekend experience at the venue.</p>
              
              <div className="grid grid-cols-1 gap-4">
                <VenueRating 
                  label="Overall Venue" 
                  value={venueRating} 
                  onChange={setVenueRating} 
                  icon="🏟️" 
                />
                <VenueRating 
                  label="View / Sightlines" 
                  value={viewRating} 
                  onChange={setViewRating} 
                  icon="👁️" 
                />
                <VenueRating 
                  label="Access / Transport" 
                  value={accessRating} 
                  onChange={setAccessRating} 
                  icon="🚗" 
                />
                <VenueRating 
                  label="Facilities (food, toilets)" 
                  value={facilitiesRating} 
                  onChange={setFacilitiesRating} 
                  icon="🍔" 
                />
                <VenueRating 
                  label="Atmosphere" 
                  value={atmosphereRating} 
                  onChange={setAtmosphereRating} 
                  icon="🎉" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-neutral-400">Where did you sit?</label>
                <input
                  type="text"
                  value={seatDescription}
                  onChange={(e) => setSeatDescription(e.target.value)}
                  placeholder="e.g., Turn 1 Grandstand, Row 15"
                  maxLength={500}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-pf-green"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-4 border-t border-neutral-800 bg-neutral-900">
          {step !== 'type' ? (
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : (
            <div />
          )}
          
          <Button
            onClick={nextStep}
            disabled={!canProceed() || isSubmitting}
            isLoading={isSubmitting}
          >
            {step === 'experience' || (step === 'reviews' && !isAttended)
              ? `Log ${selectedSessions.length} Session${selectedSessions.length !== 1 ? 's' : ''} 🏁`
              : 'Next'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
