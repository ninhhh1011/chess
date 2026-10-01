import React from 'react';
import { Slider as HeroUISlider, Label as HeroUILabel } from '@heroui/react';

export interface AppSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  valueFormat?: (val: number) => string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function AppSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  valueFormat,
  disabled = false,
  className = '',
  ariaLabel,
}: AppSliderProps) {
  const displayValue = valueFormat ? valueFormat(value) : String(value);

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <HeroUISlider
        value={value}
        onChange={(val) => {
          if (typeof val === 'number') {
            onChange(val);
          } else if (Array.isArray(val) && val.length > 0) {
            onChange(val[0]);
          }
        }}
        minValue={min}
        maxValue={max}
        step={step}
        isDisabled={disabled}
        aria-label={ariaLabel || label || 'Thanh trượt'}
        className="w-full flex flex-col gap-1.5"
      >
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--app-muted)] select-none">
            {label && <HeroUILabel>{label}</HeroUILabel>}
            {showValue && (
              <HeroUISlider.Output className="font-mono text-[var(--app-foreground)]">
                {displayValue}
              </HeroUISlider.Output>
            )}
          </div>
        )}

        <HeroUISlider.Track className="relative flex items-center h-6 w-full cursor-pointer select-none">
          <div className="h-1.5 w-full rounded-full bg-[var(--app-surface-hover)] border border-[var(--app-border)] overflow-hidden">
            <HeroUISlider.Fill className="h-full bg-[var(--app-accent)]" />
          </div>
          <HeroUISlider.Thumb className="h-4 w-4 rounded-full bg-[var(--app-foreground)] border-2 border-[var(--app-accent)] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]" />
        </HeroUISlider.Track>
      </HeroUISlider>
    </div>
  );
}
