import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChessGame } from '../../contexts/ChessGameContext';
import { RESULT_COPY } from '../../config/brand';
import { AppDialog } from '@/ui/AppDialog';
import { AppButton } from '@/ui/AppButton';
import { AppStatus } from '@/ui/AppStatus';
import { ChevronDown, ChevronUp, RotateCcw, Eye, Target, Sparkles } from 'lucide-react';

function getResultKind({ game, playerColor, resultNotice }) {
  if (game.isDraw() || resultNotice?.toLowerCase().includes('hòa')) return 'draw';
  if (resultNotice?.toLowerCase().includes('đầu hàng')) return 'lose';
  if (!game.isCheckmate()) return 'draw';

  const winner = game.turn() === 'w' ? 'b' : 'w';
  return winner === playerColor ? 'win' : 'lose';
}

export default function PostGameReview() {
  const navigate = useNavigate();
  const {
    game,
    playerColor,
    resultNotice,
    moveHistory,
    moveAnnotations,
    setPlayState,
    newGame,
    gameGoal,
    enterAnalysisMode,
    restartGameWithCurrentSettings,
  } = useChessGame();

  const [showStats, setShowStats] = useState(false);

  const resultKind = getResultKind({ game, playerColor, resultNotice });
  const resultCopy = RESULT_COPY[resultKind];

  const handlePlayAgain = () => {
    restartGameWithCurrentSettings();
  };

  const handleReviewBoard = () => {
    enterAnalysisMode();
    setPlayState('analysis');
  };

  // Compute move counts and collect real mistakes
  let brilliant = 0;
  let great = 0;
  let bestMoves = 0;
  let good = 0;
  let inaccuracies = 0;
  let mistakes = 0;
  let blunders = 0;

  const mistakeItems = [];

  Object.entries(moveAnnotations || {}).forEach(([plyKey, annotation]) => {
    const ply = parseInt(plyKey, 10);
    const moveNumber = !isNaN(ply) ? Math.floor(ply / 2) + 1 : 1;
    const isBlackMove = !isNaN(ply) ? ply % 2 === 1 : false;

    if (annotation.tone === 'blunder') {
      blunders += 1;
      mistakeItems.push({
        ply,
        moveNumber,
        isBlackMove,
        ...annotation,
        classification: 'blunder',
      });
    } else if (annotation.tone === 'mistake') {
      mistakes += 1;
      mistakeItems.push({
        ply,
        moveNumber,
        isBlackMove,
        ...annotation,
        classification: 'mistake',
      });
    } else if (annotation.tone === 'inaccuracy') {
      inaccuracies += 1;
      mistakeItems.push({
        ply,
        moveNumber,
        isBlackMove,
        ...annotation,
        classification: 'inaccuracy',
      });
    } else if (annotation.tone === 'good') {
      good += 1;
    } else if (annotation.tone === 'best') {
      bestMoves += 1;
    } else if (annotation.tone === 'great') {
      great += 1;
    } else if (annotation.tone === 'brilliant') {
      brilliant += 1;
    }
  });

  // Sort real mistakes by loss descending, take top 3
  mistakeItems.sort((a, b) => (b.loss || 0) - (a.loss || 0));
  const topMistakes = mistakeItems.slice(0, 3);

  // One-line summary
  const getSummaryLine = () => {
    if (resultKind === 'win') {
      return 'Ván cờ kết thúc xuất sắc. Bạn đã khai thác tốt các thời điểm quyết định.';
    }
    if (blunders > 0) {
      return `Ván đấu có ${blunders} nước đi mất quân nghiêm trọng cần chú ý xem lại.`;
    }
    if (mistakes > 0) {
      return 'Một vài nước đi thiếu chính xác đã khiến thế cờ chuyển dịch bất lợi.';
    }
    if (inaccuracies > 2) {
      return 'Thế cờ ổn định nhưng còn một số nước đi chưa tận dụng tối đa lợi thế.';
    }
    return 'Ván cờ giằng co cân bằng cho đến những nước cờ cuối cùng.';
  };

  const badgeConfig = {
    blunder: { label: 'Sai lầm nghiêm trọng', variant: 'danger' },
    mistake: { label: 'Nước đi lỗi', variant: 'warning' },
    inaccuracy: { label: 'Nước thiếu lực', variant: 'warning' },
  };

  return (
    <AppDialog
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleReviewBoard();
      }}
      title={
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{resultCopy.title}</span>
          <AppStatus
            variant={resultKind === 'win' ? 'teal' : resultKind === 'lose' ? 'danger' : 'basic'}
            size="sm"
          >
            {resultKind === 'win' ? 'Thắng' : resultKind === 'lose' ? 'Thua' : 'Hòa'}
          </AppStatus>
        </div>
      }
      description={resultCopy.description}
      maxWidth="max-w-xl"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <AppButton
              variant="outline"
              size="sm"
              onClick={handleReviewBoard}
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              className="flex-1 sm:flex-initial"
            >
              Xem bàn cờ
            </AppButton>
            <AppButton
              variant="outline"
              size="sm"
              onClick={() => {
                newGame();
                setPlayState('lobby');
              }}
              className="flex-1 sm:flex-initial"
            >
              Đổi cấp độ
            </AppButton>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => navigate('/exercises')}
              leftIcon={<Target className="h-3.5 w-3.5" />}
              className="flex-1 sm:flex-initial"
            >
              Luyện bài
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={handlePlayAgain}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              className="flex-1 sm:flex-initial font-bold"
            >
              Chơi lại
            </AppButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. Truthful One-line Summary */}
        <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 text-xs text-[var(--app-foreground)] leading-relaxed flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-[var(--app-accent)] shrink-0 mt-0.5" />
          <p>{getSummaryLine()}</p>
        </div>

        {/* 2. Top Mistakes Priority Section (Max 3) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">
              {topMistakes.length > 0 ? `Các nước cờ cần rút kinh nghiệm (${topMistakes.length})` : 'Đánh giá nước cờ'}
            </h3>
            {topMistakes.length > 0 && (
              <span className="text-[11px] text-[var(--app-muted)]">Ưu tiên tối đa 3 lỗi lớn nhất</span>
            )}
          </div>

          {topMistakes.length > 0 ? (
            <div className="space-y-2">
              {topMistakes.map((m, idx) => {
                const conf = badgeConfig[m.classification] || badgeConfig.mistake;
                return (
                  <div
                    key={idx}
                    className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--app-foreground)]">
                          Nước {m.moveNumber}{m.isBlackMove ? ' (Đen)' : ' (Trắng)'}
                        </span>
                        <AppStatus variant={conf.variant} size="sm">
                          {conf.label}
                        </AppStatus>
                      </div>
                      {m.loss > 0 && (
                        <span className="font-mono font-semibold text-[var(--app-danger)]">
                          -{(m.loss).toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2">
                        <span className="text-[10px] text-[var(--app-muted)] block">Bạn đã đi:</span>
                        <span className="font-mono font-bold text-[var(--app-danger)] text-xs mt-0.5 block">
                          {m.playedSan || 'Chưa rõ'}
                        </span>
                      </div>
                      <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2">
                        <span className="text-[10px] text-[var(--app-muted)] block">Nước tối ưu:</span>
                        <span className="font-mono font-bold text-[var(--app-success)] text-xs mt-0.5 block">
                          {m.bestSan || 'Chưa có gợi ý'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 text-xs text-[var(--app-muted)] text-center">
              Không có nước đi sai lầm nghiêm trọng nào được ghi nhận trong ván đấu này.
            </div>
          )}
        </div>

        {/* 3. Collapsible Game Statistics (Collapsed by default) */}
        <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)]/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-raised)] transition-colors cursor-pointer"
          >
            <span>Thống kê chi tiết ({moveHistory?.length || 0} nước đi)</span>
            {showStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showStats && (
            <div className="p-3 border-t border-[var(--app-border)] space-y-2.5">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-[6px] bg-[var(--app-surface)] p-2 border border-[var(--app-border)]">
                  <div className="text-[10px] font-bold text-[var(--app-success)]">Tốt nhất</div>
                  <div className="font-mono font-bold text-sm text-[var(--app-foreground)] mt-0.5">
                    {brilliant + great + bestMoves}
                  </div>
                </div>
                <div className="rounded-[6px] bg-[var(--app-surface)] p-2 border border-[var(--app-border)]">
                  <div className="text-[10px] font-bold text-[var(--app-muted)]">Bình thường</div>
                  <div className="font-mono font-bold text-sm text-[var(--app-foreground)] mt-0.5">{good}</div>
                </div>
                <div className="rounded-[6px] bg-[var(--app-surface)] p-2 border border-[var(--app-border)]">
                  <div className="text-[10px] font-bold text-[var(--app-warning)]">Thiếu lực</div>
                  <div className="font-mono font-bold text-sm text-[var(--app-foreground)] mt-0.5">
                    {inaccuracies + mistakes}
                  </div>
                </div>
                <div className="rounded-[6px] bg-[var(--app-surface)] p-2 border border-[var(--app-border)]">
                  <div className="text-[10px] font-bold text-[var(--app-danger)]">Nghiêm trọng</div>
                  <div className="font-mono font-bold text-sm text-[var(--app-foreground)] mt-0.5">{blunders}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppDialog>
  );
}
