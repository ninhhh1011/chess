import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface AppSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function AppSelect({
  label,
  options,
  value,
  onChange,
  className = '',
  id,
  ...rest
}: AppSelectProps) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[var(--app-muted)] select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-9 appearance-none rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] pl-3 pr-8 text-xs font-medium text-[var(--app-foreground)] transition-colors duration-150 focus:border-[var(--app-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] cursor-pointer ${className}`}
          style={{ borderRadius: '8px' }}
          {...rest}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[var(--app-surface)] text-[var(--app-foreground)] py-1"
            >
              {opt.label} {opt.hint ? `(${opt.hint})` : ''}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 text-[var(--app-subtle)]">
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
