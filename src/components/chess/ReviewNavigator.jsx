import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';

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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{BRAND_NAMES.analysis}</h4>
        {playState === 'analysis' && (
          <button 
            onClick={handleExitReview}
            className="text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Đóng
          </button>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-slate-950 p-2">
        <button
          onClick={handleFirst}
          disabled={analysisPly === 0}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          title="Về đầu ván"
        >
          |&lt;
        </button>
        <button
          onClick={handlePrev}
          disabled={analysisPly === 0}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          title="Lùi một nước"
        >
          &lt;
        </button>
        <div className="px-3 text-xs font-bold text-slate-300">
          {analysisPly} / {totalMoves}
        </div>
        <button
          onClick={handleNext}
          disabled={analysisPly === totalMoves}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          title="Tiến một nước"
        >
          &gt;
        </button>
        <button
          onClick={handleLast}
          disabled={analysisPly === totalMoves}
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          title="Về cuối ván"
        >
          &gt;|
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={handleNewGame}
          className="ui-button-secondary py-2 text-xs"
        >
          Đổi thiết lập
        </button>
        <button 
          onClick={() => {
            exitAnalysisMode();
            restartGameWithCurrentSettings();
          }}
          className="ui-button-primary py-2 text-xs"
        >
          {UI_COPY.newGame}
        </button>
      </div>
    </div>
  );
}
