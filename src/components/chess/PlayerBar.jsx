import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { AppAvatar } from '@/ui/AppAvatar';
import { AppStatus } from '@/ui/AppStatus';

/**
 * PlayerBar - compact player/opponent identity strip.
 */
export default function PlayerBar({ position = 'top', boardOrientation, isThinking }) {
  const { activeGame, playerColor, botElo } = useChessGame();

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
  } else {
    displayName = BRAND_NAMES.bot;
    displayBadge = `ELO ${botElo}`;
    avatarSrc = coachAvatar;
    isActive = currentTurn !== playerColor;
  }

  return (
    <div
      className={`flex items-center justify-between rounded-full px-4 py-2 transition-all ${
        isActive
          ? 'bg-white border border-[#030302] shadow-xs'
          : 'bg-[var(--app-muted-surface)]/60 border border-[var(--app-border)]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <AppAvatar
          src={avatarSrc}
          alt={displayName}
          fallback={isPlayer ? 'B' : 'AI'}
          size="sm"
          className="rounded-full"
        />

        <span className={`min-w-0 truncate text-xs font-semibold ${isActive ? 'text-[#030302]' : 'text-[var(--app-foreground)]'}`}>
          {displayName}
        </span>

        <AppStatus variant="basic" size="sm">
          {displayBadge}
        </AppStatus>
      </div>

      {isActive && (
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full bg-[var(--app-secondary)] ${!isPlayer && isThinking ? 'animate-pulse' : ''}`}
            title={!isPlayer && isThinking ? UI_COPY.botThinking : undefined}
          />
          {!isPlayer && isThinking && (
            <span className="hidden text-[11px] font-medium text-[var(--app-muted)] sm:inline">{UI_COPY.botThinking}</span>
          )}
        </div>
      )}
    </div>
  );
}
