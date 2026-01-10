import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { logsApi } from '../../services/logsService';
import type {
  CreateLogRequest,
  CreateReviewRequest,
  CreateExperienceRequest,
  LogDetailDto,
} from '../../types/log';
import type { SessionDetailDto } from '../../types/spoiler';
import { Button } from '../ui/Button';

// =========================
// Types
// =========================

interface LogModalProps {
  session: SessionDetailDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (log: LogDetailDto) => void;
  existingLog?: LogDetailDto;
}

type LogStep = 'type' | 'rating' | 'review' | 'experience';

// =========================
// Star Rating Component
// =========================

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
}

function StarRating({ value, onChange, max = 5, step = 0.5, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const stars = [];
  for (let i = step; i <= max; i += step) {
    const isFilled = (hoverValue ?? value) >= i;
    const isHalf = (hoverValue ?? value) >= i - step && (hoverValue ?? value) < i;
    
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
          className={`w-full h-full ${isFilled ? 'text-yellow-400' : isHalf ? 'text-yellow-400/50' : 'text-neutral-600'}`}
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {stars}
      <span className="ml-2 text-sm text-neutral-400">
        {value > 0 ? `${value.toFixed(1)}` : 'Not rated'}
      </span>
    </div>
  );
}

// =========================
// Excitement Slider Component
// =========================

interface ExcitementSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function ExcitementSlider({ value, onChange }: ExcitementSliderProps) {
  const getLabel = (val: number) => {
    if (val >= 9) return 'Thriller! 🔥';
    if (val >= 7) return 'Exciting';
    if (val >= 5) return 'Good';
    if (val >= 3) return 'Average';
    return 'Boring 😴';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-400">Excitement Rating</span>
        <span className={`text-lg font-bold ${value >= 8 ? 'text-green-400' : value >= 6 ? 'text-yellow-400' : value >= 4 ? 'text-orange-400' : 'text-red-400'}`}>
          {value}/10 - {getLabel(value)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${value >= 8 ? '#22c55e' : value >= 6 ? '#eab308' : value >= 4 ? '#f97316' : '#ef4444'} 0%, ${value >= 8 ? '#22c55e' : value >= 6 ? '#eab308' : value >= 4 ? '#f97316' : '#ef4444'} ${value * 10}%, #404040 ${value * 10}%, #404040 100%)`
          }}
        />
        <div className="flex justify-between mt-1 text-xs text-neutral-500">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>
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
// Main Log Modal Component
// =========================

export function LogModal({ session, isOpen, onClose, onSuccess, existingLog }: LogModalProps) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Form state
  const [step, setStep] = useState<LogStep>('type');
  const [isAttended, setIsAttended] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [excitementRating, setExcitementRating] = useState(5);
  const [liked, setLiked] = useState(false);
  const [dateWatched, setDateWatched] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today ?? '';
  });
  
  // Review state
  const [reviewBody, setReviewBody] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(true);
  
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

  // Pre-fill form if editing
  useEffect(() => {
    if (existingLog) {
      setIsAttended(existingLog.isAttended);
      setStarRating(existingLog.starRating ?? 0);
      setExcitementRating(existingLog.excitementRating ?? 5);
      setLiked(existingLog.liked);
      setDateWatched(existingLog.dateWatched ?? new Date().toISOString().split('T')[0] ?? '');
      
      if (existingLog.review) {
        setReviewBody(existingLog.review.body);
        setContainsSpoilers(existingLog.review.containsSpoilers);
      }
      
      if (existingLog.experience) {
        setVenueRating(existingLog.experience.venueRating ?? 0);
        setViewRating(existingLog.experience.viewRating ?? 0);
        setAccessRating(existingLog.experience.accessRating ?? 0);
        setFacilitiesRating(existingLog.experience.facilitiesRating ?? 0);
        setAtmosphereRating(existingLog.experience.atmosphereRating ?? 0);
        setSeatDescription(existingLog.experience.seatDescription ?? '');
      }
      
      // Skip type selection if editing
      setStep('rating');
    }
  }, [existingLog]);

  // Auto-set spoiler warning for recent sessions
  useEffect(() => {
    const sessionDate = new Date(session.startTimeUtc);
    const now = new Date();
    const diffDays = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);
    setContainsSpoilers(diffDays < 7);
  }, [session.startTimeUtc]);

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated) {
      setError('You must be logged in to log a session');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build review request if review body is provided
      let review: CreateReviewRequest | undefined;
      if (reviewBody.trim()) {
        review = {
          body: reviewBody.trim(),
          containsSpoilers,
        };
      }

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

      const request: CreateLogRequest = {
        sessionId: session.id,
        isAttended,
        starRating: starRating || undefined,
        excitementRating: excitementRating,
        liked,
        dateWatched,
        review,
        experience,
      };

      const log = await logsApi.createLog(request);
      
      onSuccess?.(log);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log session';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthenticated, session.id, isAttended, starRating, excitementRating,
    liked, dateWatched, reviewBody, containsSpoilers, venueRating, viewRating,
    accessRating, facilitiesRating, atmosphereRating, seatDescription,
    onSuccess, onClose
  ]);

  const nextStep = useCallback(() => {
    if (step === 'type') setStep('rating');
    else if (step === 'rating') setStep('review');
    else if (step === 'review' && isAttended) setStep('experience');
    else handleSubmit();
  }, [step, isAttended, handleSubmit]);

  const prevStep = useCallback(() => {
    if (step === 'rating') setStep('type');
    else if (step === 'review') setStep('rating');
    else if (step === 'experience') setStep('review');
  }, [step]);

  const canProceed = useCallback(() => {
    if (step === 'type') return true;
    if (step === 'rating') return true; // Ratings are optional
    if (step === 'review') return true; // Review is optional
    if (step === 'experience') return true; // Experience ratings are optional
    return true;
  }, [step]);

  if (!isOpen) return null;

  // Get primary color from round if available (via series brand colors or default)
  const primaryColor = '#00FF87'; // Default pf-green since SessionDetailDto doesn't expose brand colors

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div 
          className="sticky top-0 z-10 p-4 border-b border-neutral-800 rounded-t-2xl"
          style={{ background: `linear-gradient(135deg, ${primaryColor}20 0%, transparent 50%)` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-100">
                {existingLog ? 'Edit Log' : 'Log this Session'}
              </h2>
              <p className="text-sm text-neutral-400">{session.name}</p>
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
            {['type', 'rating', 'review', ...(isAttended ? ['experience'] : [])].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s === step 
                    ? 'bg-pf-green' 
                    : ['type', 'rating', 'review', 'experience'].indexOf(s) < ['type', 'rating', 'review', 'experience'].indexOf(step)
                      ? 'bg-pf-green/50'
                      : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Type Selection */}
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-200">How did you experience this?</h3>
              
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

          {/* Step 2: Ratings */}
          {step === 'rating' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-200">Rate your experience</h3>
              
              {/* Star Rating */}
              <div className="space-y-2">
                <label className="text-sm text-neutral-400">Star Rating</label>
                <StarRating value={starRating} onChange={setStarRating} />
              </div>
              
              {/* Excitement Rating */}
              <ExcitementSlider value={excitementRating} onChange={setExcitementRating} />
              
              {/* Like toggle */}
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  liked
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500'
                }`}
              >
                <span className="text-xl">{liked ? '❤️' : '🤍'}</span>
                <span>{liked ? 'Liked' : 'Like this race'}</span>
              </button>
              
              {/* Date watched */}
              <div className="space-y-2">
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

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-200">Write a review (optional)</h3>
              
              <textarea
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="Share your thoughts on this session..."
                rows={5}
                maxLength={10000}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-pf-green resize-none"
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-neutral-400">
                  <input
                    type="checkbox"
                    checked={containsSpoilers}
                    onChange={(e) => setContainsSpoilers(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-pf-green focus:ring-pf-green"
                  />
                  Contains spoilers
                </label>
                <span className="text-xs text-neutral-500">
                  {reviewBody.length}/10,000
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Experience (attended only) */}
          {step === 'experience' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-200">Rate the venue experience</h3>
              
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
        <div className="sticky bottom-0 flex items-center justify-between p-4 border-t border-neutral-800 bg-neutral-900 rounded-b-2xl">
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
            {step === 'experience' || (step === 'review' && !isAttended)
              ? (existingLog ? 'Update Log' : 'Log It! 🏁')
              : 'Next'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
