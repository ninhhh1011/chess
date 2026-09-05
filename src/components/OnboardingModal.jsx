import { useOnboarding } from '../hooks/useOnboarding';
import { AppButton } from '../ui';

export default function OnboardingModal() {
  const { showTips, currentTip, tips, nextTip, dismiss } = useOnboarding();

  if (!showTips) return null;

  const tip = tips[currentTip];
  const isLast = currentTip === tips.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 text-center text-4xl">{tip.icon}</div>

        {/* Content */}
        <h2 className="mb-2 text-center text-lg font-bold text-[var(--app-foreground)]">
          {tip.title}
        </h2>
        <p className="mb-6 text-center text-xs leading-relaxed text-[var(--app-muted)]">
          {tip.content}
        </p>

        {/* Progress dots */}
        <div className="mb-5 flex justify-center gap-1.5">
          {tips.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentTip ? 'w-5 bg-[var(--app-accent)]' : 'w-1.5 bg-[var(--app-surface-hover)]'
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
            className="flex-1"
          >
            {isLast ? 'Bắt đầu!' : 'Tiếp tục'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
