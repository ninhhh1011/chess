import { useMemo } from 'react';

function evaluationToWhitePawns(evaluation, fen) {
  if (!evaluation) return 0;

  const rawValue =
    evaluation.type === 'mate' ? (evaluation.value > 0 ? 99 : -99) : (Number(evaluation.value) || 0) / 100;

  const turn = fen?.split(' ')[1] || 'w';
  return turn === 'b' ? -rawValue : rawValue;
}

function evaluationToPercent(analysis) {
  const pawns = evaluationToWhitePawns(analysis?.evaluation, analysis?.fen);
  return Math.max(4, Math.min(96, 50 + Math.tanh(pawns / 4) * 44));
}

function formatEvaluation(evaluation) {
  if (!evaluation) return null; // Return null when no evaluation
  if (evaluation.type === 'mate') return `M${evaluation.value}`;
  if (evaluation.display) return evaluation.display;
  return `${evaluation.value >= 0 ? '+' : ''}${((evaluation.value || 0) / 100).toFixed(2)}`;
}

export default function LiveEvaluationBar({ analysis, status, hidden }) {
  // If hidden or no valid analysis, return minimal placeholder
  if (hidden || !analysis?.evaluation) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-2 opacity-0 sm:w-12" aria-hidden="true">
        <div className="h-5 w-full" />
        <div className="relative min-h-[260px] flex-1" />
        <div className="h-4 w-full" />
      </div>
    );
  }

  const whitePercent = useMemo(() => evaluationToPercent(analysis), [analysis]);
  const display = useMemo(() => formatEvaluation(analysis?.evaluation), [analysis]);

  const whitePawns = useMemo(
    () => evaluationToWhitePawns(analysis?.evaluation, analysis?.fen),
    [analysis]
  );

  const leader = useMemo(() => {
    if (Math.abs(whitePawns) < 0.2) return 'Cân bằng';
    return whitePawns > 0 ? 'Trắng hơn' : 'Đen hơn';
  }, [whitePawns]);

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-2 sm:w-12" role="img" aria-label={`Đánh giá: ${leader}`}>
      <div className="rounded-lg border border-border bg-bg-surface px-1.5 py-1 text-[0.65rem] font-bold text-primary-300 sm:text-xs">
        {display || '---'}
      </div>
      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-full border border-border bg-bg-base shadow-inner">
        <div
          className="absolute inset-x-0 bottom-0 bg-slate-100 transition-all duration-300"
          style={{ height: `${whitePercent}%` }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px bg-primary-400/70" />
      </div>
      <div className="text-center text-[0.62rem] font-bold uppercase leading-3 tracking-[0.12em] text-text-tertiary">
        {leader}
      </div>
    </div>
  );
}
