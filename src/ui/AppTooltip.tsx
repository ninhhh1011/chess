import React from 'react';
import { Tooltip as HeroUITooltip } from '@heroui/react';

export interface AppTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
  showArrow?: boolean;
}

export function AppTooltip({
  content,
  children,
  placement = 'top',
  className = '',
  delay = 150,
  showArrow = false,
}: AppTooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <HeroUITooltip delay={delay}>
      <HeroUITooltip.Trigger className="inline-flex items-center">
        {children}
      </HeroUITooltip.Trigger>

      <HeroUITooltip.Content
        placement={placement}
        showArrow={showArrow}
        className={`z-50 pointer-events-none rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-foreground)] shadow-lg ${className}`}
        style={{ borderRadius: '6px' }}
      >
        {showArrow && <HeroUITooltip.Arrow />}
        {content}
      </HeroUITooltip.Content>
    </HeroUITooltip>
  );
}
