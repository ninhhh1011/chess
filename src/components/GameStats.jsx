import { useGameStats } from '../hooks/useGameStats';

export default function GameStats() {
  const { stats, resetStats, winRate, formatPlayTime } = useGameStats();

  if (stats.gamesPlayed === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary">Thống kê</h4>
        <button
          onClick={resetStats}
          className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Win rate bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-text-secondary">Tỷ lệ thắng</span>
          <span className="font-medium text-primary-400">{winRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-base">
          <div
            className="h-full rounded-full bg-primary-400 transition-all duration-500"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Tổng ván" value={stats.gamesPlayed} />
        <StatCard label="Thắng" value={stats.gamesWon} color="text-primary-400" />
        <StatCard label="Thua" value={stats.gamesLost} color="text-red-400" />
        <StatCard label="Hòa" value={stats.gamesDrawn} />
      </div>

      {/* Additional stats */}
      <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs">
        <span className="text-text-tertiary">Tổng nước đi</span>
        <span className="font-medium text-text-secondary">{stats.totalMoves}</span>
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-3 text-xs">
        <span className="text-text-tertiary">Thời gian chơi</span>
        <span className="font-medium text-text-secondary">{formatPlayTime(stats.totalPlayTime)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="rounded border border-border bg-bg-base p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-tertiary">{label}</div>
    </div>
  );
}
