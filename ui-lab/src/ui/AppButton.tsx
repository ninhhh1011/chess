import React from 'react';
import { Button as HeroUIButton } from '@heroui/react';
import type { ComponentProps } from 'react';

export interface AppButtonProps extends Omit<ComponentProps<typeof HeroUIButton>, 'variant'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'danger' | 'ghost';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      isLoading,
      isDisabled,
      className = '',
      style,
      ...rest
    },
    ref
  ) => {
    // Style classes mapped to our CSS variable tokens with 8px radius
    const baseClasses = 'inline-flex items-center justify-center font-medium interactive-hover interactive-press cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none';
    
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-[8px]',
      md: 'h-9 px-4 text-sm gap-2 rounded-[8px]',
      lg: 'h-11 px-5 text-base gap-2.5 rounded-[8px]',
    }[size as 'sm' | 'md' | 'lg'] || 'h-9 px-4 text-sm gap-2 rounded-[8px]';

    const variantStyles: Record<string, string> = {
      primary: 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)] active:bg-[var(--app-accent)] border border-transparent shadow-sm',
      secondary: 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)]',
      tertiary: 'bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] border border-transparent',
      outline: 'bg-transparent text-[var(--app-foreground)] hover:bg-[var(--app-surface)] border border-[var(--app-border)]',
      danger: 'bg-[var(--app-danger)] text-white hover:opacity-90 border border-transparent',
      ghost: 'bg-transparent text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] border border-transparent',
    };

    return (
      <HeroUIButton
        ref={ref}
        size={size}
        isDisabled={isDisabled || isLoading}
        className={`${baseClasses} ${sizeClasses} ${variantStyles[variant] || variantStyles.primary} ${className}`}
        style={{ borderRadius: '8px', ...style }}
        {...rest}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Đang xử lý...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </HeroUIButton>
    );
  }
);

AppButton.displayName = 'AppButton';
