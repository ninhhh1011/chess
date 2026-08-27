import { useChessGame } from '../../contexts/ChessGameContext';
import GameTimer from '../GameTimer';

/**
 * GameInfoBar - compact game status, turn indicator, and timer.
 * Check is intentionally represented on the king square instead of as text.
 */
export default function GameInfoBar() {
  const { activeGame, playerColor, gameMode, isBotThinking, isGameOver, playState, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isPlayerTurn = currentTurn === playerColor;

  let statusText = 'Đang chơi';
  let statusColor = 'text-text-primary';
  let ariaLabel = statusText;

  if (isGameOver) {
    if (activeGame.isCheckmate()) {
      const winner = currentTurn === 'w' ? 'Đen thắng' : 'Trắng thắng';
      statusText = winner;
      ariaLabel = winner;
      statusColor = currentTurn === playerColor ? 'text-red-400' : 'text-primary-400';
    } else {
      statusText = 'Hòa';
      ariaLabel = 'Ván cờ hòa';
      statusColor = 'text-text-secondary';
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
      className="flex items-center justify-between rounded-lg border border-border bg-bg-base px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label={`${ariaLabel}. ${turnAriaLabel}`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>

        {turnText && (
          <div className="flex items-center gap-1.5">
            {!isGameOver && (
              <span
                className={`h-1.5 w-1.5 rounded-full bg-primary-400 ${isBotThinking ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
            )}
            <span className="text-sm font-semibold text-primary-300">{turnText}</span>
          </div>
        )}
      </div>

      <GameTimer isPlaying={playState === 'playing'} />
    </div>
  );
}
