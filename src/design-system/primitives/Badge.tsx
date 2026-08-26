import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  size?: 'sm' | 'md';
}

function Badge({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border border-border',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-error/10 text-error border border-error/20',
    primary: 'bg-primary-500/10 text-primary-500 border border-primary-500/20',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeProps };
