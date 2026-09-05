import MoveClassificationBadge from './MoveClassificationBadge';
import { BRAND_NAMES } from '../../config/brand';
import { AppButton } from '../../ui';

export default function GameReviewPanel({ review, isReviewing, onReview }) {
  return (
    <article className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--app-accent)]">Review</p>
          <h2 className="mt-0.5 text-base font-bold text-[var(--app-foreground)]">{BRAND_NAMES.analysis}</h2>
        </div>
        <AppButton size="sm" variant="secondary" onClick={onReview} disabled={isReviewing}>
          {isReviewing ? 'Đang mổ ván...' : 'Mổ ván cờ'}
        </AppButton>
      </div>

      {!review ? (
        <p className="mt-2.5 text-xs leading-relaxed text-[var(--app-muted)]">
          Chơi vài nước rồi mổ ván để xem nước ổn, nước thiếu lực và pha tự hủy.
        </p>
      ) : (
        <div className="mt-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-center">
              <b className="text-sm font-bold text-[var(--app-foreground)]">{review.total}</b>
              <p className="text-[11px] text-[var(--app-muted)]">Nước</p>
            </div>
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-center">
              <b className="text-sm font-bold text-[var(--app-success)]">{review.counts.good}</b>
              <p className="text-[11px] text-[var(--app-muted)]">Ổn</p>
            </div>
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-center">
              <b className="text-sm font-bold text-[var(--app-warning)]">{review.counts.inaccuracy}</b>
              <p className="text-[11px] text-[var(--app-muted)]">Thiếu lực</p>
            </div>
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-center">
              <b className="text-sm font-bold text-[var(--app-danger)]">{review.counts.blunder}</b>
              <p className="text-[11px] text-[var(--app-muted)]">Tự hủy</p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--app-accent)]">Pha cần xem lại</h3>
            <div className="mt-2 space-y-1.5">
              {review.worstMoves.length ? (
                review.worstMoves.map((item) => (
                  <div key={item.index} className="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-xs">
                    <MoveClassificationBadge type={item.classification.type} label={item.classification.label} />
                    <span className="text-[var(--app-muted)]">
                      #{item.index + 1}: <span className="font-mono font-medium text-[var(--app-foreground)]">{item.playedSan}</span>, Ninh mách <span className="font-mono font-medium text-[var(--app-copper)]">{item.bestSan}</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--app-muted)]">Chưa thấy pha tự hủy lớn trong phần đã mổ.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
