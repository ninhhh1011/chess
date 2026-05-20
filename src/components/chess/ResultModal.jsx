import { useChessGame } from '../../contexts/ChessGameContext';

const BOT_NAME = 'ngoại lệ của cô ấy';

export default function ResultModal() {
  const { activeGame, playerColor, gameMode, shouldShowGameOverModal, analysisMode, enterAnalysisMode, newGame, GAME_MODES } = useChessGame();

  if (!shouldShowGameOverModal || analysisMode) return null;
  if (!activeGame.isGameOver()) return null;

  // Generate personalized result message
  let resultMessage = '';

  if (activeGame.isCheckmate()) {
    const winner = activeGame.turn() === 'w' ? 'b' : 'w'; // Winner is opposite of current turn

    if (gameMode === GAME_MODES.BOT) {
      if (winner === playerColor) {
        resultMessage = 'Bạn đã thắng';
      } else {
        resultMessage = `Bạn đã thua ${BOT_NAME}`;
      }
    } else {
      // Local mode
      resultMessage = winner === 'w' ? 'Trắng thắng' : 'Đen thắng';
    }
  } else if (activeGame.isDraw()) {
    resultMessage = 'Hòa';
  } else {
    resultMessage = 'Kết thúc ván đấu';
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="max-w-md rounded-2xl border border-amber-400/40 bg-slate-900/95 p-8 text-center shadow-glow">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-amber-500 text-4xl text-slate-950">
          ♔
        </div>
        <h2 className="text-3xl font-black text-amber-300">Kết thúc ván đấu</h2>
        <p className="mt-4 text-xl font-bold text-slate-100">{resultMessage}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className="btn-primary" onClick={enterAnalysisMode}>
            Phân tích ván
          </button>
          <button className="btn-secondary" onClick={newGame}>
            Ván mới
          </button>
        </div>
      </div>
    </div>
  );
}
