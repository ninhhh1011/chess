import React, { useState, useRef, useEffect } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

export interface AppMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  placement?: 'bottom-start' | 'bottom-end';
  className?: string;
}

export function AppMenu({
  trigger,
  items,
  placement = 'bottom-end',
  className = '',
}: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
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

  const placementStyles = {
    'bottom-end': 'top-full right-0 mt-1.5',
    'bottom-start': 'top-full left-0 mt-1.5',
  }[placement];

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
          ref={menuRef}
          role="menu"
          className={`absolute z-50 min-w-[180px] rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 shadow-xl transition-all duration-150 ${placementStyles} ${className}`}
          style={{ borderRadius: '12px' }}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.divider && <div className="my-1 border-t border-[var(--app-border)]" />}
              {item.href ? (
                <a
                  href={item.href}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-medium transition-colors ${
                    item.variant === 'danger'
                      ? 'text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10'
                      : 'text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </a>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-xs font-medium text-left transition-colors ${
                    item.variant === 'danger'
                      ? 'text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10'
                      : 'text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
