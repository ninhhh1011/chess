import { useOnboarding } from '../hooks/useOnboarding';
import { AppDialog } from '../ui/AppDialog';
import { AppButton } from '../ui/AppButton';

export default function OnboardingModal() {
  const { showTips, currentTip, tips, nextTip, dismiss } = useOnboarding();

  if (!showTips) return null;

  const tip = tips[currentTip];
  const isLast = currentTip === tips.length - 1;

  return (
    <AppDialog
      isOpen={showTips}
      onOpenChange={(isOpen) => {
        if (!isOpen) dismiss();
      }}
      title={
        <div className="text-center w-full">
          <div className="mb-2 text-3xl">{tip.icon}</div>
          <span className="text-lg font-bold text-[var(--app-foreground)]">{tip.title}</span>
        </div>
      }
      maxWidth="max-w-sm"
      footer={
        <div className="w-full space-y-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {tips.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-180 ${
                  i === currentTip ? 'w-5 bg-[var(--app-accent)]' : 'w-1.5 bg-[var(--app-border-strong)]'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              onClick={dismiss}
              className="flex-1"
            >
              Bỏ qua
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={nextTip}
              className="flex-1 font-bold"
            >
              {isLast ? 'Bắt đầu!' : 'Tiếp tục'}
            </AppButton>
          </div>
        </div>
      }
    >
      <p className="text-center text-xs leading-relaxed text-[var(--app-muted)] py-2">
        {tip.content}
      </p>
    </AppDialog>
  );
}
