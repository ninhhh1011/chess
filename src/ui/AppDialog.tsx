import React from 'react';
import { Modal as HeroUIModal } from '@heroui/react';

export interface AppDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  hideCloseButton?: boolean;
}

export function AppDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
  hideCloseButton = false,
}: AppDialogProps) {
  return (
    <HeroUIModal isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIModal.Backdrop className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200">
        <HeroUIModal.Container className="w-full flex items-center justify-center">
          <HeroUIModal.Dialog
            className={`w-full ${maxWidth} relative overflow-hidden rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-xl outline-none transition-all duration-200`}
            style={{ borderRadius: '12px' }}
          >
            {!hideCloseButton && (
              <HeroUIModal.CloseTrigger
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-raised)] transition-colors cursor-pointer outline-none"
                aria-label="Đóng hộp thoại"
              />
            )}

            <HeroUIModal.Header className="flex flex-col gap-1 pb-4 border-b border-[var(--app-border)] pr-8">
              <HeroUIModal.Heading className="text-lg font-bold text-[var(--app-foreground)]">
                {title}
              </HeroUIModal.Heading>
              {description && (
                <div className="text-xs text-[var(--app-muted)] leading-relaxed">
                  {description}
                </div>
              )}
            </HeroUIModal.Header>

            <HeroUIModal.Body className="py-4 text-sm text-[var(--app-foreground)] max-h-[75vh] overflow-y-auto">
              {children}
            </HeroUIModal.Body>

            {footer && (
              <HeroUIModal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--app-border)]">
                {footer}
              </HeroUIModal.Footer>
            )}
          </HeroUIModal.Dialog>
        </HeroUIModal.Container>
      </HeroUIModal.Backdrop>
    </HeroUIModal>
  );
}
