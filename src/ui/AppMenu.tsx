import React from 'react';
import { Dropdown as HeroUIDropdown } from '@heroui/react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  onAction?: () => void;
  href?: string;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

export interface AppMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  placement?:
    | 'bottom'
    | 'bottom start'
    | 'bottom end'
    | 'top'
    | 'top start'
    | 'top end'
    | 'bottom-start'
    | 'bottom-end'
    | 'top-start'
    | 'top-end';
  className?: string;
  ariaLabel?: string;
}

export function AppMenu({
  trigger,
  items,
  placement = 'bottom end',
  className = '',
  ariaLabel = 'Menu tùy chọn',
}: AppMenuProps) {
  const normalizedPlacement = String(placement).replace('-', ' ') as any;

  return (
    <HeroUIDropdown>
      <HeroUIDropdown.Trigger className="inline-flex cursor-pointer select-none outline-none">
        {trigger}
      </HeroUIDropdown.Trigger>

      <HeroUIDropdown.Popover
        placement={normalizedPlacement}
        className={`z-50 min-w-[180px] rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 shadow-xl outline-none ${className}`}
        style={{ borderRadius: '10px' }}
      >
        <HeroUIDropdown.Menu
          aria-label={ariaLabel}
          className="outline-none flex flex-col gap-0.5 p-0"
          onAction={(key) => {
            const item = items.find((i) => i.id === key);
            item?.onClick?.();
            item?.onAction?.();
          }}
        >
          {items.map((item) => (
            <HeroUIDropdown.Item
              key={item.id}
              id={item.id}
              textValue={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-xs font-medium cursor-pointer outline-none transition-colors select-none ${
                item.variant === 'danger'
                  ? 'text-[var(--app-danger)] hover:bg-[var(--app-danger)]/12 focus:bg-[var(--app-danger)]/12'
                  : 'text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] focus:bg-[var(--app-surface-hover)]'
              }`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </HeroUIDropdown.Item>
          ))}
        </HeroUIDropdown.Menu>
      </HeroUIDropdown.Popover>
    </HeroUIDropdown>
  );
}
