import { useMemo } from 'react';

function evaluationToWhitePawns(evaluation) {
  if (!evaluation) return 0;

  return evaluation.type === 'mate'
    ? (evaluation.value > 0 ? 99 : -99)
    : (Number(evaluation.value) || 0) / 100;
}

function evaluationToPercent(analysis) {
  const pawns = evaluationToWhitePawns(analysis?.evaluation);
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
    () => evaluationToWhitePawns(analysis?.evaluation),
    [analysis]
  );

  const leader = useMemo(() => {
    if (Math.abs(whitePawns) < 0.2) return 'Cân bằng';
    return whitePawns > 0 ? 'Trắng hơn' : 'Đen hơn';
  }, [whitePawns]);

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-2 sm:w-12" role="img" aria-label={`Đánh giá: ${leader}`}>
      <div className="rounded-full border border-[var(--app-border)] bg-white px-2 py-0.5 text-[0.7rem] font-bold text-[#030302] shadow-2xs">
        {display || '---'}
      </div>
      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-full border border-[var(--app-border)] bg-[#1c1c1a] shadow-inner w-4 sm:w-5">
        <div
          className="absolute inset-x-0 bottom-0 bg-white transition-all duration-300"
          style={{ height: `${whitePercent}%` }}
        />
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[var(--app-secondary)]" />
      </div>
      <div className="text-center text-[0.62rem] font-semibold uppercase leading-3 tracking-[0.08em] text-[var(--app-muted)]">
        {leader}
      </div>
    </div>
  );
}
