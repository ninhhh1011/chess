import React from 'react';
import {
  TextField as HeroUITextField,
  Label as HeroUILabel,
  InputGroup as HeroUIInputGroup,
  Description as HeroUIDescription,
  FieldError as HeroUIFieldError,
} from '@heroui/react';

export interface AppTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
}

export const AppTextArea = React.forwardRef<HTMLTextAreaElement, AppTextAreaProps>(
  (
    {
      label,
      description,
      error,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      rows = 4,
      ...textAreaProps
    },
    ref
  ) => {
    const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

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
          className={`relative flex w-full rounded-[14px] border bg-white p-3 transition-colors duration-150 shadow-xs ${
            error
              ? 'border-[var(--app-danger)] ring-1 ring-[var(--app-danger)]/30'
              : 'border-[var(--app-border)] focus-within:border-[var(--app-secondary)] focus-within:ring-2 focus-within:ring-[var(--app-secondary)]/20'
          }`}
          style={{ borderRadius: '14px' }}
        >
          <HeroUIInputGroup.TextArea
            ref={ref}
            id={inputId}
            rows={rows}
            disabled={disabled}
            required={required}
            className={`w-full bg-transparent text-sm text-[var(--app-foreground)] placeholder-[var(--app-subtle)] focus:outline-none resize-y ${className}`}
            {...textAreaProps}
          />
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

AppTextArea.displayName = 'AppTextArea';
