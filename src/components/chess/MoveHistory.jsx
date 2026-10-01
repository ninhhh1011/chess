import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES } from '../../config/brand';
import { AppButton } from '@/ui/AppButton';
import { AppSurface } from '@/ui/AppSurface';
import { Copy, Check } from 'lucide-react';

function annotationClassName(tone) {
  const tones = {
    pending: 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]',
    brilliant: 'border-[var(--app-info)]/40 bg-[var(--app-info)]/15 text-[var(--app-info)]',
    great: 'border-[var(--app-accent)]/40 bg-[var(--app-accent)]/15 text-[var(--app-accent)]',
    best: 'border-[var(--app-accent)]/50 bg-[var(--app-accent-soft)] text-[var(--app-accent)]',
    good: 'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)]',
    inaccuracy: 'border-[var(--app-warning)]/40 bg-[var(--app-warning)]/15 text-[var(--app-warning)]',
    mistake: 'border-[var(--app-copper)]/40 bg-[var(--app-copper)]/15 text-[var(--app-copper)]',
    blunder: 'border-[var(--app-danger)]/50 bg-[var(--app-danger)]/15 text-[var(--app-danger)]',
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
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[var(--app-foreground)] uppercase tracking-wider">
          {BRAND_NAMES.moveHistory} · {moveHistory.length} nước
        </h3>
        {moveHistory.length > 0 && (
          <AppButton
            size="sm"
            variant="ghost"
            onClick={copyPgn}
            leftIcon={copied ? <Check className="h-3 w-3 text-[var(--app-accent)]" /> : <Copy className="h-3 w-3" />}
            className="h-7 text-[11px] px-2"
          >
            {copied ? 'Đã sao chép' : 'Sao chép PGN'}
          </AppButton>
        )}
      </div>

      {/* Danh sách nước đi */}
      <AppSurface
        variant="raised"
        radius="sm"
        className="max-h-[380px] overflow-y-auto p-2"
      >
        {moveHistory.length ? (
          <div className="grid grid-cols-2 gap-1.5">
            {moveHistory.map((move, index) => {
              const annotation = moveAnnotations[index];
              const isCurrent = analysisMode && analysisPly === index + 1;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (analysisMode) goToAnalysisPly(index + 1);
                  }}
                  className={`flex items-center justify-between gap-1.5 rounded-[6px] px-2 py-1.5 text-xs transition-colors text-left outline-none ${
                    isCurrent
                      ? 'bg-[var(--app-surface-hover)] border border-[var(--app-accent)] font-semibold text-[var(--app-foreground)]'
                      : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-hover)] text-[var(--app-muted)] border border-transparent'
                  } ${analysisMode ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="min-w-0 truncate">
                    <span className="text-[var(--app-subtle)] font-mono mr-1">{index + 1}.</span>
                    <span className="text-[var(--app-foreground)] font-medium">{move}</span>
                  </span>
                  {annotation && (
                    <span
                      title={annotation.label}
                      className={`shrink-0 rounded-[4px] border px-1 py-0.2 text-[10px] font-bold ${annotationClassName(
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
          <p className="py-8 text-center text-xs text-[var(--app-muted)]">
            Chưa có nước cờ nào được thực hiện.
          </p>
        )}
      </AppSurface>
    </div>
  );
}
