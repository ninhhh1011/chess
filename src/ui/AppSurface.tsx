import React from 'react';
import { Surface as HeroUISurface } from '@heroui/react';

export interface AppSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'base' | 'raised' | 'hover' | 'transparent';
  radius?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
  hasBorder?: boolean;
}

export function AppSurface({
  children,
  variant = 'base',
  radius = 'md',
  className = '',
  hasBorder = true,
  style,
  ...rest
}: AppSurfaceProps) {
  const variantStyles = {
    base: 'bg-[var(--app-surface)]',
    raised: 'bg-[var(--app-surface-raised)]',
    hover: 'bg-[var(--app-surface-hover)]',
    transparent: 'bg-transparent',
  }[variant];

  const radiusStyles = {
    none: 'rounded-none',
    sm: 'rounded-[8px]',
    md: 'rounded-[10px]',
    lg: 'rounded-[12px]',
  }[radius];

  const borderClass = hasBorder ? 'border border-[var(--app-border)]' : '';
  const heroUIVariant = {
    base: 'default' as const,
    raised: 'secondary' as const,
    hover: 'secondary' as const,
    transparent: 'transparent' as const,
  }[variant];

  return (
    <HeroUISurface
      variant={heroUIVariant}
      className={`${variantStyles} ${radiusStyles} ${borderClass} ${className}`}
      style={{
        borderRadius: radius === 'md' ? '10px' : radius === 'sm' ? '8px' : radius === 'lg' ? '12px' : 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </HeroUISurface>
  );
}
