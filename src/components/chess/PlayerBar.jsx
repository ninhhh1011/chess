import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';

/**
 * PlayerBar - Compact player/opponent identity strip
 * Shows only: avatar · name · badge
 */
export default function PlayerBar({ position = 'top' }) {
  const { activeGame, playerColor, gameMode, botElo, isBotThinking, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isTop = position === 'top';

  // Determine who is at this position
  const isPlayerAtTop = playerColor === 'b';
  const isPlayer = isTop ? isPlayerAtTop : !isPlayerAtTop;

  // Display info
  let displayName, displayBadge, avatarSrc, isActive;

  if (isPlayer) {
    // Player
    displayName = 'Bạn';
    displayBadge = playerColor === 'w' ? 'Trắng' : 'Đen';
    avatarSrc = null;
    isActive = currentTurn === playerColor;
  } else {
    // Opponent
    if (gameMode === GAME_MODES.BOT) {
      displayName = 'ngoại lệ của cô ấy';
      displayBadge = botElo;
      avatarSrc = coachAvatar;
      isActive = currentTurn !== playerColor;
    } else {
      displayName = 'Đối thủ';
      displayBadge = playerColor === 'w' ? 'Đen' : 'Trắng';
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
      {/* Left: Avatar + Name + Badge */}
      <div className="flex items-center gap-2">
        {/* Avatar */}
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

        {/* Name */}
        <span className={`text-sm font-bold ${isActive ? 'text-amber-300' : 'text-slate-300'}`}>
          {displayName}
        </span>

        {/* Badge */}
        <span className="rounded bg-slate-700/60 px-2 py-0.5 text-xs font-bold text-slate-300">
          {displayBadge}
        </span>
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
