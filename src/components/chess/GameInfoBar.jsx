import { useChessGame } from '../../contexts/ChessGameContext';

/**
 * Thanh thông tin ván đấu gọn - thay thế PlayerInfoBar cũ
 * Chỉ 1 dòng, chiều cao 48-56px, không chiếm nhiều không gian
 */
export default function GameInfoBar({ botElo = 1200 }) {
  const { activeGame, playerColor, gameMode, isBotThinking, isGameOver, isCheck, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isPlayerTurn = currentTurn === playerColor;

  // Xác định thông tin người chơi
  const playerColorText = playerColor === 'w' ? 'trắng' : 'đen';
  const botColorText = playerColor === 'w' ? 'đen' : 'trắng';

  // Trạng thái ván đấu
  let statusText = 'Đang chơi';
  let statusColor = 'text-blue-400';

  if (isGameOver) {
    if (activeGame.isCheckmate()) {
      const winner = currentTurn === 'w' ? 'Đen thắng' : 'Trắng thắng';
      statusText = winner;
      statusColor = currentTurn === playerColor ? 'text-red-400' : 'text-green-400';
    } else {
      statusText = 'Hòa';
      statusColor = 'text-slate-400';
    }
  } else if (isCheck) {
    statusText = 'Chiếu';
    statusColor = 'text-orange-400';
  }

  // Lượt đi
  let turnText = '';
  if (!isGameOver) {
    if (gameMode === GAME_MODES.BOT) {
      if (isBotThinking) {
        turnText = 'Bot đang suy nghĩ...';
      } else if (isPlayerTurn) {
        turnText = 'Lượt của bạn';
      } else {
        turnText = 'Lượt của bot';
      }
    } else {
      turnText = currentTurn === 'w' ? 'Lượt trắng' : 'Lượt đen';
    }
  }

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3">
      {/* Thông tin bên trái */}
      <div className="flex items-center gap-3 text-sm">
        <span className="font-bold text-slate-200">
          Bạn {playerColorText}
        </span>
        <span className="text-slate-500">·</span>
        {gameMode === GAME_MODES.BOT ? (
          <>
            <span className="text-slate-300">Stockfish Bot {botColorText}</span>
            <span className="text-slate-500">·</span>
            <span className="rounded bg-slate-700/60 px-2 py-0.5 text-xs font-bold text-slate-300">
              {botElo} ELO
            </span>
          </>
        ) : (
          <span className="text-slate-300">Người chơi 2</span>
        )}
        <span className="text-slate-500">·</span>
        <span className={`font-bold ${statusColor}`}>{statusText}</span>
      </div>

      {/* Lượt đi bên phải */}
      {turnText && (
        <div className="flex items-center gap-2">
          {!isGameOver && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          )}
          <span className="text-sm font-bold text-amber-300">{turnText}</span>
        </div>
      )}
    </div>
  );
}
