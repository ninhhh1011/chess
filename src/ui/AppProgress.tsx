import React from 'react';
import { ProgressBar as HeroUIProgressBar, Label as HeroUILabel } from '@heroui/react';

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
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }[size] || 'h-3';

  const fillColors = {
    pine: 'bg-[var(--app-secondary)]',
    teal: 'bg-[var(--app-success)]',
    copper: 'bg-[#030302]',
    warning: 'bg-[var(--app-warning)]',
    danger: 'bg-[var(--app-danger)]',
    info: 'bg-[var(--app-info)]',
  }[variant] || 'bg-[var(--app-secondary)]';

  return (
    <HeroUIProgressBar
      value={clampedValue}
      minValue={0}
      maxValue={100}
      aria-label={label || 'Tiến độ'}
      className={`w-full flex flex-col gap-1.5 ${className}`}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--app-muted)] select-none">
          {label && <HeroUILabel>{label}</HeroUILabel>}
          {showValue && (
            <HeroUIProgressBar.Output className="font-mono text-[#030302] font-medium">
              {valueLabel || `${Math.round(clampedValue)}%`}
            </HeroUIProgressBar.Output>
          )}
        </div>
      )}

      <HeroUIProgressBar.Track
        className={`w-full overflow-hidden rounded-full bg-[var(--app-muted-surface)] border border-[var(--app-border)] ${heightStyles}`}
        style={{ borderRadius: '9999px' }}
      >
        <HeroUIProgressBar.Fill
          className={`h-full rounded-full transition-all duration-300 ease-out ${fillColors}`}
          style={{ width: `${clampedValue}%`, borderRadius: '9999px' }}
        />
      </HeroUIProgressBar.Track>
    </HeroUIProgressBar>
  );
}
