import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { AppButton } from '../../ui/AppButton';
import { AppSurface } from '../../ui/AppSurface';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X } from 'lucide-react';

export default function ReviewNavigator() {
  const {
    analysisPly,
    analysisMainline,
    goToAnalysisPly,
    exitAnalysisMode,
    newGame,
    setPlayState,
    playState,
    restartGameWithCurrentSettings,
  } = useChessGame();

  if (playState !== 'analysis') return null;

  const totalMoves = analysisMainline.length;

  const handleFirst = () => goToAnalysisPly(0);
  const handlePrev = () => goToAnalysisPly(analysisPly - 1);
  const handleNext = () => goToAnalysisPly(analysisPly + 1);
  const handleLast = () => goToAnalysisPly(totalMoves);

  const handleExitReview = () => {
    exitAnalysisMode();
    setPlayState('review'); // Go back to the summary modal
  };

  const handleNewGame = () => {
    exitAnalysisMode();
    newGame();
    setPlayState('lobby');
  };

  return (
    <AppSurface variant="base" radius="sm" className="flex flex-col gap-2.5 p-3 shadow-xs">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">
          {BRAND_NAMES.analysis}
        </h4>
        {playState === 'analysis' && (
          <AppButton
            variant="ghost"
            size="sm"
            onClick={handleExitReview}
            className="h-6 px-1.5 text-[11px] text-[var(--app-subtle)] hover:text-[var(--app-foreground)]"
            leftIcon={<X className="h-3 w-3" />}
          >
            Đóng
          </AppButton>
        )}
      </div>

      <AppSurface
        variant="raised"
        radius="sm"
        className="flex items-center justify-between p-1.5"
      >
        <AppButton
          variant="ghost"
          size="sm"
          onClick={handleFirst}
          disabled={analysisPly === 0}
          className="h-7 w-7 p-0"
          aria-label="Về đầu ván"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </AppButton>
        <AppButton
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={analysisPly === 0}
          className="h-7 w-7 p-0"
          aria-label="Lùi một nước"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </AppButton>
        <div className="px-3 font-mono text-xs font-semibold text-[var(--app-foreground)]">
          {analysisPly} / {totalMoves}
        </div>
        <AppButton
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={analysisPly === totalMoves}
          className="h-7 w-7 p-0"
          aria-label="Tiến một nước"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </AppButton>
        <AppButton
          variant="ghost"
          size="sm"
          onClick={handleLast}
          disabled={analysisPly === totalMoves}
          className="h-7 w-7 p-0"
          aria-label="Về cuối ván"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </AppButton>
      </AppSurface>

      <div className="grid grid-cols-2 gap-2">
        <AppButton
          size="sm"
          variant="secondary"
          onClick={handleNewGame}
        >
          Đổi thiết lập
        </AppButton>
        <AppButton
          size="sm"
          variant="primary"
          onClick={() => {
            exitAnalysisMode();
            restartGameWithCurrentSettings();
          }}
        >
          {UI_COPY.newGame}
        </AppButton>
      </div>
    </AppSurface>
  );
}
