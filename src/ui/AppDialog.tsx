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
      <HeroUIModal.Backdrop className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-200">
        <HeroUIModal.Container className="w-full flex items-center justify-center">
          <HeroUIModal.Dialog
            className={`w-full ${maxWidth} relative overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-modal)] outline-none transition-all duration-200`}
            style={{ borderRadius: '24px' }}
          >
            {!hideCloseButton && (
              <HeroUIModal.CloseTrigger
                className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)] transition-colors cursor-pointer outline-none"
                aria-label="Đóng hộp thoại"
              />
            )}

            <HeroUIModal.Header className="flex flex-col gap-1 pb-4 border-b border-[var(--app-border)] pr-8">
              <HeroUIModal.Heading className="text-xl font-bold font-serif text-[#030302]">
                {title}
              </HeroUIModal.Heading>
              {description && (
                <div className="text-xs text-[var(--app-muted)] leading-relaxed">
                  {description}
                </div>
              )}
            </HeroUIModal.Header>

            <HeroUIModal.Body className="py-5 text-sm text-[var(--app-foreground)] max-h-[75vh] overflow-y-auto">
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
