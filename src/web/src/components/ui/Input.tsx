import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Optional helper text shown below the input */
  helperText?: string;
}

/**
 * Styled input component with label and error display.
 * Follows WCAG 2.1 AA accessibility guidelines.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-neutral-300 mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-pf-red ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-neutral-900 border border-neutral-700
            text-neutral-100 placeholder-neutral-500
            focus:outline-none focus:ring-2 focus:ring-pf-green/50 focus:border-pf-green
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-pf-red focus:ring-pf-red/50 focus:border-pf-red' : ''}
            ${className}
          `}
          {...props}
        />
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-neutral-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-pf-red" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
