import React from 'react';
import { Tabs as HeroUITabs } from '@heroui/react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface AppTabsProps {
  tabs: TabItem[];
  selectedId: string;
  onSelectionChange: (id: string) => void;
  className?: string;
  variant?: 'underline' | 'segment';
  ariaLabel?: string;
}

export function AppTabs({
  tabs,
  selectedId,
  onSelectionChange,
  className = '',
  variant = 'underline',
  ariaLabel = 'Các mục chuyển đổi',
}: AppTabsProps) {
  if (variant === 'segment') {
    return (
      <HeroUITabs
        selectedKey={selectedId}
        onSelectionChange={(key) => onSelectionChange(String(key))}
        aria-label={ariaLabel}
        className={`w-full ${className}`}
      >
        <HeroUITabs.ListContainer className="w-full bg-[var(--app-bg)] rounded-[8px] border border-[var(--app-border)] p-1">
          <HeroUITabs.List className="w-full flex items-center gap-1">
            {tabs.map((tab) => {
              const isSelected = selectedId === tab.id;
              return (
                <HeroUITabs.Tab
                  key={tab.id}
                  id={tab.id}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-[6px] cursor-pointer outline-none select-none transition-all duration-150 ${
                    isSelected
                      ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] shadow-xs border border-[var(--app-border)]'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                >
                  {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--app-accent-soft)] text-[var(--app-accent)] font-mono">
                      {tab.badge}
                    </span>
                  )}
                </HeroUITabs.Tab>
              );
            })}
          </HeroUITabs.List>
        </HeroUITabs.ListContainer>
      </HeroUITabs>
    );
  }

  return (
    <HeroUITabs
      selectedKey={selectedId}
      onSelectionChange={(key) => onSelectionChange(String(key))}
      aria-label={ariaLabel}
      className={`w-full ${className}`}
    >
      <HeroUITabs.ListContainer className="w-full border-b border-[var(--app-border)]">
        <HeroUITabs.List className="w-full flex relative">
          {tabs.map((tab) => {
            const isSelected = selectedId === tab.id;
            return (
              <HeroUITabs.Tab
                key={tab.id}
                id={tab.id}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold cursor-pointer outline-none select-none transition-colors duration-150 ${
                  isSelected
                    ? 'text-[var(--app-foreground)] font-bold'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`}
              >
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--app-accent-soft)] text-[var(--app-accent)] font-medium">
                    {tab.badge}
                  </span>
                )}
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--app-accent)]" />
                )}
              </HeroUITabs.Tab>
            );
          })}
        </HeroUITabs.List>
      </HeroUITabs.ListContainer>
    </HeroUITabs>
  );
}
