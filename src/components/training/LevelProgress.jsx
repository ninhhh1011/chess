import { LEVEL_ORDER, getLevelConfig } from '../../data/levelConfig';

export default function LevelProgress({ profile, canLevelUp, nextLevel }) {
  const index = Math.max(0, LEVEL_ORDER.indexOf(profile.currentLevel));
  const percent = Math.round(((index + 1) / LEVEL_ORDER.length) * 100);
  const current = getLevelConfig(profile.currentLevel);
  const next = nextLevel ? getLevelConfig(nextLevel) : null;

  return <div className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-black">Tiến độ level</h2>
        <p className="mt-2 text-cream/65">{current.mainGoal}</p>
      </div>
      {next && <span className="text-sm font-bold text-gold">Mốc tiếp theo: {next.label}</span>}
    </div>
    <div className="mt-5 h-4 overflow-hidden rounded-full bg-ink/70">
      <div className="h-full rounded-full bg-gradient-to-r from-gold to-amber-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
    <div className="mt-3 flex justify-between text-xs font-bold uppercase tracking-[0.15em] text-cream/45">
      {LEVEL_ORDER.map((level) => <span key={level}>{getLevelConfig(level).label}</span>)}
    </div>
    {canLevelUp && next && <p className="mt-5 rounded-2xl bg-gold/15 p-4 font-bold text-gold">Bạn có vẻ đã sẵn sàng lên cấp {next.label}. Bấm nút nâng cấp để chuyển lộ trình.</p>}
  </div>;
}
