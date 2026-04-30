export default function OpeningProgress({ progress }) {
  const percent = progress?.masteryPercent || 0;
  return <div>
    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-cream/45">
      <span>Mastery</span><span>{percent}%</span>
    </div>
    <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/70">
      <div className="h-full rounded-full bg-gradient-to-r from-gold to-amber-500" style={{ width: `${percent}%` }} />
    </div>
    {progress?.attempts ? <p className="mt-2 text-xs text-cream/50">{progress.attempts} lần luyện · {progress.successCount} lần hoàn thành</p> : <p className="mt-2 text-xs text-cream/45">Chưa có tiến độ.</p>}
  </div>;
}
