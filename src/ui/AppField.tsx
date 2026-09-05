import React from 'react';

export interface AppFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const AppField = React.forwardRef<HTMLInputElement, AppFieldProps>(
  (
    {
      label,
      description,
      error,
      leftIcon,
      rightAction,
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    const inputId = id || (label ? `field-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[var(--app-muted)] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[var(--app-subtle)] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-9 rounded-[8px] border bg-[var(--app-surface)] text-sm text-[var(--app-foreground)] placeholder-[var(--app-subtle)] transition-colors duration-150 ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightAction ? 'pr-12' : 'pr-3'} ${
              error
                ? 'border-[var(--app-danger)] focus:border-[var(--app-danger)] focus:ring-1 focus:ring-[var(--app-danger)]'
                : 'border-[var(--app-border)] focus:border-[var(--app-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]'
            } ${className}`}
            style={{ borderRadius: '8px' }}
            {...rest}
          />
          {rightAction && (
            <div className="absolute right-2 flex items-center">
              {rightAction}
            </div>
          )}
        </div>
        {description && !error && (
          <p className="text-[11px] text-[var(--app-subtle)]">{description}</p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--app-danger)] font-medium">{error}</p>
        )}
      </div>
    );
  }
);

AppField.displayName = 'AppField';
