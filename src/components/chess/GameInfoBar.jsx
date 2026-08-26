import { useChessGame } from '../../contexts/ChessGameContext';

/**
 * GameInfoBar - compact game status and turn indicator.
 * Check is intentionally represented on the king square instead of as text.
 * Includes aria-live for screen reader announcements.
 */
export default function GameInfoBar() {
  const { activeGame, playerColor, gameMode, isBotThinking, isGameOver, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isPlayerTurn = currentTurn === playerColor;

  let statusText = 'Đang chơi';
  let statusColor = 'text-slate-300';
  let ariaLabel = statusText;

  if (isGameOver) {
    if (activeGame.isCheckmate()) {
      const winner = currentTurn === 'w' ? 'Đen thắng' : 'Trắng thắng';
      statusText = winner;
      ariaLabel = winner;
      statusColor = currentTurn === playerColor ? 'text-rose-300' : 'text-emerald-300';
    } else {
      statusText = 'Hòa';
      ariaLabel = 'Ván cờ hòa';
      statusColor = 'text-slate-400';
    }
  }

  let turnText = '';
  let turnAriaLabel = '';
  if (!isGameOver) {
    if (gameMode === GAME_MODES.BOT) {
      turnText = isPlayerTurn ? 'Lượt của bạn' : 'Lượt đối thủ';
      turnAriaLabel = isBotThinking ? 'Máy đang suy nghĩ' : turnText;
    } else {
      turnText = currentTurn === 'w' ? 'Lượt trắng' : 'Lượt đen';
      turnAriaLabel = turnText;
    }
  }

  return (
    <div
      className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label={`${ariaLabel}. ${turnAriaLabel}`}
    >
      <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>

      {turnText && (
        <div className="flex items-center gap-1.5">
          {!isGameOver && (
            <span
              className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${isBotThinking ? 'animate-pulse' : ''}`}
              aria-hidden="true"
            />
          )}
          <span className="text-sm font-semibold text-emerald-300">{turnText}</span>
        </div>
      )}
    </div>
  );
}
