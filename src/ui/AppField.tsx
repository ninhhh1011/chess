import React from 'react';
import {
  TextField as HeroUITextField,
  Label as HeroUILabel,
  InputGroup as HeroUIInputGroup,
  Description as HeroUIDescription,
  FieldError as HeroUIFieldError,
} from '@heroui/react';

export interface AppFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  containerClassName?: string;
}

export const AppField = React.forwardRef<HTMLInputElement, AppFieldProps>(
  (
    {
      label,
      description,
      error,
      leftIcon,
      rightAction,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      ...inputProps
    },
    ref
  ) => {
    const inputId = id || (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

    const inputBaseClasses = `w-full h-9 bg-[var(--app-surface)] text-sm text-[var(--app-foreground)] placeholder-[var(--app-subtle)] focus:outline-none transition-colors duration-150`;

    return (
      <HeroUITextField
        isInvalid={Boolean(error)}
        isDisabled={disabled}
        isRequired={required}
        className={`w-full flex flex-col gap-1.5 ${containerClassName}`}
      >
        {label && (
          <HeroUILabel
            htmlFor={inputId}
            className="text-xs font-semibold text-[var(--app-muted)] select-none"
          >
            {label}
          </HeroUILabel>
        )}

        <HeroUIInputGroup
          className={`relative flex items-center w-full rounded-[8px] border bg-[var(--app-surface)] px-2.5 transition-colors duration-150 ${
            error
              ? 'border-[var(--app-danger)] ring-1 ring-[var(--app-danger)]/30'
              : 'border-[var(--app-border)] focus-within:border-[var(--app-accent)] focus-within:ring-2 focus-within:ring-[var(--app-accent)]/20'
          }`}
          style={{ borderRadius: '8px' }}
        >
          {leftIcon && (
            <HeroUIInputGroup.Prefix className="mr-2 text-[var(--app-subtle)] shrink-0 flex items-center">
              {leftIcon}
            </HeroUIInputGroup.Prefix>
          )}

          <HeroUIInputGroup.Input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={`${inputBaseClasses} ${className}`}
            {...inputProps}
          />

          {rightAction && (
            <HeroUIInputGroup.Suffix className="ml-2 flex items-center shrink-0">
              {rightAction}
            </HeroUIInputGroup.Suffix>
          )}
        </HeroUIInputGroup>

        {description && !error && (
          <HeroUIDescription className="text-[11px] text-[var(--app-subtle)]">
            {description}
          </HeroUIDescription>
        )}

        {error && (
          <HeroUIFieldError className="text-[11px] text-[var(--app-danger)] font-medium">
            {error}
          </HeroUIFieldError>
        )}
      </HeroUITextField>
    );
  }
);

AppField.displayName = 'AppField';
