import { useChessGame } from '../../contexts/ChessGameContext';

/**
 * PlayerInfoBar Component
 * FIX BUG 1: Displays both players' info (name, Elo, avatar) above the board
 * Always visible, not hidden by scrolling
 */
export default function PlayerInfoBar({ botElo = 1200, botDifficulty = 'Medium' }) {
  const { activeGame, playerColor, gameMode, GAME_MODES } = useChessGame();

  const currentTurn = activeGame.turn();
  const isWhiteTurn = currentTurn === 'w';
  const isBlackTurn = currentTurn === 'b';

  // Determine player info based on game mode
  const whitePlayer = gameMode === GAME_MODES.BOT && playerColor === 'b'
    ? { name: 'Stockfish Bot', elo: botElo, isBot: true, difficulty: botDifficulty }
    : { name: 'Bạn', elo: '?', isBot: false };

  const blackPlayer = gameMode === GAME_MODES.BOT && playerColor === 'w'
    ? { name: 'Stockfish Bot', elo: botElo, isBot: true, difficulty: botDifficulty }
    : { name: 'Bạn', elo: '?', isBot: false };

  const PlayerCard = ({ player, color, isActive }) => (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        isActive
          ? 'border-amber-400/60 bg-amber-500/10 shadow-md'
          : 'border-slate-700/60 bg-slate-800/40'
      }`}
    >
      {/* Avatar */}
      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
        isActive ? 'border-amber-400 bg-amber-500/20' : 'border-slate-600 bg-slate-700'
      }`}>
        {player.isBot ? (
          <span className="text-lg">🤖</span>
        ) : (
          <span className="text-lg">{color === 'w' ? '♔' : '♚'}</span>
        )}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-bold ${
            isActive ? 'text-amber-300' : 'text-slate-300'
          }`}>
            {player.name}
          </p>
          {isActive && (
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-slate-400">
          {player.isBot ? (
            <>Lv.{player.difficulty} · {player.elo} ELO</>
          ) : (
            <>{player.elo} ELO</>
          )}
        </p>
      </div>

      {/* Color indicator */}
      <div className={`h-6 w-6 rounded border-2 ${
        color === 'w'
          ? 'border-slate-400 bg-slate-100'
          : 'border-slate-600 bg-slate-900'
      }`} />
    </div>
  );

  return (
    <div className="mb-4 grid gap-2">
      {/* Black player (top) */}
      <PlayerCard player={blackPlayer} color="b" isActive={isBlackTurn} />

      {/* White player (bottom) */}
      <PlayerCard player={whitePlayer} color="w" isActive={isWhiteTurn} />
    </div>
  );
}
