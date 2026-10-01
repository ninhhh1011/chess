import React from 'react';
import { Switch as HeroUISwitch } from '@heroui/react';

export interface AppSwitchProps {
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function AppSwitch({
  isSelected,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  id,
}: AppSwitchProps) {
  return (
    <HeroUISwitch
      id={id}
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={disabled}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-[var(--app-foreground)]">{label}</span>}
          {description && <span className="text-[11px] text-[var(--app-muted)]">{description}</span>}
        </div>
      )}

      <HeroUISwitch.Control
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
          isSelected
            ? 'bg-[var(--app-accent)]'
            : 'bg-[var(--app-surface-hover)] border border-[var(--app-border)]'
        }`}
      >
        <HeroUISwitch.Thumb
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
            isSelected ? 'translate-x-4.5 bg-[#0C100E]' : 'translate-x-0.5 bg-[var(--app-muted)]'
          }`}
        />
      </HeroUISwitch.Control>
    </HeroUISwitch>
  );
}
