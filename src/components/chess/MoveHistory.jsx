import { useChessGame } from '../../contexts/ChessGameContext';

function annotationClassName(tone) {
  const tones = {
    pending: 'border-slate-600 bg-slate-700 text-slate-200',
    brilliant: 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100',
    best: 'border-emerald-300/50 bg-emerald-400/15 text-emerald-100',
    inaccuracy: 'border-amber-300/50 bg-amber-400/15 text-amber-100',
    mistake: 'border-orange-300/50 bg-orange-400/15 text-orange-100',
    blunder: 'border-red-300/50 bg-red-500/15 text-red-100',
  };
  return tones[tone] || tones.pending;
}

export default function MoveHistory() {
  const { moveHistory, moveAnnotations, currentPgn } = useChessGame();

  function copyPgn() {
    if (!currentPgn) return;
    navigator.clipboard.writeText(currentPgn).then(
      () => {
        // Success - could add toast notification here
      },
      () => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = currentPgn;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    );
  }

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400/75">Lịch sử</p>
          <h2 className="mt-1 text-xl font-black text-slate-50">Nước đi</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">
            {moveHistory.length} nước
          </span>
          {moveHistory.length > 0 && (
            <button
              onClick={copyPgn}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 transition hover:border-amber-400/60 hover:bg-slate-700 hover:text-amber-300"
              title="Sao chép PGN"
            >
              📋 PGN
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950/45 p-3">
        {moveHistory.length ? (
          <ol className="grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {moveHistory.map((move, index) => {
              const annotation = moveAnnotations[index];
              return (
                <li key={index} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/80 px-3 py-2">
                  <span className="min-w-0 truncate">
                    <b className="text-amber-300">{index + 1}.</b> {move}
                  </span>
                  {annotation && (
                    <span
                      title={annotation.label}
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-black ${annotationClassName(
                        annotation.tone
                      )}`}
                    >
                      {annotation.symbol}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">Chưa có nước đi nào.</p>
        )}
      </div>
    </section>
  );
}
