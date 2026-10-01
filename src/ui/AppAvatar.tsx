import React from 'react';
import { Avatar as HeroUIAvatar } from '@heroui/react';

export interface AppAvatarProps {
  src?: string;
  name?: string;
  fallback?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AppAvatar({
  src,
  name,
  fallback,
  size = 'md',
  className = '',
}: AppAvatarProps) {
  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  }[size] || 'h-9 w-9 text-sm';

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <HeroUIAvatar
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-foreground)] font-semibold select-none ${sizeClasses} ${className}`}
      style={{ borderRadius: '8px' }}
    >
      {src && (
        <HeroUIAvatar.Image
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover"
        />
      )}
      <HeroUIAvatar.Fallback className="flex h-full w-full items-center justify-center">
        {fallback || initial}
      </HeroUIAvatar.Fallback>
    </HeroUIAvatar>
  );
}
