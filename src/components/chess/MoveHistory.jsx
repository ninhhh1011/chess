import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { getUserProfile } from '../../services/userProfileService';
import { formatSevenTagRosterPgn } from '../../utils/pgnFormat';
import { BRAND_NAMES } from '../../config/brand';
import { AppButton } from '@/ui/AppButton';
import { AppSurface } from '@/ui/AppSurface';
import { AppStatus } from '@/ui/AppStatus';
import { Copy, Check } from 'lucide-react';

function mapToneToStatusVariant(tone) {
  const map = {
    pending: 'basic',
    great: 'teal',
    best: 'teal',
    good: 'basic',
    inaccuracy: 'warning',
    mistake: 'copper',
    blunder: 'danger',
  };
  return map[tone] || 'basic';
}

/**
 * MoveHistory - Danh sách nước đi với HeroUI components
 */
export default function MoveHistory() {
  const { moveHistory, moveAnnotations, currentPgn, playerColor, botElo, gameResult, analysisMode, goToAnalysisPly, analysisPly } = useChessGame();
  const [copied, setCopied] = useState(false);

  function copyPgn() {
    if (!moveHistory.length && !currentPgn) return;
    const profile = getUserProfile();
    const fullPgn = formatSevenTagRosterPgn({
      moves: moveHistory,
      white: playerColor === 'w' ? 'Bạn' : BRAND_NAMES.bot,
      black: playerColor === 'w' ? BRAND_NAMES.bot : 'Bạn',
      whiteElo: playerColor === 'w' ? (profile?.playerElo || 1000) : botElo,
      blackElo: playerColor === 'w' ? botElo : (profile?.playerElo || 1000),
      result: gameResult,
      playerColor,
    });

    navigator.clipboard.writeText(fullPgn).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        const textarea = document.createElement('textarea');
        textarea.value = fullPgn;
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
      <div className="max-h-[380px] overflow-y-auto p-2.5 bg-[var(--app-muted-surface)]/50 rounded-[18px] border border-[var(--app-border)]">
        {moveHistory.length ? (
          <div className="grid grid-cols-2 gap-1.5">
            {moveHistory.map((move, index) => {
              const annotation = moveAnnotations[index];
              const isCurrent = analysisMode && analysisPly === index + 1;
              const statusVariant = annotation ? mapToneToStatusVariant(annotation.tone) : 'basic';

              return (
                <AppButton
                  key={index}
                  size="sm"
                  variant={isCurrent ? 'secondary' : 'ghost'}
                  onClick={() => {
                    if (analysisMode) goToAnalysisPly(index + 1);
                  }}
                  className={`w-full justify-between h-auto py-1 px-3 text-xs font-normal rounded-full ${
                    isCurrent
                      ? 'border-[#030302] font-semibold text-[#030302] bg-white shadow-2xs'
                      : 'text-[var(--app-muted)] hover:text-[#030302] bg-transparent hover:bg-white/80 border-transparent'
                  } ${analysisMode ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="min-w-0 truncate text-left">
                    <span className="text-[var(--app-subtle)] font-mono mr-1">{index + 1}.</span>
                    <span className="text-[#030302] font-medium">{move}</span>
                  </span>
                  {annotation && (
                    <AppStatus
                      variant={statusVariant}
                      size="sm"
                      className="px-1.5 py-0 h-4 text-[10px] shrink-0 font-bold"
                    >
                      {annotation.symbol}
                    </AppStatus>
                  )}
                </AppButton>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-[var(--app-muted)]">
            Chưa có nước cờ nào được thực hiện.
          </p>
        )}
      </div>
    </div>
  );
}
