export interface EvaluationBarPrototypeProps {
  score?: number; // positive = white advantage, negative = black advantage, e.g. +0.8 or -1.4
  mateIn?: number | null;
  className?: string;
  isVertical?: boolean;
}

export function EvaluationBarPrototype({
  score = -1.4,
  mateIn = null,
  className = '',
  isVertical = true,
}: EvaluationBarPrototypeProps) {
  // Clamp display percentage (50% = 0.00, 100% = +10 white win, 0% = -10 black win)
  const clampedScore = Math.max(-10, Math.min(10, score));
  const whitePercent = 50 + clampedScore * 4;

  const scoreText = mateIn !== null
    ? `M${Math.abs(mateIn)}`
    : (score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1));

  if (!isVertical) {
    return (
      <div className={`w-full flex items-center gap-2 ${className}`}>
        <div className="flex-1 h-3 rounded-full bg-slate-900 border border-[var(--app-border)] overflow-hidden flex">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${whitePercent}%` }}
          />
        </div>
        <span className="text-[11px] font-mono font-bold text-[var(--app-foreground)] w-10 text-right">
          {scoreText}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-6 h-full max-h-[540px] rounded-[6px] border border-[var(--app-border)] bg-slate-900 overflow-hidden flex flex-col justify-between shadow-xs select-none ${className}`}
      title={`Đánh giá thế cờ: ${scoreText}`}
    >
      {/* Black top side */}
      <div
        className="w-full bg-slate-900 transition-all duration-300 relative flex items-start justify-center pt-1"
        style={{ height: `${100 - whitePercent}%` }}
      >
        {score < 0 && (
          <span className="text-[9px] font-mono font-bold text-slate-400">
            {scoreText}
          </span>
        )}
      </div>

      {/* White bottom side */}
      <div
        className="w-full bg-slate-100 transition-all duration-300 relative flex items-end justify-center pb-1"
        style={{ height: `${whitePercent}%` }}
      >
        {score >= 0 && (
          <span className="text-[9px] font-mono font-bold text-slate-800">
            {scoreText}
          </span>
        )}
      </div>
    </div>
  );
}
