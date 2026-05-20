import { useChessGame } from '../../contexts/ChessGameContext';
import coachAvatar from '../../assets/avatarcoach.webp';

/**
 * PlayerBar - Hiển thị thông tin người chơi/đối thủ theo kiểu chess app hiện đại
 * Nằm sát trên/dưới bàn cờ, gọn gàng, có avatar
 */
export default function PlayerBar({ position = 'top' }) {
  const { activeGame, playerColor, gameMode, botElo, isBotThinking, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isTop = position === 'top';

  // Xác định ai ở vị trí này
  const isPlayerAtTop = playerColor === 'b'; // Nếu player cầm đen thì ở trên
  const isPlayer = isTop ? isPlayerAtTop : !isPlayerAtTop;

  // Thông tin hiển thị
  let displayName, displayRole, displayElo, avatarSrc, isActive;

  if (isPlayer) {
    // Người chơi
    displayName = 'Bạn';
    displayRole = playerColor === 'w' ? 'Quân trắng' : 'Quân đen';
    displayElo = null;
    avatarSrc = null; // Có thể thêm avatar người chơi sau
    isActive = currentTurn === playerColor;
  } else {
    // Đối thủ
    if (gameMode === GAME_MODES.BOT) {
      displayName = 'ninh lốp trưởng';
      displayRole = 'Bot';
      displayElo = botElo;
      avatarSrc = coachAvatar;
      isActive = currentTurn !== playerColor;
    } else {
      displayName = 'Đối thủ';
      displayRole = playerColor === 'w' ? 'Quân đen' : 'Quân trắng';
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
          : 'border-slate-700/60 bg-slate-800/40'
      }`}
    >
      {/* Thông tin bên trái */}
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="h-9 w-9 rounded-lg border border-slate-600/60 object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/60 bg-slate-700/60 text-base">
            {isPlayer ? '👤' : '🤖'}
          </div>
        )}

        {/* Tên và vai trò */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isActive ? 'text-amber-300' : 'text-slate-300'}`}>
              {displayName}
            </span>
            {!isPlayer && displayRole && (
              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-bold text-slate-400">
                {displayRole}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {isPlayer ? displayRole : displayElo ? `${displayElo} ELO` : displayRole}
          </p>
        </div>
      </div>

      {/* Indicator bên phải */}
      {isActive && (
        <div className="flex items-center gap-1.5">
          {!isPlayer && isBotThinking && (
            <span className="text-xs font-bold text-amber-300">Đang nghĩ...</span>
          )}
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        </div>
      )}
    </div>
  );
}
