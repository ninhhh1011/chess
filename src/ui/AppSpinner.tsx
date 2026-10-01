import React from 'react';
import { Spinner as HeroUISpinner } from '@heroui/react';
import type { ComponentProps } from 'react';

export interface AppSpinnerProps extends ComponentProps<typeof HeroUISpinner> {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function AppSpinner({
  className = '',
  size = 'sm',
  label,
  color = 'current',
  ...rest
}: AppSpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <HeroUISpinner size={size} color={color} {...rest} />
      {label && <span className="text-xs text-[var(--app-muted)]">{label}</span>}
    </span>
  );
}
