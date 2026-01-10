import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReviewWithLogDto } from '../types/log';
import type { SpoilerMode } from '../types/api';
import { ROUTES } from '../types/navigation';

// =========================
// Types
// =========================

export interface ReviewCardProps {
  /**
   * The review data to display.
   */
  review: ReviewWithLogDto;
  
  /**
   * User's spoiler mode preference.
   */
  spoilerMode: SpoilerMode;
  
  /**
   * Whether the current user has logged this session.
   * If true, spoiler-marked reviews are always revealed.
   */
  hasLoggedSession?: boolean;
  
  /**
   * Primary color for accents (optional).
   */
  primaryColor?: string;

  /**
   * Current user's ID (to check if they own the review).
   */
  currentUserId?: string;

  /**
   * Callback when user wants to edit their review.
   * Only shown if currentUserId matches review.userId.
   */
  onEdit?: (review: ReviewWithLogDto) => void;
}

// =========================
// Helper Components
// =========================

/**
 * Generate initials from display name for avatar fallback.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Read-only star rating display.
 */
function StarRatingDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const maxStars = 5;
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(maxStars)].map((_, i) => {
        const fillLevel = Math.min(1, Math.max(0, rating - i));
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`${sizeClasses} ${
              fillLevel >= 1 
                ? 'text-yellow-400' 
                : fillLevel > 0 
                  ? 'text-yellow-400/50' 
                  : 'text-neutral-600'
            }`}
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
      <span className="ml-1 text-xs text-neutral-400">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * Excitement rating badge.
 */
function ExcitementBadge({ rating }: { rating: number }) {
  const getColor = (value: number) => {
    if (value >= 8) return 'bg-green-500/20 text-green-400';
    if (value >= 6) return 'bg-yellow-500/20 text-yellow-400';
    if (value >= 4) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor(rating)}`}>
      🔥 {rating}/10
    </span>
  );
}

/**
 * User avatar with initials fallback.
 */
function UserAvatar({ 
  avatarUrl, 
  displayName, 
  size = 'md' 
}: { 
  avatarUrl?: string; 
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-neutral-700 flex items-center justify-center font-medium text-neutral-300`}
    >
      {getInitials(displayName)}
    </div>
  );
}

/**
 * Spoiler blur overlay for review content.
 */
function SpoilerBlurOverlay({ 
  onReveal, 
  isRevealed 
}: { 
  onReveal: () => void; 
  isRevealed: boolean;
}) {
  if (isRevealed) return null;
  
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm rounded-lg cursor-pointer transition-opacity hover:bg-neutral-900/70"
      onClick={onReveal}
    >
      <div className="text-center p-4">
        <span className="text-2xl mb-2 block">🛡️</span>
        <p className="text-sm text-neutral-400">
          This review contains spoilers
        </p>
        <button 
          className="mt-2 px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-neutral-200 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onReveal();
          }}
        >
          Click to reveal
        </button>
      </div>
    </div>
  );
}

// =========================
// Main Component
// =========================

/**
 * Card component displaying a user's review with spoiler protection.
 */
export function ReviewCard({
  review,
  spoilerMode,
  hasLoggedSession = false,
  primaryColor,
  currentUserId,
  onEdit,
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  
  // Character limit for truncation
  const TRUNCATE_LENGTH = 300;
  const shouldTruncate = review.body.length > TRUNCATE_LENGTH;
  const displayedText = shouldTruncate && !isExpanded
    ? review.body.slice(0, TRUNCATE_LENGTH) + '...'
    : review.body;
  
  // Check if current user owns this review
  const isOwnReview = currentUserId && currentUserId === review.userId;
  
  // Determine if spoiler content should be shown
  // - Always show if user has logged the session
  // - Always show if spoilerMode is 'None'
  // - Show if user revealed this specific review
  // - Otherwise hide if review contains spoilers
  const shouldShowSpoilerContent = 
    hasLoggedSession || 
    spoilerMode === 'None' || 
    isSpoilerRevealed ||
    !review.containsSpoilers;
  
  // Format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <article className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 sm:p-5">
      {/* Header: Author info */}
      <div className="flex items-start gap-3 mb-3">
        <Link to={ROUTES.PROFILE || `/users/${review.userId}`}>
          <UserAvatar 
            avatarUrl={review.userAvatarUrl} 
            displayName={review.userDisplayName}
          />
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <Link 
              to={ROUTES.PROFILE || `/users/${review.userId}`}
              className="font-medium text-neutral-200 hover:text-pf-green transition-colors"
            >
              {review.userDisplayName}
            </Link>
            
            {review.isAttended && (
              <span 
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: primaryColor ? `${primaryColor}20` : 'rgba(74, 222, 128, 0.1)',
                  color: primaryColor || '#4ade80',
                }}
              >
                🎫 Attended
              </span>
            )}
            
            {review.containsSpoilers && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                ⚠️ Spoilers
              </span>
            )}
          </div>
          
          <p className="text-xs text-neutral-500 mt-0.5">
            {formatDate(review.createdAt)}
          </p>
        </div>
      </div>
      
      {/* Ratings row */}
      <div className="flex items-center flex-wrap gap-3 mb-3">
        {review.starRating !== undefined && review.starRating !== null && (
          <StarRatingDisplay rating={review.starRating} />
        )}
        
        {review.excitementRating !== undefined && review.excitementRating !== null && (
          <ExcitementBadge rating={review.excitementRating} />
        )}
        
        {review.liked && (
          <span className="text-pf-red text-sm">❤️</span>
        )}
      </div>
      
      {/* Review body with spoiler protection */}
      <div className="relative">
        <div 
          className={`
            text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap
            ${!shouldShowSpoilerContent ? 'blur-md select-none' : ''}
          `}
        >
          {displayedText}
        </div>
        
        {!shouldShowSpoilerContent && (
          <SpoilerBlurOverlay 
            onReveal={() => setIsSpoilerRevealed(true)} 
            isRevealed={isSpoilerRevealed}
          />
        )}
        
        {/* Read more/less button */}
        {shouldTruncate && shouldShowSpoilerContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-accent-green hover:text-pf-green/80 transition-colors"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
      
      {/* Footer: Engagement stats and actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800">
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <span>❤️</span> {review.likeCount}
          </span>
          
          {review.commentCount > 0 && (
            <span className="text-xs text-neutral-500 flex items-center gap-1">
              <span>💬</span> {review.commentCount}
            </span>
          )}
        </div>

        {/* Edit button (only for own reviews) */}
        {isOwnReview && onEdit && (
          <button
            onClick={() => onEdit(review)}
            className="text-xs text-neutral-400 hover:text-pf-green transition-colors flex items-center gap-1"
          >
            <span>✏️</span> Edit
          </button>
        )}
      </div>
    </article>
  );
}

// =========================
// Skeleton Component
// =========================

/**
 * Loading skeleton for ReviewCard.
 */
export function ReviewCardSkeleton() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 sm:p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-neutral-800" />
        <div className="flex-1">
          <div className="h-4 bg-neutral-800 rounded w-24 mb-1" />
          <div className="h-3 bg-neutral-800 rounded w-16" />
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 bg-neutral-800 rounded w-20" />
        <div className="h-5 bg-neutral-800 rounded w-16" />
      </div>
      
      <div className="space-y-2">
        <div className="h-3 bg-neutral-800 rounded w-full" />
        <div className="h-3 bg-neutral-800 rounded w-full" />
        <div className="h-3 bg-neutral-800 rounded w-3/4" />
      </div>
      
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-800">
        <div className="h-3 bg-neutral-800 rounded w-12" />
        <div className="h-3 bg-neutral-800 rounded w-12" />
      </div>
    </div>
  );
}

export default ReviewCard;
