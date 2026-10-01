import React from 'react';
import { Popover as HeroUIPopover } from '@heroui/react';

export interface AppPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?:
    | 'bottom'
    | 'bottom start'
    | 'bottom end'
    | 'top'
    | 'top start'
    | 'top end'
    | 'left'
    | 'right'
    | 'bottom-start'
    | 'bottom-end'
    | 'top-start'
    | 'top-end';
  title?: string;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function AppPopover({
  trigger,
  children,
  placement = 'bottom end',
  title,
  className = '',
  isOpen,
  onOpenChange,
}: AppPopoverProps) {
  // Normalize legacy placement prop values if passed with hyphen
  const normalizedPlacement = String(placement).replace('-', ' ') as any;

  return (
    <HeroUIPopover isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIPopover.Trigger className="inline-flex cursor-pointer select-none">
        {trigger}
      </HeroUIPopover.Trigger>

      <HeroUIPopover.Content
        placement={normalizedPlacement}
        className={`z-50 min-w-[240px] rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 shadow-xl outline-none ${className}`}
        style={{ borderRadius: '10px' }}
      >
        <HeroUIPopover.Dialog className="outline-none text-xs text-[var(--app-foreground)]">
          {title && (
            <HeroUIPopover.Heading className="mb-2 border-b border-[var(--app-border)] pb-2 text-xs font-bold text-[var(--app-foreground)]">
              {title}
            </HeroUIPopover.Heading>
          )}
          {children}
        </HeroUIPopover.Dialog>
      </HeroUIPopover.Content>
    </HeroUIPopover>
  );
}
