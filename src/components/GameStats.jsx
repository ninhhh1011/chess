import { useState } from 'react';
import { useGameStats } from '../hooks/useGameStats';
import { AppSurface } from '@/ui/AppSurface';
import { AppProgress } from '@/ui/AppProgress';
import { AppButton } from '@/ui/AppButton';
import { AppAlertDialog } from '@/ui/AppAlertDialog';

export default function GameStats() {
  const { stats, resetStats, winRate, formatPlayTime } = useGameStats();
  const [showConfirm, setShowConfirm] = useState(false);

  if (stats.gamesPlayed === 0) return null;

  return (
    <>
      <AppSurface className="border border-[var(--app-border)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">Thống kê</h4>
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            className="text-xs text-[var(--app-muted)] hover:text-[var(--app-danger)] h-auto p-0 min-h-0"
          >
            Đặt lại
          </AppButton>
        </div>

        {/* Win rate bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--app-muted)]">Tỷ lệ thắng</span>
            <span className="font-mono font-bold text-[var(--app-accent)]">{winRate}%</span>
          </div>
          <AppProgress value={winRate} variant="pine" size="sm" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Tổng ván" value={stats.gamesPlayed} />
          <StatCard label="Thắng" value={stats.gamesWon} color="text-[var(--app-accent)]" />
          <StatCard label="Thua" value={stats.gamesLost} color="text-[var(--app-danger)]" />
          <StatCard label="Hòa" value={stats.gamesDrawn} />
        </div>

        {/* Additional stats */}
        <div className="flex justify-between border-t border-[var(--app-border)] pt-2.5 text-xs">
          <span className="text-[var(--app-subtle)]">Tổng nước đi</span>
          <span className="font-mono font-semibold text-[var(--app-foreground)]">{stats.totalMoves}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--app-border)] pt-2.5 text-xs">
          <span className="text-[var(--app-subtle)]">Thời gian chơi</span>
          <span className="font-mono font-semibold text-[var(--app-foreground)]">{formatPlayTime(stats.totalPlayTime)}</span>
        </div>
      </AppSurface>

      <AppAlertDialog
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        title="Đặt lại thống kê?"
        description="Toàn bộ số liệu ván đấu và thời gian chơi đã lưu trên thiết bị này sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmText="Đặt lại"
        cancelText="Hủy"
        variant="danger"
        onConfirm={resetStats}
      />
    </>
  );
}

function StatCard({ label, value, color = 'text-[var(--app-foreground)]' }) {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 text-center">
      <div className={`text-base font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
    </div>
  );
}
