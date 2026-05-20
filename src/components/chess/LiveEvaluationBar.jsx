import { useMemo } from 'react';

function evaluationToWhitePawns(evaluation, fen, source = 'stockfish_wasm') {
  if (!evaluation) return 0;

  const rawValue =
    evaluation.type === 'mate' ? (evaluation.value > 0 ? 99 : -99) : (Number(evaluation.value) || 0) / 100;

  if (source === 'fallback') {
    return rawValue;
  }

  const turn = fen.split(' ')[1] || 'w';
  return turn === 'b' ? -rawValue : rawValue;
}

function evaluationToPercent(analysis) {
  const pawns = evaluationToWhitePawns(analysis?.evaluation, analysis?.fen, analysis?.source);
  return Math.max(4, Math.min(96, 50 + Math.tanh(pawns / 4) * 44));
}

function formatEvaluation(evaluation) {
  if (!evaluation) return '0.00';
  if (evaluation.type === 'mate') return `M${evaluation.value}`;
  if (evaluation.display) return evaluation.display;
  return `${evaluation.value >= 0 ? '+' : ''}${((evaluation.value || 0) / 100).toFixed(2)}`;
}

export default function LiveEvaluationBar({ analysis, status }) {
  const whitePercent = useMemo(() => evaluationToPercent(analysis), [analysis]);
  const display = useMemo(() => formatEvaluation(analysis?.evaluation), [analysis]);

  const whitePawns = useMemo(
    () => evaluationToWhitePawns(analysis?.evaluation, analysis?.fen, analysis?.source),
    [analysis]
  );

  const leader = useMemo(() => {
    if (Math.abs(whitePawns) < 0.2) return 'Cân bằng';
    return whitePawns > 0 ? 'Trắng hơn' : 'Đen hơn';
  }, [whitePawns]);

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-2 sm:w-12">
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[0.65rem] font-black text-amber-300 sm:text-xs">
        {display}
      </div>
      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-full border border-slate-600 bg-slate-950 shadow-inner">
        <div
          className="absolute inset-x-0 bottom-0 bg-slate-100 transition-all duration-300"
          style={{ height: `${whitePercent}%` }}
        />
        <div className="absolute inset-x-0 top-1/2 h-px bg-amber-400/70" />
      </div>
      <div className="text-center text-[0.62rem] font-black uppercase leading-3 tracking-[0.12em] text-slate-400">
        {status || leader}
      </div>
    </div>
  );
}
