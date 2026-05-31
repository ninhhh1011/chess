import { useChessGame } from '../../contexts/ChessGameContext';
import { RESULT_COPY } from '../../config/brand';

function getResultKind(activeGame, playerColor) {
  if (activeGame.isDraw()) return 'draw';
  if (!activeGame.isCheckmate()) return 'draw';
  const winner = activeGame.turn() === 'w' ? 'b' : 'w';
  return winner === playerColor ? 'win' : 'lose';
}

export default function ResultModal() {
  const { activeGame, playerColor, shouldShowGameOverModal, analysisMode, enterAnalysisMode, newGame } = useChessGame();

  if (!shouldShowGameOverModal || analysisMode) return null;
  if (!activeGame.isGameOver()) return null;

  const copy = RESULT_COPY[getResultKind(activeGame, playerColor)];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4">
      <div className="max-w-md rounded-xl border border-emerald-400/40 bg-slate-900/95 p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-emerald-300">{copy.title}</h2>
        <p className="mt-4 text-base font-medium text-slate-100">{copy.description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className="btn-primary" onClick={newGame}>
            {copy.primary}
          </button>
          <button className="btn-secondary" onClick={enterAnalysisMode}>
            {copy.secondary}
          </button>
        </div>
      </div>
    </div>
  );
}
