import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { AppAvatar } from '@/ui/AppAvatar';
import { AppStatus } from '@/ui/AppStatus';

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
    displayBadge = `ELO ${botElo}`;
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
      className={`flex items-center justify-between rounded-[8px] px-3 py-2 transition-all ${
        isActive
          ? 'bg-[var(--app-surface-raised)] border border-[var(--app-border-strong)]'
          : 'bg-[var(--app-surface)] border border-[var(--app-border)]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <AppAvatar
          src={avatarSrc}
          alt={displayName}
          fallback={isPlayer ? 'B' : 'AI'}
          size="sm"
          className="rounded-[6px]"
        />

        <span className={`min-w-0 truncate text-xs font-semibold ${isActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-foreground)]'}`}>
          {displayName}
        </span>

        <AppStatus variant="basic" size="sm">
          {displayBadge}
        </AppStatus>
      </div>

      {isActive && (
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full bg-[var(--app-accent)] ${!isPlayer && isBotThinking ? 'animate-pulse' : ''}`}
            title={!isPlayer && isBotThinking ? UI_COPY.botThinking : undefined}
          />
          {!isPlayer && isBotThinking && (
            <span className="hidden text-[11px] font-medium text-[var(--app-muted)] sm:inline">{UI_COPY.botThinking}</span>
          )}
        </div>
      )}
    </div>
  );
}
