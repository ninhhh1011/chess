import { LEVEL_ORDER, getLevelConfig } from '../../data/levelConfig';

export default function LevelProgress({ profile, canLevelUp, nextLevel }) {
  const index = Math.max(0, LEVEL_ORDER.indexOf(profile.currentLevel));
  const percent = Math.round(((index + 1) / LEVEL_ORDER.length) * 100);
  const current = getLevelConfig(profile.currentLevel);
  const next = nextLevel ? getLevelConfig(nextLevel) : null;

  return <div className="rounded-xl border border-slate-800 bg-slate-800 p-6 ">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">Tiến độ level</h2>
        <p className="mt-2 text-slate-400">{current.mainGoal}</p>
      </div>
      {next && <span className="text-sm font-bold text-emerald-500">Mốc tiếp theo: {next.label}</span>}
    </div>
    <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-950/70">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
    <div className="mt-3 flex justify-between text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
      {LEVEL_ORDER.map((level) => <span key={level}>{getLevelConfig(level).label}</span>)}
    </div>
    {canLevelUp && next && <p className="mt-5 rounded-xl bg-emerald-500/15 p-4 font-bold text-emerald-500">Bạn có vẻ đã sẵn sàng lên cấp {next.label}. Bấm nút nâng cấp để chuyển lộ trình.</p>}
  </div>;
}
