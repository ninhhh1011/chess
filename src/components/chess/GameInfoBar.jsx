import { useChessGame } from '../../contexts/ChessGameContext';

/**
 * GameInfoBar - compact game status and turn indicator.
 * Check is intentionally represented on the king square instead of as text.
 */
export default function GameInfoBar() {
  const { activeGame, playerColor, gameMode, isBotThinking, isGameOver, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isPlayerTurn = currentTurn === playerColor;

  let statusText = 'Đang chơi';
  let statusColor = 'text-slate-300';

  if (isGameOver) {
    if (activeGame.isCheckmate()) {
      const winner = currentTurn === 'w' ? 'Đen thắng' : 'Trắng thắng';
      statusText = winner;
      statusColor = currentTurn === playerColor ? 'text-rose-300' : 'text-emerald-300';
    } else {
      statusText = 'Hòa';
      statusColor = 'text-slate-400';
    }
  }

  let turnText = '';
  if (!isGameOver) {
    if (gameMode === GAME_MODES.BOT) {
      turnText = isPlayerTurn ? 'Lượt của bạn' : 'Lượt đối thủ';
    } else {
      turnText = currentTurn === 'w' ? 'Lượt trắng' : 'Lượt đen';
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2">
      <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>

      {turnText && (
        <div className="flex items-center gap-1.5">
          {!isGameOver && (
            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${isBotThinking ? 'animate-pulse' : ''}`} />
          )}
          <span className="text-sm font-semibold text-emerald-300">{turnText}</span>
        </div>
      )}
    </div>
  );
}
