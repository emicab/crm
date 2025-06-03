// components/ui/Select.tsx
import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, name, error, children, ...props }, ref) => {
    const selectClasses = `
      flex h-10 w-full rounded-md border border-border 
      bg-background px-3 py-2 text-sm text-foreground
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
      disabled:cursor-not-allowed disabled:opacity-50
      ${error ? 'border-destructive focus-visible:ring-destructive' : ''}
      ${className}
    `;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-foreground-muted mb-1.5">
            {label}
          </label>
        )}
        <select
          name={name}
          id={name}
          className={selectClasses}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export default Select;