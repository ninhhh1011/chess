import { useChessGame } from '../../contexts/ChessGameContext';

/**
 * GameInfoBar - Compact game status bar
 * Shows only: current game state · whose turn
 */
export default function GameInfoBar({ botElo = 1200 }) {
  const { activeGame, playerColor, gameMode, isBotThinking, isGameOver, isCheck, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isPlayerTurn = currentTurn === playerColor;

  // Game status
  let statusText = 'Đang chơi';
  let statusColor = 'text-blue-400';

  if (isGameOver) {
    if (activeGame.isCheckmate()) {
      const winner = currentTurn === 'w' ? 'Đen thắng' : 'Trắng thắng';
      statusText = winner;
      statusColor = currentTurn === playerColor ? 'text-red-400' : 'text-green-400';
    } else {
      statusText = 'Hòa';
      statusColor = 'text-slate-400';
    }
  } else if (isCheck) {
    statusText = 'Chiếu';
    statusColor = 'text-orange-400';
  }

  // Turn indicator
  let turnText = '';
  if (!isGameOver) {
    if (gameMode === GAME_MODES.BOT) {
      if (isBotThinking) {
        turnText = 'Bot đang nghĩ';
      } else if (isPlayerTurn) {
        turnText = 'Lượt của bạn';
      } else {
        turnText = 'Lượt của ngoại lệ của cô ấy';
      }
    } else {
      turnText = currentTurn === 'w' ? 'Lượt trắng' : 'Lượt đen';
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
      {/* Left: Game status */}
      <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>

      {/* Right: Turn indicator */}
      {turnText && (
        <div className="flex items-center gap-1.5">
          {!isGameOver && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          )}
          <span className="text-sm font-bold text-amber-300">{turnText}</span>
        </div>
      )}
    </div>
  );
}
