import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES } from '../../config/brand';

function annotationClassName(tone) {
  const tones = {
    pending: 'border-border bg-bg-surface text-text-secondary',
    brilliant: 'border-cyan-400 bg-cyan-900/40 text-cyan-200',
    great: 'border-primary-400 bg-primary-900/40 text-primary-200',
    best: 'border-primary-500/50 bg-primary-500/10 text-primary-300',
    good: 'border-border/50 bg-bg-surface text-text-secondary',
    inaccuracy: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300',
    mistake: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
    blunder: 'border-red-500 bg-red-900/40 text-red-200',
  };
  return tones[tone] || tones.pending;
}

/**
 * MoveHistory - Danh sách nước đi với annotation badges
 */
export default function MoveHistory() {
  const { moveHistory, moveAnnotations, currentPgn, analysisMode, goToAnalysisPly, analysisPly } = useChessGame();
  const [copied, setCopied] = useState(false);

  function copyPgn() {
    if (!currentPgn) return;
    navigator.clipboard.writeText(currentPgn).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        const textarea = document.createElement('textarea');
        textarea.value = currentPgn;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">
          {BRAND_NAMES.moveHistory} · {moveHistory.length} nước
        </h3>
        {moveHistory.length > 0 && (
          <button
            onClick={copyPgn}
            className="rounded border border-border bg-bg-surface px-2 py-1 text-xs font-medium text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
            title="Sao chép PGN"
          >
            {copied ? '✓ Đã copy' : 'Sao chép PGN'}
          </button>
        )}
      </div>

      {/* Danh sách nước đi */}
      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-bg-base p-2">
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
                      ? 'bg-bg-surface ring-1 ring-primary-500/50'
                      : 'bg-bg-surface hover:bg-bg-elevated'
                  } ${analysisMode ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="min-w-0 truncate text-text-secondary">
                    <b className="text-text-tertiary font-medium">{index + 1}.</b> {move}
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
          <p className="py-8 text-center text-sm text-text-tertiary">Chưa có nước nào để gáy.</p>
        )}
      </div>
    </div>
  );
}
