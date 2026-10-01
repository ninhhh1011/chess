import React from 'react';
import { Select as HeroUISelect, ListBox as HeroUIListBox, Label as HeroUILabel } from '@heroui/react';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface AppSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

export function AppSelect({
  label,
  options,
  value,
  onChange,
  className = '',
  placeholder = 'Chọn một mục...',
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: AppSelectProps) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <HeroUISelect
        id={selectId}
        selectedKey={value || null}
        onSelectionChange={(key) => {
          if (key !== null && key !== undefined) {
            onChange(String(key));
          }
        }}
        isDisabled={disabled}
        aria-label={ariaLabel || label || 'Lựa chọn'}
        placeholder={placeholder}
        className="w-full flex flex-col gap-1.5"
      >
        {label && (
          <HeroUILabel className="text-xs font-semibold text-[var(--app-muted)] select-none">
            {label}
          </HeroUILabel>
        )}

        <HeroUISelect.Trigger
          className="w-full h-9 flex items-center justify-between rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-medium text-[var(--app-foreground)] transition-colors focus:border-[var(--app-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: '8px' }}
        >
          <HeroUISelect.Value className="truncate" />
          <HeroUISelect.Indicator className="text-[var(--app-subtle)] shrink-0 ml-2" />
        </HeroUISelect.Trigger>

        <HeroUISelect.Popover
          className="min-w-[var(--trigger-width)] max-h-60 overflow-y-auto rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1 shadow-xl z-50"
          style={{ borderRadius: '8px' }}
        >
          <HeroUIListBox className="outline-none p-0 flex flex-col gap-0.5">
            {options.map((opt) => (
              <HeroUIListBox.Item
                key={opt.value}
                id={opt.value}
                textValue={opt.label}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] focus:bg-[var(--app-surface-hover)] cursor-pointer outline-none transition-colors"
              >
                <span>
                  {opt.label}{' '}
                  {opt.hint && (
                    <span className="text-[11px] text-[var(--app-muted)]">({opt.hint})</span>
                  )}
                </span>
                <HeroUIListBox.ItemIndicator className="ml-2 text-[var(--app-accent)]" />
              </HeroUIListBox.Item>
            ))}
          </HeroUIListBox>
        </HeroUISelect.Popover>
      </HeroUISelect>
    </div>
  );
}
