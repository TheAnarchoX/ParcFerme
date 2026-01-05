import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Styled input component with label and error display.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-neutral-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-lg
            bg-neutral-900 border border-neutral-700
            text-neutral-100 placeholder-neutral-500
            focus:outline-none focus:ring-2 focus:ring-pf-green/50 focus:border-pf-green
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-pf-red-500 focus:ring-pf-red-500/50 focus:border-pf-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-pf-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
