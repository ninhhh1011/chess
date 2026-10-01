import React from 'react';
import {
  RadioGroup as HeroUIRadioGroup,
  Radio as HeroUIRadio,
  Label as HeroUILabel,
} from '@heroui/react';

export interface AppRadioGroupProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  ariaLabel?: string;
}

export function AppRadioGroup({
  value,
  onChange,
  label,
  children,
  className = '',
  orientation = 'vertical',
  disabled = false,
  ariaLabel,
}: AppRadioGroupProps) {
  return (
    <HeroUIRadioGroup
      value={value}
      onChange={onChange}
      isDisabled={disabled}
      aria-label={ariaLabel || label || 'Nhóm lựa chọn'}
      orientation={orientation}
      className={`w-full flex flex-col gap-2 ${className}`}
    >
      {label && (
        <HeroUILabel className="text-xs font-semibold text-[var(--app-muted)] select-none">
          {label}
        </HeroUILabel>
      )}
      <div
        className={`flex ${
          orientation === 'horizontal' ? 'flex-row flex-wrap gap-2.5' : 'flex-col gap-2'
        }`}
      >
        {children}
      </div>
    </HeroUIRadioGroup>
  );
}

export interface AppRadioProps {
  value: string;
  children: React.ReactNode;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function AppRadio({
  value,
  children,
  description,
  className = '',
  disabled = false,
}: AppRadioProps) {
  return (
    <HeroUIRadio
      value={value}
      isDisabled={disabled}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none text-xs ${className}`}
    >
      {({ isSelected }) => (
        <HeroUIRadio.Content className="flex items-start gap-2.5">
          <HeroUIRadio.Control
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
              isSelected
                ? 'border-[var(--app-accent)] bg-[var(--app-accent)]'
                : 'border-[var(--app-border)] bg-[var(--app-surface)]'
            }`}
          >
            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#0C100E]" />}
          </HeroUIRadio.Control>

          <div className="flex flex-col">
            <span
              className={`font-medium ${
                isSelected ? 'text-[var(--app-foreground)]' : 'text-[var(--app-muted)]'
              }`}
            >
              {children}
            </span>
            {description && (
              <span className="text-[11px] text-[var(--app-subtle)]">{description}</span>
            )}
          </div>
        </HeroUIRadio.Content>
      )}
    </HeroUIRadio>
  );
}

export interface AppRadioCardProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AppRadioCard({
  value,
  children,
  className = '',
  disabled = false,
}: AppRadioCardProps) {
  return (
    <HeroUIRadio
      value={value}
      isDisabled={disabled}
      className={`cursor-pointer select-none ${className}`}
    >
      {({ isSelected }) => (
        <HeroUIRadio.Content
          className={`flex h-full w-full flex-col rounded-[10px] border p-3 transition-all duration-150 ${
            isSelected
              ? 'border-[var(--app-accent)] bg-[var(--app-surface-hover)] shadow-xs'
              : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:border-[var(--app-border-strong)]'
          }`}
          style={{ borderRadius: '10px' }}
        >
          {children}
        </HeroUIRadio.Content>
      )}
    </HeroUIRadio>
  );
}
