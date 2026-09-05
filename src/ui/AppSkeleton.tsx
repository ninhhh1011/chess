import React from 'react';

export interface AppSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  radius?: 'sm' | 'md' | 'lg' | 'full';
}

export function AppSkeleton({
  className = '',
  width,
  height,
  radius = 'md',
}: AppSkeletonProps) {
  const radiusClasses = {
    sm: 'rounded-[6px]',
    md: 'rounded-[8px]',
    lg: 'rounded-[12px]',
    full: 'rounded-full',
  }[radius];

  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      aria-hidden="true"
      className={`bg-[var(--app-surface-hover)] opacity-70 animate-pulse ${radiusClasses} ${className}`}
      style={style}
    />
  );
}
