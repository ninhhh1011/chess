import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { AppButton } from '../../ui';

export default function ReviewNavigator() {
  const {
    analysisPly,
    analysisMainline,
    goToAnalysisPly,
    exitAnalysisMode,
    newGame,
    setPlayState,
    playState,
    restartGameWithCurrentSettings
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
    <div className="flex flex-col gap-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">{BRAND_NAMES.analysis}</h4>
        {playState === 'analysis' && (
          <button 
            onClick={handleExitReview}
            className="text-xs text-[var(--app-subtle)] hover:text-[var(--app-foreground)]"
          >
            Đóng
          </button>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md bg-[var(--app-surface-raised)] border border-[var(--app-border)] p-1.5">
        <button
          onClick={handleFirst}
          disabled={analysisPly === 0}
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--app-surface)] text-xs text-[var(--app-muted)] hover:text-[var(--app-foreground)] disabled:opacity-40"
          title="Về đầu ván"
        >
          |&lt;
        </button>
        <button
          onClick={handlePrev}
          disabled={analysisPly === 0}
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--app-surface)] text-xs text-[var(--app-muted)] hover:text-[var(--app-foreground)] disabled:opacity-40"
          title="Lùi một nước"
        >
          &lt;
        </button>
        <div className="px-3 font-mono text-xs text-[var(--app-foreground)]">
          {analysisPly} / {totalMoves}
        </div>
        <button
          onClick={handleNext}
          disabled={analysisPly === totalMoves}
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--app-surface)] text-xs text-[var(--app-muted)] hover:text-[var(--app-foreground)] disabled:opacity-40"
          title="Tiến một nước"
        >
          &gt;
        </button>
        <button
          onClick={handleLast}
          disabled={analysisPly === totalMoves}
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--app-surface)] text-xs text-[var(--app-muted)] hover:text-[var(--app-foreground)] disabled:opacity-40"
          title="Về cuối ván"
        >
          &gt;|
        </button>
      </div>

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
    </div>
  );
}
