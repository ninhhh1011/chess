import { useChessGame } from '../../contexts/ChessGameContext';

function annotationClassName(tone) {
  const tones = {
    pending: 'border-slate-600 bg-slate-700 text-slate-200',
    brilliant: 'border-cyan-400 bg-cyan-900/40 text-cyan-200',
    great: 'border-emerald-400 bg-emerald-900/40 text-emerald-200',
    best: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
    good: 'border-slate-500/50 bg-slate-500/10 text-slate-300',
    inaccuracy: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300',
    mistake: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
    blunder: 'border-red-500 bg-red-900/40 text-red-200',
  };
  return tones[tone] || tones.pending;
}

/**
 * MoveHistory - Refactored gọn gàng hơn
 * Bỏ header lớn, chỉ giữ danh sách nước đi
 */
export default function MoveHistory() {
  const { moveHistory, moveAnnotations, currentPgn, analysisMode, goToAnalysisPly, analysisPly } = useChessGame();

  function copyPgn() {
    if (!currentPgn) return;
    navigator.clipboard.writeText(currentPgn).then(
      () => {
        // Success
      },
      () => {
        // Fallback
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
    <div>
      {/* Header gọn */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300">
          {moveHistory.length} nước đi
        </h3>
        {moveHistory.length > 0 && (
          <button
            onClick={copyPgn}
            className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
            title="Sao chép PGN"
          >
            📋 Sao chép
          </button>
        )}
      </div>

      {/* Danh sách nước đi */}
      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-2">
        {moveHistory.length ? (
          <div className="grid grid-cols-2 gap-1.5">
            {moveHistory.map((move, index) => {
              const annotation = moveAnnotations[index];
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (analysisMode) goToAnalysisPly(index + 1);
                  }}
                  className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm transition text-left ${
                    analysisMode && analysisPly === index + 1
                      ? 'bg-slate-700 ring-1 ring-emerald-500/50'
                      : 'bg-slate-800 hover:bg-slate-700'
                  } ${analysisMode ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="min-w-0 truncate text-slate-300">
                    <b className="text-slate-400 font-medium">{index + 1}.</b> {move}
                  </span>
                  {annotation && (
                    <span
                      title={annotation.label}
                      className={`shrink-0 rounded border px-1 py-0.5 text-xs font-bold ${annotationClassName(
                        annotation.tone
                      )}`}
                    >
                      {annotation.symbol}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có nước đi nào</p>
        )}
      </div>
    </div>
  );
}
