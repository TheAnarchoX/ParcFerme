import { useState } from 'react';
import { Button } from './Button';

// =========================
// Types
// =========================

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  itemName?: string;
  warningText?: string;
}

// =========================
// Delete Confirmation Modal Component
// =========================

/**
 * A reusable confirmation modal for delete operations.
 * Warns users about permanent data loss and requires explicit confirmation.
 * 
 * @example
 * <DeleteConfirmationModal
 *   isOpen={isDeleteModalOpen}
 *   onClose={() => setIsDeleteModalOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Log"
 *   description="Are you sure you want to delete this log?"
 *   itemName="2024 Monaco GP - Race"
 *   warningText="This will also delete any associated review and venue experience data."
 * />
 */
export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  warningText,
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete operation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
      >
        {/* Header with warning accent */}
        <div className="p-6 pb-0">
          <div className="flex items-start gap-4">
            {/* Warning Icon */}
            <div className="shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            {/* Title and Description */}
            <div className="flex-1">
              <h2 
                id="delete-modal-title" 
                className="text-lg font-bold text-neutral-100"
              >
                {title}
              </h2>
              <p 
                id="delete-modal-description" 
                className="mt-1 text-sm text-neutral-400"
              >
                {description}
              </p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="shrink-0 p-1 hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Item being deleted */}
          {itemName && (
            <div className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg">
              <p className="text-sm text-neutral-300 font-medium">{itemName}</p>
            </div>
          )}
          
          {/* Warning text */}
          {warningText && (
            <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <svg 
                className="w-4 h-4 text-red-400 mt-0.5 shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <p className="text-sm text-red-300">{warningText}</p>
            </div>
          )}

          {/* Permanent deletion warning */}
          <p className="text-sm text-neutral-500">
            ⚠️ This action cannot be undone.
          </p>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-800 bg-neutral-900/50">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isDeleting}
            isLoading={isDeleting}
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
