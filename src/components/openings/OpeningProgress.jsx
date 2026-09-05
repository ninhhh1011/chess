import { AppProgress } from '../../ui';

export default function OpeningProgress({ progress }) {
  const percent = progress?.masteryPercent || 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">
        <span>Mastery</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1.5">
        <AppProgress value={percent} max={100} size="sm" variant="accent" aria-label="Tiến độ khai cuộc" />
      </div>
      {progress?.attempts ? (
        <p className="mt-1.5 text-xs text-[var(--app-subtle)]">
          {progress.attempts} lần luyện · {progress.successCount} lần hoàn thành
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-[var(--app-subtle)]">Chưa có tiến độ.</p>
      )}
    </div>
  );
}
