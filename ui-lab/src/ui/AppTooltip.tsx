import React, { useState } from 'react';

export interface AppTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function AppTooltip({
  content,
  children,
  placement = 'top',
  className = '',
}: AppTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[placement];

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${placementClasses} z-50 pointer-events-none whitespace-nowrap rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-foreground)] shadow-lg transition-opacity duration-150 ${className}`}
          style={{ borderRadius: '6px' }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
