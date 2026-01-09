/**
 * Unified Pagination component for discovery pages.
 * Provides consistent styling and behavior across all paginated lists.
 */

import { useCallback } from 'react';

// =========================
// Types
// =========================

export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of items across all pages */
  totalCount: number;
  /** Number of items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Label for the items being paginated (e.g., "drivers", "teams") */
  itemLabel?: string;
  /** Whether to show the "Showing X-Y of Z" text */
  showItemRange?: boolean;
  /** Whether to scroll to top on page change */
  scrollToTop?: boolean;
}

// =========================
// Component
// =========================

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  isLoading = false,
  itemLabel = 'items',
  showItemRange = true,
  scrollToTop = true,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  
  // Don't render if only one page
  if (totalPages <= 1) return null;
  
  const handlePageChange = useCallback((newPage: number) => {
    onPageChange(newPage);
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [onPageChange, scrollToTop]);
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-neutral-800">
      {/* Item range display */}
      {showItemRange && (
        <p className="text-sm text-neutral-500 order-2 sm:order-1">
          Showing {startItem}-{endItem} of {totalCount.toLocaleString()} {itemLabel}
        </p>
      )}
      
      {/* Pagination controls */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrevious || isLoading}
          className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors flex items-center gap-1"
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
          <span className="hidden sm:inline">Previous</span>
        </button>
        
        {/* Page number buttons for larger screens */}
        <div className="hidden md:flex items-center gap-1">
          {generatePageNumbers(currentPage, totalPages).map((pageNum, idx) => (
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-2 text-neutral-500">
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum as number)}
                disabled={isLoading}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  pageNum === currentPage
                    ? 'bg-accent-green text-neutral-900 font-semibold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>
        
        {/* Compact page indicator for mobile */}
        <span className="md:hidden px-3 py-2 text-sm text-neutral-400">
          {currentPage} / {totalPages}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNext || isLoading}
          className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors flex items-center gap-1"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}

// =========================
// Helper Functions
// =========================

/**
 * Generate array of page numbers to display with ellipsis.
 * Shows first, last, and pages around current page.
 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  
  const pages: (number | '...')[] = [];
  
  // Always show first page
  pages.push(1);
  
  if (current > 3) {
    pages.push('...');
  }
  
  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  if (current < total - 2) {
    pages.push('...');
  }
  
  // Always show last page
  if (total > 1) {
    pages.push(total);
  }
  
  return pages;
}

// =========================
// Icons
// =========================

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default Pagination;
