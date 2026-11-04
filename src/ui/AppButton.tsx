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
      sm: 'h-8 sm:h-9 px-4 text-xs gap-1.5 rounded-full',
      md: 'h-10 sm:h-11 px-5 text-sm gap-2 rounded-full',
      lg: 'h-12 sm:h-13 px-7 text-base gap-2.5 rounded-full font-medium',
    }[size as 'sm' | 'md' | 'lg'] || 'h-10 sm:h-11 px-5 text-sm gap-2 rounded-full';

    const variantStyles: Record<string, string> = {
      primary:
        'bg-[#030302] text-white font-medium hover:bg-[#222220] active:scale-[0.99] border border-transparent shadow-xs',
      secondary:
        'bg-white text-[#030302] font-medium hover:bg-[var(--app-surface-hover)] active:bg-[var(--app-muted-surface)] border border-[var(--app-border)] shadow-xs',
      tertiary:
        'bg-[var(--app-muted-surface)] text-[#030302] font-medium hover:bg-[#eae6e1] active:bg-[#e0dbd4] border border-transparent',
      outline:
        'bg-transparent text-[#030302] font-medium hover:bg-[var(--app-muted-surface)] border border-[var(--app-border-strong)]',
      danger:
        'bg-[var(--app-danger)] text-white font-medium hover:opacity-90 active:opacity-100 border border-transparent shadow-xs',
      ghost:
        'bg-transparent text-[var(--app-muted)] font-medium hover:text-[#030302] hover:bg-[var(--app-muted-surface)] border border-transparent',
    };

    const chosenVariantStyle = variantStyles[variant] || variantStyles.primary;

    return (
      <HeroUIButton
        ref={ref}
        variant={variant as any}
        size={size}
        isDisabled={isActuallyDisabled}
        className={`rounded-full transition-all duration-150 inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${chosenVariantStyle} ${className}`}
        style={{ borderRadius: '9999px', ...style }}
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
