import React from 'react';

export interface AppProgressProps {
  value: number; // 0 - 100
  label?: string;
  showValue?: boolean;
  valueLabel?: string;
  variant?: 'pine' | 'teal' | 'copper' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AppProgress({
  value,
  label,
  showValue = false,
  valueLabel,
  variant = 'pine',
  size = 'md',
  className = '',
}: AppProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  const fillColors = {
    pine: 'bg-[var(--app-accent)]',
    teal: 'bg-[var(--app-success)]',
    copper: 'bg-[var(--app-copper)]',
    warning: 'bg-[var(--app-warning)]',
    danger: 'bg-[var(--app-danger)]',
    info: 'bg-[var(--app-info)]',
  }[variant];

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--app-muted)] select-none">
          {label && <span>{label}</span>}
          {showValue && (
            <span className="font-mono text-[var(--app-foreground)]">
              {valueLabel || `${Math.round(clampedValue)}%`}
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Tiến độ'}
        className={`w-full overflow-hidden rounded-[6px] bg-[var(--app-surface-hover)] border border-[var(--app-border)] ${heightStyles}`}
        style={{ borderRadius: '6px' }}
      >
        <div
          className={`h-full rounded-[4px] transition-all duration-300 ease-out ${fillColors}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
