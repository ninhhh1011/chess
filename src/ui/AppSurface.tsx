import React from 'react';
import { Surface as HeroUISurface } from '@heroui/react';

export interface AppSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'base' | 'raised' | 'hover' | 'transparent';
  radius?: 'sm' | 'md' | 'lg' | 'full' | 'none';
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
    raised: 'bg-[var(--app-surface-raised)] shadow-[var(--shadow-card)]',
    hover: 'bg-[var(--app-surface-hover)]',
    transparent: 'bg-transparent',
  }[variant];

  const radiusStyles = {
    none: 'rounded-none',
    sm: 'rounded-[14px]',
    md: 'rounded-[20px]',
    lg: 'rounded-[24px]',
    full: 'rounded-full',
  }[radius];

  const borderClass = hasBorder ? 'border border-[var(--app-border)]' : '';
  const heroUIVariant = {
    base: 'default' as const,
    raised: 'secondary' as const,
    hover: 'secondary' as const,
    transparent: 'transparent' as const,
  }[variant];

  const borderRadiusMap = {
    none: '0px',
    sm: '14px',
    md: '20px',
    lg: '24px',
    full: '9999px',
  };

  return (
    <HeroUISurface
      variant={heroUIVariant}
      className={`${variantStyles} ${radiusStyles} ${borderClass} ${className}`}
      style={{
        borderRadius: borderRadiusMap[radius] || '20px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </HeroUISurface>
  );
}
