import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';

/**
 * PlayerBar - Compact player/opponent strip for modern chess UI
 * Positioned directly above/below the board
 */
export default function PlayerBar({ position = 'top' }) {
  const { activeGame, playerColor, gameMode, botElo, isBotThinking, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isTop = position === 'top';

  // Determine who is at this position
  const isPlayerAtTop = playerColor === 'b';
  const isPlayer = isTop ? isPlayerAtTop : !isPlayerAtTop;

  // Display info
  let displayName, displayRole, displayElo, avatarSrc, isActive;

  if (isPlayer) {
    // Player
    displayName = 'Bạn';
    displayRole = playerColor === 'w' ? 'Trắng' : 'Đen';
    displayElo = null;
    avatarSrc = null;
    isActive = currentTurn === playerColor;
  } else {
    // Opponent
    if (gameMode === GAME_MODES.BOT) {
      displayName = 'ninh lốp trưởng';
      displayRole = 'Bot';
      displayElo = botElo;
      avatarSrc = coachAvatar;
      isActive = currentTurn !== playerColor;
    } else {
      displayName = 'Đối thủ';
      displayRole = playerColor === 'w' ? 'Đen' : 'Trắng';
      displayElo = null;
      avatarSrc = null;
      isActive = currentTurn !== playerColor;
    }
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${
        isActive
          ? 'border-amber-400/60 bg-amber-500/10'
          : 'border-slate-700/60 bg-slate-800/30'
      }`}
    >
      {/* Left: Avatar + Name + Role */}
      <div className="flex items-center gap-2">
        {/* Avatar - 32px compact */}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="h-8 w-8 rounded-lg border border-slate-600/60 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600/60 bg-slate-700/60 text-sm">
            {isPlayer ? '👤' : '🤖'}
          </div>
        )}

        {/* Name and role */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${isActive ? 'text-amber-300' : 'text-slate-300'}`}>
            {displayName}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-xs text-slate-400">{displayRole}</span>
          {displayElo && (
            <>
              <span className="text-slate-500">·</span>
              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-bold text-slate-300">
                {displayElo}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Active indicator */}
      {isActive && (
        <div className="flex items-center gap-1.5">
          {!isPlayer && isBotThinking && (
            <span className="text-xs font-bold text-amber-300">Đang nghĩ</span>
          )}
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        </div>
      )}
    </div>
  );
}
