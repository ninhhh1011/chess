import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BOT_ELO_LEVELS } from '../../data/botLevels';
import { BRAND_NAMES } from '../../config/brand';
import { AppSelect } from '@/ui/AppSelect';
import { AppTabs } from '@/ui/AppTabs';
import { AppSurface } from '@/ui/AppSurface';
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

  const gameModeOptions = [
    { value: GAME_MODES.LOCAL, label: '2 người chơi tại chỗ' },
    { value: GAME_MODES.BOT, label: `Đấu với ${BOT_NAME}` },
  ];

  const playerColorOptions = [
    { value: PLAYER_COLORS.WHITE, label: 'Bạn cầm quân Trắng (Đi trước)' },
    { value: PLAYER_COLORS.BLACK, label: 'Bạn cầm quân Đen (Máy đi trước)' },
  ];

  const botEloOptions = BOT_ELO_LEVELS.map((level) => ({
    value: String(level.elo),
    label: level.label,
    hint: level.description,
  }));

  return (
    <section className="space-y-4">
      {/* Game Mode Settings */}
      <AppSurface variant="raised" radius="md" className="p-4 space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)] block">
          Chế độ chơi & Cấu hình Bot
        </label>

        <div className="grid gap-3 pt-1">
          <AppSelect
            label="Chế độ chơi"
            options={gameModeOptions}
            value={gameMode}
            onChange={(val) => changeGameMode(val)}
          />

          {gameMode === GAME_MODES.BOT && (
            <>
              <AppSelect
                label="Màu quân của bạn"
                options={playerColorOptions}
                value={playerColor}
                onChange={(val) => changePlayerColor(val)}
              />

              <AppSelect
                label={`Độ khó của ${BOT_NAME}`}
                options={botEloOptions}
                value={String(botElo)}
                onChange={(val) => changeBotElo(Number(val))}
              />
            </>
          )}
        </div>

        <p className="text-xs text-[var(--app-muted)] pt-1">
          Các thay đổi cấu hình sẽ áp dụng khi bạn tạo hoặc bắt đầu ván mới.
        </p>
      </AppSurface>

      {/* Tabs for additional features */}
      <AppSurface variant="raised" radius="md" className="overflow-hidden">
        <AppTabs
          tabs={tabs}
          selectedId={activeTab}
          onSelectionChange={setActiveTab}
          variant="underline"
          ariaLabel="Tùy chọn mở rộng ván cờ"
        />

        <div className="p-4">
          {activeTab === 'settings' && <BoardThemeSelector />}
          {activeTab === 'stats' && <GameStats />}
          {activeTab === 'openings' && <OpeningExplorer />}
          {activeTab === 'pgn' && <PgnImport />}
        </div>
      </AppSurface>
    </section>
  );
}
