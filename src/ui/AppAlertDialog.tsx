import React from 'react';
import { AlertDialog as HeroUIAlertDialog } from '@heroui/react';
import { AppButton } from './AppButton';

export interface AppAlertDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'secondary';
  onConfirm: () => void;
  status?: 'danger' | 'warning' | 'accent' | 'default';
  icon?: React.ReactNode;
}

export function AppAlertDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  confirmVariant = 'danger',
  onConfirm,
  status = 'danger',
  icon,
}: AppAlertDialogProps) {
  return (
    <HeroUIAlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <HeroUIAlertDialog.Backdrop
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      >
        <HeroUIAlertDialog.Container className="w-full flex items-center justify-center">
          <HeroUIAlertDialog.Dialog
            className="w-full max-w-md overflow-hidden rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl outline-none"
            style={{ borderRadius: '12px' }}
          >
            <HeroUIAlertDialog.Header className="flex items-center gap-3 pb-3 border-b border-[var(--app-border)]">
              {icon && (
                <HeroUIAlertDialog.Icon
                  status={status}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                >
                  {icon}
                </HeroUIAlertDialog.Icon>
              )}
              <HeroUIAlertDialog.Heading className="text-base font-bold text-[var(--app-foreground)]">
                {title}
              </HeroUIAlertDialog.Heading>
            </HeroUIAlertDialog.Header>

            <HeroUIAlertDialog.Body className="py-4 text-xs text-[var(--app-muted)] leading-relaxed">
              {children}
            </HeroUIAlertDialog.Body>

            <HeroUIAlertDialog.Footer className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--app-border)]">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </AppButton>
              <AppButton
                variant={confirmVariant}
                size="sm"
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </AppButton>
            </HeroUIAlertDialog.Footer>
          </HeroUIAlertDialog.Dialog>
        </HeroUIAlertDialog.Container>
      </HeroUIAlertDialog.Backdrop>
    </HeroUIAlertDialog>
  );
}
