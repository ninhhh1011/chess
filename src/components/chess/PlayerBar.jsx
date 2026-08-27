import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';

/**
 * PlayerBar - compact player/opponent identity strip.
 */
export default function PlayerBar({ position = 'top' }) {
  const { activeGame, playerColor, boardOrientation, gameMode, botElo, isBotThinking, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isTop = position === 'top';

  const playerOrientation = playerColor === 'w' ? 'white' : 'black';
  const isPlayerAtBottom = boardOrientation === playerOrientation;
  const isPlayer = isTop ? !isPlayerAtBottom : isPlayerAtBottom;

  let displayName;
  let displayBadge;
  let avatarSrc;
  let isActive;

  if (isPlayer) {
    displayName = 'Bạn';
    displayBadge = playerColor === 'w' ? 'Trắng' : 'Đen';
    avatarSrc = null;
    isActive = currentTurn === playerColor;
  } else if (gameMode === GAME_MODES.BOT) {
    displayName = BRAND_NAMES.bot;
    displayBadge = botElo;
    avatarSrc = coachAvatar;
    isActive = currentTurn !== playerColor;
  } else {
    displayName = 'Đối thủ';
    displayBadge = playerColor === 'w' ? 'Đen' : 'Trắng';
    avatarSrc = null;
    isActive = currentTurn !== playerColor;
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
        isActive
          ? 'bg-bg-surface border border-border'
          : 'bg-bg-base border border-border/50'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="h-8 w-8 rounded-lg border border-border/60 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-bg-surface text-sm">
            {isPlayer ? 'B' : 'AI'}
          </div>
        )}

        <span className={`min-w-0 truncate text-sm font-semibold ${isActive ? 'text-primary-400' : 'text-text-primary'}`}>
          {displayName}
        </span>

        <span className="rounded border border-border bg-bg-surface px-2 py-0.5 text-xs font-medium text-text-secondary">
          {displayBadge}
        </span>
      </div>

      {isActive && (
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full bg-primary-400 ${!isPlayer && isBotThinking ? 'animate-pulse' : ''}`}
            title={!isPlayer && isBotThinking ? UI_COPY.botThinking : undefined}
          />
          {!isPlayer && isBotThinking && (
            <span className="hidden text-xs font-medium text-text-secondary sm:inline">{UI_COPY.botThinking}</span>
          )}
        </div>
      )}
    </div>
  );
}
