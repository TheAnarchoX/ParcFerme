import { ReactNode, useState } from 'react';
import { useSpoilerVisibility, useSpoilerRevealDialog } from '../../hooks/useSpoilerShield';

// =========================
// SpoilerMask Component
// =========================

interface SpoilerMaskProps {
  /**
   * Session ID to check visibility for.
   */
  sessionId: string;
  
  /**
   * Content to show when spoilers are revealed.
   */
  children: ReactNode;
  
  /**
   * Content to show in partial visibility mode (e.g., excitement rating).
   */
  partialContent?: ReactNode;
  
  /**
   * Custom placeholder when content is hidden.
   */
  placeholder?: ReactNode;
  
  /**
   * Whether to allow temporary reveal (without logging).
   */
  allowTempReveal?: boolean;
  
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Component that masks spoiler content based on user's spoiler settings.
 */
export function SpoilerMask({
  sessionId,
  children,
  partialContent,
  placeholder,
  allowTempReveal = true,
  className = '',
}: SpoilerMaskProps) {
  const { visibility } = useSpoilerVisibility(sessionId);

  if (visibility === 'full') {
    return <div className={className}>{children}</div>;
  }

  if (visibility === 'partial' && partialContent) {
    return (
      <div className={className}>
        {partialContent}
        <SpoilerRevealButton
          sessionId={sessionId}
          size="sm"
          allowTempReveal={allowTempReveal}
        />
      </div>
    );
  }

  // Hidden state
  return (
    <div className={`relative ${className}`}>
      {placeholder || <SpoilerPlaceholder />}
      <div className="absolute inset-0 flex items-center justify-center">
        <SpoilerRevealButton
          sessionId={sessionId}
          allowTempReveal={allowTempReveal}
        />
      </div>
    </div>
  );
}

// =========================
// SpoilerBlur Component
// =========================

interface SpoilerBlurProps {
  /**
   * Session ID to check visibility for.
   */
  sessionId: string;
  
  /**
   * Content to blur/reveal.
   */
  children: ReactNode;
  
  /**
   * Blur intensity (px).
   */
  blurAmount?: number;
  
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Component that blurs content when spoilers should be hidden.
 */
export function SpoilerBlur({
  sessionId,
  children,
  blurAmount = 8,
  className = '',
}: SpoilerBlurProps) {
  const { shouldShow } = useSpoilerVisibility(sessionId);

  return (
    <div 
      className={`relative ${className}`}
      style={{
        filter: shouldShow ? 'none' : `blur(${blurAmount}px)`,
        transition: 'filter 0.3s ease-in-out',
      }}
    >
      {children}
      {!shouldShow && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-neutral-900/50"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <SpoilerRevealButton sessionId={sessionId} />
        </div>
      )}
    </div>
  );
}

// =========================
// SpoilerPlaceholder Component
// =========================

interface SpoilerPlaceholderProps {
  /**
   * Type of content being hidden.
   */
  type?: 'result' | 'winner' | 'classification' | 'generic';
  
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Placeholder content shown when spoilers are hidden.
 */
export function SpoilerPlaceholder({ 
  type = 'generic', 
  className = '' 
}: SpoilerPlaceholderProps) {
  const messages = {
    result: {
      icon: '🏁',
      text: 'Result hidden to avoid spoilers',
    },
    winner: {
      icon: '🏆',
      text: 'Winner hidden',
    },
    classification: {
      icon: '📊',
      text: 'Classification hidden',
    },
    generic: {
      icon: '🛡️',
      text: 'Spoiler protection enabled',
    },
  };

  const message = messages[type];
  const { icon, text } = message;

  return (
    <div 
      className={`
        flex flex-col items-center justify-center gap-2 p-6
        bg-neutral-800/50 border border-neutral-700 rounded-lg
        text-neutral-400
        ${className}
      `}
    >
      <span className="text-3xl" role="img" aria-label="Spoiler shield">
        {icon}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

// =========================
// SpoilerRevealButton Component
// =========================

interface SpoilerRevealButtonProps {
  /**
   * Session ID to reveal spoilers for.
   */
  sessionId: string;
  
  /**
   * Whether to allow temporary reveal (without logging).
   */
  allowTempReveal?: boolean;
  
  /**
   * Button size.
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Custom button text.
   */
  text?: string;
  
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Button to reveal spoilers for a session.
 */
export function SpoilerRevealButton({
  sessionId,
  allowTempReveal = true,
  size = 'md',
  text,
  className = '',
}: SpoilerRevealButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { handleReveal, isLoading } = useSpoilerRevealDialog();

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const buttonText = text || (allowTempReveal ? 'Reveal' : 'Mark as Watched');

  const onReveal = async (permanent: boolean) => {
    await handleReveal(sessionId, permanent);
    setShowDialog(false);
  };

  if (showDialog) {
    return (
      <SpoilerRevealDialog
        onConfirm={() => onReveal(true)}
        onTempReveal={allowTempReveal ? () => onReveal(false) : undefined}
        onCancel={() => setShowDialog(false)}
        isLoading={isLoading}
      />
    );
  }

  return (
    <button
      onClick={() => setShowDialog(true)}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2
        bg-pf-red/90 hover:bg-pf-red text-white
        font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizes[size]}
        ${className}
      `}
    >
      <span>👁️</span>
      {buttonText}
    </button>
  );
}

// =========================
// SpoilerRevealDialog Component
// =========================

interface SpoilerRevealDialogProps {
  /**
   * Called when user confirms permanent reveal.
   */
  onConfirm: () => void;
  
  /**
   * Called when user chooses temporary reveal.
   */
  onTempReveal?: () => void;
  
  /**
   * Called when user cancels.
   */
  onCancel: () => void;
  
  /**
   * Whether an action is in progress.
   */
  isLoading?: boolean;
}

/**
 * Dialog to confirm spoiler reveal.
 */
export function SpoilerRevealDialog({
  onConfirm,
  onTempReveal,
  onCancel,
  isLoading = false,
}: SpoilerRevealDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span>⚠️</span>
          Reveal Spoilers?
        </h3>
        
        <p className="text-neutral-400 text-sm mb-6">
          Are you sure you want to reveal the results for this session? 
          This action may spoil the race outcome.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="
              w-full px-4 py-3 
              bg-pf-green text-neutral-950 font-medium rounded-lg
              hover:bg-pf-green-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {isLoading ? 'Revealing...' : '✓ Yes, I\'ve watched this'}
          </button>
          
          {onTempReveal && (
            <button
              onClick={onTempReveal}
              disabled={isLoading}
              className="
                w-full px-4 py-3
                bg-neutral-800 text-neutral-200 font-medium rounded-lg
                border border-neutral-700
                hover:bg-neutral-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              👁️ Just peek (don't log)
            </button>
          )}
          
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="
              w-full px-4 py-3
              text-neutral-400 font-medium
              hover:text-neutral-200
              transition-colors
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================
// SpoilerBadge Component
// =========================

interface SpoilerBadgeProps {
  /**
   * Whether this content contains spoilers.
   */
  containsSpoilers: boolean;
  
  /**
   * Size of the badge.
   */
  size?: 'sm' | 'md';
  
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Badge indicating content may contain spoilers.
 */
export function SpoilerBadge({ 
  containsSpoilers, 
  size = 'md',
  className = '' 
}: SpoilerBadgeProps) {
  if (!containsSpoilers) return null;

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1
        bg-pf-red/20 text-pf-red border border-pf-red/30
        rounded-full font-medium
        ${sizes[size]}
        ${className}
      `}
    >
      <span>⚠️</span>
      Spoilers
    </span>
  );
}

// =========================
// ExcitementMeter Component (Spoiler-Safe)
// =========================

interface ExcitementMeterProps {
  /**
   * Excitement rating (0-10).
   */
  rating: number | null | undefined;
  
  /**
   * Whether to show the numeric value.
   */
  showValue?: boolean;
  
  /**
   * Size of the meter.
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Additional class names.
   */
  className?: string;
}

/**
 * Visual meter showing excitement level.
 * This is spoiler-safe and can always be shown.
 */
export function ExcitementMeter({
  rating,
  showValue = true,
  size = 'md',
  className = '',
}: ExcitementMeterProps) {
  if (rating === null || rating === undefined) {
    return (
      <div className={`text-neutral-500 text-sm ${className}`}>
        No ratings yet
      </div>
    );
  }

  // Normalize to 0-100
  const percentage = Math.min(100, Math.max(0, rating * 10));
  
  // Color based on rating
  const getColor = (value: number) => {
    if (value >= 8) return 'bg-pf-green';
    if (value >= 6) return 'bg-yellow-500';
    if (value >= 4) return 'bg-orange-500';
    return 'bg-pf-red';
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`flex-1 bg-neutral-800 rounded-full overflow-hidden ${heights[size]}`}
        title={`Excitement: ${rating.toFixed(1)}/10`}
      >
        <div
          className={`${getColor(rating)} ${heights[size]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="text-sm font-mono text-neutral-300 min-w-[3ch]">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
