import { useChessGame } from '../../contexts/ChessGameContext';
import GameTimer from '../GameTimer';

/**
 * GameInfoBar - compact game status, turn indicator, and timer.
 * Check is intentionally represented on the king square instead of as text.
 */
export default function GameInfoBar({ isThinking }) {
  const { activeGame, playerColor, isGameOver, playState } = useChessGame();

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
    turnText = isPlayerTurn ? 'Lượt của bạn' : 'Lượt đối thủ';
    turnAriaLabel = isThinking ? 'Máy đang suy nghĩ' : turnText;
  }

  return (
    <div
      className="flex items-center justify-between rounded-full border border-[var(--app-border)] bg-[var(--app-muted-surface)]/60 px-4 py-2 shadow-2xs"
      role="status"
      aria-live="polite"
      aria-label={`${ariaLabel}. ${turnAriaLabel}`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold text-[#030302]`}>{statusText}</span>

        {turnText && (
          <div className="flex items-center gap-1.5">
            {!isGameOver && (
              <span
                className={`h-2 w-2 rounded-full bg-[var(--app-secondary)] ${isThinking ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
            )}
            <span className="text-xs font-medium text-[var(--app-muted)]">{turnText}</span>
          </div>
        )}
      </div>

      <GameTimer isPlaying={playState === 'playing'} />
    </div>
  );
}
