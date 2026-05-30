import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';

/**
 * PlayerBar - Compact player/opponent identity strip
 * Shows only: avatar · name · badge
 */
export default function PlayerBar({ position = 'top' }) {
  const { activeGame, playerColor, boardOrientation, gameMode, botElo, isBotThinking, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isTop = position === 'top';

  // Determine who is at this position based on board orientation
  const playerOrientation = playerColor === 'w' ? 'white' : 'black';
  const isPlayerAtBottom = boardOrientation === playerOrientation;
  const isPlayer = isTop ? !isPlayerAtBottom : isPlayerAtBottom;

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
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
        isActive
          ? 'bg-slate-800 border border-slate-700'
          : 'bg-slate-900 border border-slate-800'
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
        <span className={`text-sm font-semibold ${isActive ? 'text-emerald-500' : 'text-slate-300'}`}>
          {displayName}
        </span>

        {/* Badge */}
        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-700">
          {displayBadge}
        </span>
      </div>

      {/* Right: Active indicator */}
      {isActive && (
        <div className="flex items-center gap-1.5">
          {!isPlayer && isBotThinking && (
            <span className="text-xs font-bold text-emerald-300">Đang nghĩ</span>
          )}
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      )}
    </div>
  );
}
