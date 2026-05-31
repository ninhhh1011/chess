import { useChessGame } from '../../contexts/ChessGameContext';
import { BOT_ELO_LEVELS } from '../../data/botLevels';
import { BRAND_NAMES } from '../../config/brand';

const BOT_NAME = BRAND_NAMES.bot;

export default function BotSettings() {
  const {
    gameMode,
    playerColor,
    botElo,
    changeGameMode,
    changePlayerColor,
    changeBotElo,
    isBotThinking,
    GAME_MODES,
    PLAYER_COLORS,
  } = useChessGame();

  const selectedBotLevel = BOT_ELO_LEVELS.find((level) => level.elo === botElo) || BOT_ELO_LEVELS[2];
  const playerColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'trắng' : 'đen';

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-400">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="game-mode">
        Chế độ chơi
      </label>

      <div className="mt-3 grid gap-3">
        <select
          id="game-mode"
          value={gameMode}
          onChange={(event) => changeGameMode(event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-medium text-slate-100 outline-none transition focus:border-emerald-500"
        >
          <option value={GAME_MODES.LOCAL}>2 người chơi</option>
          <option value={GAME_MODES.BOT}>Đấu với {BOT_NAME}</option>
        </select>

        {gameMode === GAME_MODES.BOT && (
          <>
            <select
              id="player-color"
              value={playerColor}
              onChange={(event) => changePlayerColor(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-medium text-slate-100 outline-none transition focus:border-emerald-500"
            >
              <option value={PLAYER_COLORS.WHITE}>Bạn cầm trắng</option>
              <option value={PLAYER_COLORS.BLACK}>Bạn cầm đen</option>
            </select>

            <select
              id="bot-elo"
              value={botElo}
              onChange={(event) => changeBotElo(Number(event.target.value))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-medium text-slate-100 outline-none transition focus:border-emerald-500"
            >
              {BOT_ELO_LEVELS.map((level) => (
                <option key={level.elo} value={level.elo}>
                  {level.label} - {level.description}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">Các thay đổi sẽ áp dụng từ ván mới.</p>
    </section>
  );
}
