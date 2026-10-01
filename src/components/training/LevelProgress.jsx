import { LEVEL_ORDER, getLevelConfig } from '../../data/levelConfig';
import { AppProgress } from '@/ui/AppProgress';
import { AppSurface } from '@/ui/AppSurface';
import { AppStatus } from '@/ui/AppStatus';

export default function LevelProgress({ profile, canLevelUp, nextLevel }) {
  const index = Math.max(0, LEVEL_ORDER.indexOf(profile.currentLevel));
  const percent = Math.round(((index + 1) / LEVEL_ORDER.length) * 100);
  const current = getLevelConfig(profile.currentLevel);
  const next = nextLevel ? getLevelConfig(nextLevel) : null;

  return (
    <AppSurface className="border border-[var(--app-border)] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--app-foreground)]">Tiến độ cấp độ</h2>
          <p className="mt-1 text-xs text-[var(--app-muted)]">{current.mainGoal}</p>
        </div>
        {next && (
          <AppStatus variant="teal" size="sm">
            Mốc tiếp theo: {next.label}
          </AppStatus>
        )}
      </div>

      <AppProgress
        value={percent}
        label="Cấp độ"
        valueLabel={`${percent}%`}
      />

      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--app-subtle)]">
        {LEVEL_ORDER.map((level) => (
          <span key={level}>{getLevelConfig(level).label}</span>
        ))}
      </div>

      {canLevelUp && next && (
        <div className="rounded-[8px] border border-[var(--app-success)]/40 bg-[var(--app-success)]/10 p-3 text-xs font-bold text-[var(--app-success)]">
          Bạn đã sẵn sàng lên cấp {next.label}. Bấm nút nâng cấp để chuyển lộ trình.
        </div>
      )}
    </AppSurface>
  );
}
