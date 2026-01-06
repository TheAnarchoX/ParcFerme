import { ReactNode } from 'react';
import { Header } from './Header';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import type { BreadcrumbItem } from '../../types/navigation';

// =========================
// Props
// =========================

interface MainLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Override breadcrumbs (optional, uses Redux state by default) */
  breadcrumbs?: BreadcrumbItem[];
  /** Whether to show breadcrumbs (default: true for deep pages) */
  showBreadcrumbs?: boolean;
  /** Additional CSS classes for the main content area */
  className?: string;
  /** Whether this is a full-width page (no max-width constraint) */
  fullWidth?: boolean;
  /** Whether to add padding at the top for the fixed header */
  withHeaderPadding?: boolean;
}

// =========================
// Component
// =========================

/**
 * Main layout wrapper with header, breadcrumbs, and content area.
 * Use this for all discovery and detail pages.
 */
export function MainLayout({ 
  children, 
  breadcrumbs,
  showBreadcrumbs = true,
  className = '',
  fullWidth = false,
  withHeaderPadding = true,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen app-background">
      <Header />
      
      <main className={`${withHeaderPadding ? 'pt-16' : ''}`}>
        {/* Breadcrumbs bar */}
        {showBreadcrumbs && (
          <div className="border-b border-neutral-800/50 bg-neutral-950/30">
            <div className={`${fullWidth ? 'px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
              <Breadcrumbs items={breadcrumbs} className="py-3" />
            </div>
          </div>
        )}
        
        {/* Main content */}
        <div className={`${fullWidth ? '' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8 py-6 ${className}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

// =========================
// Page Header Component
// =========================

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon/emoji */
  icon?: string;
  /** Optional actions (buttons, etc.) to show on the right */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Consistent page header with title, subtitle, and optional actions.
 */
export function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  actions,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 ${className}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-100 flex items-center gap-3">
          {icon && <span className="text-3xl" aria-hidden="true">{icon}</span>}
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-neutral-400">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

// =========================
// Section Component
// =========================

interface SectionProps {
  /** Section title */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Section content */
  children: ReactNode;
  /** Optional actions for the section header */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Section wrapper with optional title and consistent spacing.
 */
export function Section({ title, subtitle, children, actions, className = '' }: SectionProps) {
  return (
    <section className={`mb-10 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// =========================
// Empty State Component
// =========================

interface EmptyStateProps {
  /** Icon or emoji */
  icon?: string;
  /** Main message */
  title: string;
  /** Description */
  description?: string;
  /** Optional action button */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state display for pages with no content.
 */
export function EmptyState({ icon = '🏁', title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <span className="text-5xl mb-4" aria-hidden="true">{icon}</span>
      <h3 className="text-lg font-semibold text-neutral-200 mb-2">{title}</h3>
      {description && (
        <p className="text-neutral-400 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}

// =========================
// Loading State Component
// =========================

interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading state display.
 */
export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pf-green mb-4" />
      <p className="text-neutral-400 text-sm">{message}</p>
    </div>
  );
}

// =========================
// Error State Component
// =========================

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Optional retry action */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Error state display.
 */
export function ErrorState({ 
  title = 'Something went wrong', 
  message, 
  onRetry,
  className = '' 
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <span className="text-5xl mb-4" aria-hidden="true">⚠️</span>
      <h3 className="text-lg font-semibold text-neutral-200 mb-2">{title}</h3>
      <p className="text-neutral-400 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
