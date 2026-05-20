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

/**
 * MoveHistory - Refactored gọn gàng hơn
 * Bỏ header lớn, chỉ giữ danh sách nước đi
 */
export default function MoveHistory() {
  const { moveHistory, moveAnnotations, currentPgn } = useChessGame();

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
            className="rounded bg-slate-700/60 px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-600"
            title="Sao chép PGN"
          >
            📋 Sao chép
          </button>
        )}
      </div>

      {/* Danh sách nước đi */}
      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-700/60 bg-slate-950/30 p-2">
        {moveHistory.length ? (
          <div className="grid grid-cols-2 gap-1.5">
            {moveHistory.map((move, index) => {
              const annotation = moveAnnotations[index];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 rounded bg-slate-800/60 px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-300">
                    <b className="text-amber-300">{index + 1}.</b> {move}
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
                </div>
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
