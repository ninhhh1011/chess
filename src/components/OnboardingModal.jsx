import { useOnboarding } from '../hooks/useOnboarding';

export default function OnboardingModal() {
  const { showTips, currentTip, tips, nextTip, dismiss } = useOnboarding();

  if (!showTips) return null;

  const tip = tips[currentTip];
  const isLast = currentTip === tips.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 text-center text-5xl">{tip.icon}</div>

        {/* Content */}
        <h2 className="mb-2 text-center text-xl font-bold text-text-primary">
          {tip.title}
        </h2>
        <p className="mb-6 text-center text-sm text-text-secondary">
          {tip.content}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-2">
          {tips.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentTip ? 'bg-primary-400' : 'bg-bg-surface'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={dismiss}
            className="flex-1 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-bg-base"
          >
            Bỏ qua
          </button>
          <button
            onClick={nextTip}
            className="flex-1 rounded-lg bg-primary-400 px-4 py-2.5 text-sm font-semibold text-bg-base transition hover:bg-primary-300"
          >
            {isLast ? 'Bắt đầu!' : 'Tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  );
}
