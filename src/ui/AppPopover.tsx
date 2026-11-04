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
      <HeroUIPopover.Trigger
        tabIndex={0}
        className="inline-flex cursor-pointer select-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-secondary)]/30"
      >
        {trigger}
      </HeroUIPopover.Trigger>

      <HeroUIPopover.Content
        placement={normalizedPlacement}
        className={`z-50 min-w-[240px] rounded-[20px] border border-[var(--app-border)] bg-white p-3.5 shadow-[var(--shadow-floating)] outline-none ${className}`}
        style={{ borderRadius: '20px' }}
      >
        <HeroUIPopover.Dialog
          aria-label={title || 'Tùy chọn'}
          className="outline-none text-xs text-[var(--app-foreground)]"
        >
          {title && (
            <HeroUIPopover.Heading className="mb-2 border-b border-[var(--app-border)] pb-2 text-xs font-bold text-[#030302]">
              {title}
            </HeroUIPopover.Heading>
          )}
          {children}
        </HeroUIPopover.Dialog>
      </HeroUIPopover.Content>
    </HeroUIPopover>
  );
}
