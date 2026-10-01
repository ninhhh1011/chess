import React from 'react';
import { Drawer as HeroUIDrawer } from '@heroui/react';

export interface AppDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  placement?: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
  hideCloseButton?: boolean;
}

export function AppDrawer({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  placement = 'right',
  className = '',
  hideCloseButton = false,
}: AppDrawerProps) {
  const placementWidths = {
    right: 'w-full max-w-xs sm:max-w-sm h-full',
    left: 'w-full max-w-xs sm:max-w-sm h-full',
    top: 'w-full max-h-[85vh]',
    bottom: 'w-full max-h-[85vh]',
  }[placement];

  return (
    <HeroUIDrawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIDrawer.Backdrop
        isDismissable
        className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      >
        <HeroUIDrawer.Content
          placement={placement}
          className={`${placementWidths} ${className}`}
        >
          <HeroUIDrawer.Dialog
            className="flex h-full w-full flex-col bg-[var(--app-surface)] border-[var(--app-border)] p-5 shadow-2xl outline-none"
            style={{
              borderLeftWidth: placement === 'right' ? '1px' : 0,
              borderRightWidth: placement === 'left' ? '1px' : 0,
              borderBottomWidth: placement === 'top' ? '1px' : 0,
              borderTopWidth: placement === 'bottom' ? '1px' : 0,
            }}
          >
            <HeroUIDrawer.Header className="flex items-center justify-between pb-4 border-b border-[var(--app-border)]">
              <HeroUIDrawer.Heading className="text-base font-bold text-[var(--app-foreground)]">
                {title}
              </HeroUIDrawer.Heading>
              {!hideCloseButton && (
                <HeroUIDrawer.CloseTrigger
                  className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-raised)] transition-colors cursor-pointer outline-none"
                  aria-label="Đóng menu"
                />
              )}
            </HeroUIDrawer.Header>

            <HeroUIDrawer.Body className="flex-1 overflow-y-auto py-4">
              {children}
            </HeroUIDrawer.Body>

            {footer && (
              <HeroUIDrawer.Footer className="pt-4 border-t border-[var(--app-border)]">
                {footer}
              </HeroUIDrawer.Footer>
            )}
          </HeroUIDrawer.Dialog>
        </HeroUIDrawer.Content>
      </HeroUIDrawer.Backdrop>
    </HeroUIDrawer>
  );
}
