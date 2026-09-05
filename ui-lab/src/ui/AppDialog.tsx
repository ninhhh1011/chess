import React from 'react';
import { Modal } from '@heroui/react';
import { X } from 'lucide-react';

export interface AppDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function AppDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: AppDialogProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200">
        <Modal.Container className="w-full flex items-center justify-center">
          <Modal.Dialog
            className={`w-full ${maxWidth} overflow-hidden rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-xl transition-all duration-200`}
            style={{ borderRadius: '12px' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--app-border)]">
              <div>
                <Modal.Heading className="text-lg font-bold text-[var(--app-foreground)]">
                  {title}
                </Modal.Heading>
                {description && (
                  <p className="mt-1 text-xs text-[var(--app-muted)] leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-raised)] transition-colors"
                aria-label="Đóng hộp thoại"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <Modal.Body className="py-4 text-sm text-[var(--app-foreground)] max-h-[75vh] overflow-y-auto">
              {children}
            </Modal.Body>

            {/* Footer */}
            {footer && (
              <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--app-border)]">
                {footer}
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
