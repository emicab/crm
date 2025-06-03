// components/ui/Input.tsx
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, name, error, icon, ...props }, ref) => {
    const inputClasses = `
      flex h-10 w-full rounded-md border border-border 
      bg-background px-3 py-2 text-sm text-foreground
      file:border-0 file:bg-transparent file:text-sm file:font-medium 
      placeholder:text-foreground-muted 
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
        <div className="relative"> 
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            name={name}
            id={name}
            className={`${inputClasses} ${icon ? 'pl-10' : ''}`} // Añadir padding si hay icono
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;