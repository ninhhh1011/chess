import React, { useState, useRef, useEffect } from 'react';

export interface AppPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  title?: string;
  className?: string;
}

/**
 * AppPopover wrapper adhering to Option C tokens:
 * - Radius: 12px (Modal/Popover rule)
 * - Border: var(--app-border)
 * - Surface: var(--app-surface-raised)
 * - Motion: 160ms quiet motion
 * - Shadow: clean subtle shadow
 * - Full keyboard (ESC) and outside click handling
 */
export function AppPopover({
  trigger,
  children,
  placement = 'bottom-end',
  title,
  className = '',
}: AppPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const placementStyles: Record<string, string> = {
    'bottom-end': 'top-full right-0 mt-2',
    'bottom-start': 'top-full left-0 mt-2',
    'top-end': 'bottom-full right-0 mb-2',
    'top-start': 'bottom-full left-0 mb-2',
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex cursor-pointer select-none"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="false"
          className={`absolute z-50 min-w-[240px] rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 shadow-lg transition-all duration-150 ${placementStyles[placement] || placementStyles['bottom-end']} ${className}`}
          style={{ borderRadius: '12px' }}
        >
          {title && (
            <div className="mb-2 border-b border-[var(--app-border)] pb-2 text-xs font-bold text-[var(--app-foreground)]">
              {title}
            </div>
          )}
          <div className="text-xs text-[var(--app-foreground)]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
