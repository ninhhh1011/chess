import React from 'react';
import { Skeleton as HeroUISkeleton } from '@heroui/react';

export interface AppSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  radius?: 'sm' | 'md' | 'lg' | 'full';
  animationType?: 'pulse' | 'shimmer' | 'none';
}

export function AppSkeleton({
  className = '',
  width,
  height,
  radius = 'md',
  animationType = 'pulse',
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
    <HeroUISkeleton
      animationType={animationType}
      className={`bg-[var(--app-surface-hover)] opacity-70 ${radiusClasses} ${className}`}
      style={style}
    />
  );
}
