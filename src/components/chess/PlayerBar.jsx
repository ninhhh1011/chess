import { useChessGame } from '../../contexts/ChessGameContext';
import { getUserProfile } from '../../services/userProfileService';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { AppAvatar } from '@/ui/AppAvatar';
import { AppStatus } from '@/ui/AppStatus';
import { formatClockTime } from '../../domain/clock/chessClock';

/**
 * PlayerBar - compact player/opponent identity strip.
 */
export default function PlayerBar({ position = 'top', boardOrientation, isThinking }) {
  const { activeGame, playerColor, botElo, clock } = useChessGame();

  const currentTurn = activeGame.turn();
  const isTop = position === 'top';

  const playerOrientation = playerColor === 'w' ? 'white' : 'black';
  const isPlayerAtBottom = boardOrientation === playerOrientation;
  const isPlayer = isTop ? !isPlayerAtBottom : isPlayerAtBottom;

  let displayName;
  let displayBadge;
  let avatarSrc;
  let isActive;

  const profile = getUserProfile();
  const playerElo = profile?.playerElo || 1000;

  if (isPlayer) {
    displayName = 'Bạn';
    displayBadge = `ELO ${playerElo} · ${playerColor === 'w' ? 'Trắng' : 'Đen'}`;
    avatarSrc = null;
    isActive = currentTurn === playerColor;
  } else {
    displayName = BRAND_NAMES.bot;
    displayBadge = `ELO ${botElo}`;
    avatarSrc = coachAvatar;
    isActive = currentTurn !== playerColor;
  }

  const thisColor = isPlayer ? playerColor : (playerColor === 'w' ? 'b' : 'w');
  const remainingMs = thisColor === 'w' ? clock?.whiteRemainingMs : clock?.blackRemainingMs;
  const isLowTime = remainingMs !== null && remainingMs < 30_000 && remainingMs > 0;

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

      <div className="flex items-center gap-2">
        {remainingMs !== null && (
          <span
            className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
              isActive
                ? isLowTime
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-[#030302] text-white border-transparent'
                : 'bg-[var(--app-muted-surface)] text-[var(--app-muted)] border-[var(--app-border)]'
            }`}
          >
            {formatClockTime(remainingMs)}
          </span>
        )}

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
    </div>
  );
}
