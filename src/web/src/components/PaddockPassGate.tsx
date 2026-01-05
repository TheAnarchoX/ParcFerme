import { ReactNode } from 'react';
import { usePaddockPass } from '../hooks/useAuth';

interface PaddockPassOnlyProps {
  children: ReactNode;
  /** Content to show for non-premium users */
  fallback?: ReactNode;
}

/**
 * Component wrapper that only renders children for PaddockPass members.
 * Shows fallback content (or nothing) for free tier users.
 */
export function PaddockPassOnly({ children, fallback = null }: PaddockPassOnlyProps) {
  const isPaddockPass = usePaddockPass();
  
  if (!isPaddockPass) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Component wrapper that only renders for free tier users.
 * Useful for showing upgrade prompts.
 */
export function FreeOnly({ children }: { children: ReactNode }) {
  const isPaddockPass = usePaddockPass();
  
  if (isPaddockPass) {
    return null;
  }
  
  return <>{children}</>;
}

/**
 * Upgrade prompt component for free tier users.
 */
export function UpgradePrompt({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-pf-green/20 to-pf-yellow/20 rounded-lg p-4 border border-pf-green/30 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-pf-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-white">Paddock Pass</h4>
          <p className="text-xs text-neutral-400">Unlock advanced stats, extended history, and more.</p>
        </div>
        <a
          href="/upgrade"
          className="px-3 py-1.5 bg-pf-green text-black text-sm font-medium rounded hover:bg-pf-green/90 transition-colors"
        >
          Upgrade
        </a>
      </div>
    </div>
  );
}
