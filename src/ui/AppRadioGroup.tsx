import React from 'react';
import { RadioGroup as HeroUIRadioGroup, Radio as HeroUIRadio, Label as HeroUILabel } from '@heroui/react';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface AppRadioGroupProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options?: RadioOption[];
  children?: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function AppRadioGroup({
  label,
  value,
  onChange,
  options,
  children,
  orientation = 'vertical',
  className = '',
  ariaLabel,
  disabled = false,
}: AppRadioGroupProps) {
  return (
    <HeroUIRadioGroup
      value={value}
      onChange={onChange}
      orientation={orientation}
      isDisabled={disabled}
      aria-label={ariaLabel || label || 'Tùy chọn'}
      className={`flex flex-col gap-2 ${className}`}
    >
      {label && (
        <HeroUILabel className="text-xs font-semibold text-[var(--app-muted)] select-none">
          {label}
        </HeroUILabel>
      )}

      {children ? (
        <div className={orientation === 'horizontal' ? 'flex flex-wrap gap-2.5' : 'flex flex-col gap-2'}>
          {children}
        </div>
      ) : (
        <div className={orientation === 'horizontal' ? 'flex flex-wrap gap-3' : 'flex flex-col gap-2'}>
          {options?.map((opt) => (
            <AppRadio
              key={opt.value}
              value={opt.value}
              description={opt.description}
              disabled={opt.disabled}
            >
              {opt.label}
            </AppRadio>
          ))}
        </div>
      )}
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
                ? 'border-[var(--app-secondary)] bg-[var(--app-secondary)]'
                : 'border-[var(--app-border)] bg-white'
            }`}
          >
            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </HeroUIRadio.Control>

          <div className="flex flex-col">
            <span
              className={`font-medium ${
                isSelected ? 'text-[#030302] font-semibold' : 'text-[var(--app-muted)]'
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
          className={`flex h-full w-full flex-col rounded-[16px] border p-3.5 transition-all duration-150 ${
            isSelected
              ? 'border-[#030302] bg-white shadow-xs ring-1 ring-[#030302]'
              : 'border-[var(--app-border)] bg-[var(--app-muted-surface)]/60 hover:bg-[var(--app-muted-surface)]'
          }`}
          style={{ borderRadius: '16px' }}
        >
          {children}
        </HeroUIRadio.Content>
      )}
    </HeroUIRadio>
  );
}
