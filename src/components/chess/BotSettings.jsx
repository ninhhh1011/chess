import { useChessGame } from '../../contexts/ChessGameContext';
import { BOT_ELO_LEVELS } from '../../data/botLevels';
import { BRAND_NAMES } from '../../config/brand';
import BoardThemeSelector from '../BoardThemeSelector';

const BOT_NAME = BRAND_NAMES.bot;

export default function BotSettings() {
  const {
    gameMode,
    playerColor,
    botElo,
    changeGameMode,
    changePlayerColor,
    changeBotElo,
    GAME_MODES,
    PLAYER_COLORS,
  } = useChessGame();

  return (
    <section className="space-y-4">
      {/* Game Mode Settings */}
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary" htmlFor="game-mode">
          Chế độ chơi
        </label>

        <div className="mt-3 grid gap-3">
          <select
            id="game-mode"
            value={gameMode}
            onChange={(event) => changeGameMode(event.target.value)}
            className="w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm font-medium text-text-primary outline-none transition focus:border-primary-400"
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
                className="w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm font-medium text-text-primary outline-none transition focus:border-primary-400"
              >
                <option value={PLAYER_COLORS.WHITE}>Bạn cầm trắng</option>
                <option value={PLAYER_COLORS.BLACK}>Bạn cầm đen</option>
              </select>

              <select
                id="bot-elo"
                value={botElo}
                onChange={(event) => changeBotElo(Number(event.target.value))}
                className="w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm font-medium text-text-primary outline-none transition focus:border-primary-400"
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

        <p className="mt-3 text-xs text-text-tertiary">Các thay đổi sẽ áp dụng từ ván mới.</p>
      </div>

      {/* Board Theme */}
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <BoardThemeSelector />
      </div>
    </section>
  );
}
