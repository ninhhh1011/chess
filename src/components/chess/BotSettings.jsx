import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BOT_ELO_LEVELS } from '../../data/botLevels';
import { BRAND_NAMES } from '../../config/brand';
import BoardThemeSelector from '../BoardThemeSelector';
import OpeningExplorer from '../OpeningExplorer';
import PgnImport from '../PgnImport';
import GameStats from '../GameStats';

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

  const [activeTab, setActiveTab] = useState('settings');

  const tabs = [
    { id: 'settings', label: 'Cài đặt' },
    { id: 'stats', label: 'Thống kê' },
    { id: 'openings', label: 'Khai cuộc' },
    { id: 'pgn', label: 'PGN' },
  ];

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

      {/* Tabs for additional features */}
      <div className="rounded-lg border border-border bg-bg-surface">
        <nav className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary-400 bg-bg-base text-primary-300'
                  : 'text-text-tertiary hover:bg-bg-base hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4">
          {activeTab === 'settings' && <BoardThemeSelector />}

          {activeTab === 'stats' && <GameStats />}

          {activeTab === 'openings' && (
            <OpeningExplorer />
          )}

          {activeTab === 'pgn' && (
            <PgnImport />
          )}
        </div>
      </div>
    </section>
  );
}
