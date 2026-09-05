import type { MistakeReviewItem } from '../fixtures/prototypeOnlyData';
import { AppButton } from '../ui/AppButton';
import { AppStatus } from '../ui/AppStatus';
import { RotateCcw, Target } from 'lucide-react';

export interface MistakeReviewRowProps {
  mistake: MistakeReviewItem;
  onRetry?: (id: string) => void;
  onPractice?: (skillTag: string) => void;
}

export function MistakeReviewRow({
  mistake,
  onRetry,
  onPractice,
}: MistakeReviewRowProps) {
  const badgeConfig = {
    blunder: { label: 'Sai lầm nghiêm trọng (Blunder)', variant: 'danger' as const },
    mistake: { label: 'Nước cờ lỗi (Mistake)', variant: 'warning' as const },
    inaccuracy: { label: 'Nước đi thiếu lực (Inaccuracy)', variant: 'gold' as const },
  }[mistake.classification];

  return (
    <div
      className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 transition-all duration-150 space-y-3"
      style={{ borderRadius: '10px' }}
    >
      {/* Top Header: Move info + Classification Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--app-surface)] text-xs font-mono font-bold text-[var(--app-muted)] border border-[var(--app-border)]">
            {mistake.moveNumber}
          </span>
          <span className="text-sm font-bold text-[var(--app-foreground)]">
            {mistake.moveNumber}. {mistake.playedSan}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AppStatus variant={badgeConfig.variant} size="sm">
            {badgeConfig.label}
          </AppStatus>
          <span className="text-[11px] font-mono font-semibold text-[var(--app-danger)]">
            -{mistake.evalLoss.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Move Comparison: Bạn đã đi vs Nên đi */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5">
          <span className="block text-[11px] text-[var(--app-muted)]">Bạn đã đi:</span>
          <span className="text-sm font-mono font-bold text-[var(--app-danger)] mt-0.5 block">
            {mistake.playedSan}
          </span>
        </div>
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5">
          <span className="block text-[11px] text-[var(--app-muted)]">Nên đi:</span>
          <span className="text-sm font-mono font-bold text-[var(--app-success)] mt-0.5 block">
            {mistake.bestSan}
          </span>
        </div>
      </div>

      {/* Explanation Reason */}
      <div className="text-xs text-[var(--app-foreground)] leading-relaxed bg-[var(--app-surface)]/60 rounded-[6px] p-2.5 border border-[var(--app-border)]">
        <p className="font-semibold text-[var(--app-muted)] text-[11px] mb-1">Lý do:</p>
        <p>{mistake.reason}</p>
      </div>

      {/* Skill Tag + CTAs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--app-border)]">
        <span className="text-[11px] font-medium text-[var(--app-muted)] bg-[var(--app-surface)] px-2 py-0.5 rounded-[4px] border border-[var(--app-border)]">
          Kỹ năng: {mistake.skillTag}
        </span>

        <div className="flex items-center gap-2">
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="h-3 w-3" />}
            onClick={() => onRetry?.(mistake.id)}
          >
            Thử lại
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            leftIcon={<Target className="h-3 w-3" />}
            onClick={() => onPractice?.(mistake.skillTag)}
          >
            Luyện bài liên quan
          </AppButton>
        </div>
      </div>
    </div>
  );
}
