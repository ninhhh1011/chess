import React from 'react';
import { Button as HeroUIButton } from '@heroui/react';
import type { ComponentProps } from 'react';
import { AppSpinner } from './AppSpinner';

export interface AppButtonProps extends Omit<ComponentProps<typeof HeroUIButton>, 'variant'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'danger' | 'ghost';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
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
      disabled,
      className = '',
      style,
      onClick,
      onPress,
      ...rest
    },
    ref
  ) => {
    const isActuallyDisabled = Boolean(isDisabled || disabled || isLoading);

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-[8px]',
      md: 'h-9 px-4 text-sm gap-2 rounded-[8px]',
      lg: 'h-11 px-5 text-base gap-2.5 rounded-[8px]',
    }[size as 'sm' | 'md' | 'lg'] || 'h-9 px-4 text-sm gap-2 rounded-[8px]';

    const variantStyles: Record<string, string> = {
      primary:
        'bg-[var(--app-accent)] text-[#0C100E] font-semibold hover:bg-[var(--app-accent-hover)] active:bg-[var(--app-accent-pressed)] border border-transparent shadow-xs',
      secondary:
        'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)]',
      tertiary:
        'bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] border border-transparent',
      outline:
        'bg-transparent text-[var(--app-foreground)] hover:bg-[var(--app-surface)] border border-[var(--app-border)]',
      danger:
        'bg-[var(--app-danger)] text-white hover:opacity-90 active:opacity-100 border border-transparent shadow-xs',
      ghost:
        'bg-transparent text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] border border-transparent',
    };

    return (
      <HeroUIButton
        ref={ref}
        size={size}
        isDisabled={isActuallyDisabled}
        className={`inline-flex items-center justify-center font-medium interactive-hover interactive-press cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none ${sizeClasses} ${variantStyles[variant] || variantStyles.primary} ${className}`}
        style={{ borderRadius: '8px', ...style }}
        onPress={onPress}
        onClick={onClick}
        {...rest}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <AppSpinner size="sm" />
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
