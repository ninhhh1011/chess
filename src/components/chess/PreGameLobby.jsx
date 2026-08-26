import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { BOT_ELO_LEVELS } from '../../data/botLevels';

// Friendly level names and descriptions
const LEVEL_CONFIG = [
  {
    elo: 400,
    label: 'Người mới',
    description: 'Dành cho người chưa biết chơi hoặc mới bắt đầu.',
  },
  {
    elo: 800,
    label: 'Cơ bản',
    description: 'Hiểu luật cơ bản, muốn thực hành.',
  },
  {
    elo: 1200,
    label: 'Trung bình',
    description: 'Đã có kinh nghiệm, muốn cải thiện.',
  },
  {
    elo: 1600,
    label: 'Nâng cao',
    description: 'Chơi tốt, muốn thử thách bản thân.',
  },
];

const COLOR_OPTIONS = [
  { id: 'w', label: 'Trắng', icon: '♔', hint: 'Đi trước' },
  { id: 'b', label: 'Đen', icon: '♚', hint: 'Máy đi trước' },
];

export default function PreGameLobby() {
  const { GAME_MODES, PLAYER_COLORS, startGame } = useChessGame();

  // Default: Người mới (400) + Trắng
  const [selectedElo, setSelectedElo] = useState(400);
  const [selectedColor, setSelectedColor] = useState('w');

  function handleStart() {
    startGame({
      elo: selectedElo,
      color: selectedColor,
      mode: GAME_MODES.BOT,
      gameGoal: 'fun',
      timeControl: 'unlimited'
    });
  }

  const selectedLevel = LEVEL_CONFIG.find(l => l.elo === selectedElo) || LEVEL_CONFIG[0];

  return (
    <div className="flex w-full items-center justify-center p-4 min-h-[80vh]">
      <div className="ui-card w-full max-w-lg space-y-8 p-6 md:p-8">

        {/* Header - Simple and clear */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Chơi với máy
          </h1>
          <p className="text-sm text-text-tertiary">
            Chọn mức độ và bắt đầu ván cờ
          </p>
        </div>

        {/* Level Selection - Primary focus */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">Mức độ</h2>
          <div className="grid gap-2">
            {LEVEL_CONFIG.map((level) => (
              <button
                key={level.elo}
                onClick={() => setSelectedElo(level.elo)}
                className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-all duration-200 ${
                  selectedElo === level.elo
                    ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                    : 'border-border bg-bg-surface/50 hover:border-border-strong hover:bg-bg-surface'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className={`font-semibold ${
                    selectedElo === level.elo ? 'text-primary-300' : 'text-text-primary'
                  }`}>
                    {level.label}
                  </span>
                  <span className="text-xs text-text-disabled">
                    ~{level.elo} Elo
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  {level.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection - Simple with explanation */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">Màu quân</h2>
          <div className="flex gap-3">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                className={`flex-1 flex flex-col items-center rounded-lg border px-3 py-4 transition-all duration-200 ${
                  selectedColor === c.id
                    ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30'
                    : 'border-border bg-bg-surface/50 hover:border-border-strong'
                }`}
              >
                <span className="text-3xl mb-1">{c.icon}</span>
                <span className={`text-sm font-medium ${
                  selectedColor === c.id ? 'text-primary-300' : 'text-text-secondary'
                }`}>
                  {c.label}
                </span>
                <span className="text-xs text-text-disabled mt-1">
                  {c.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button - Single CTA */}
        <div className="pt-2">
          <button
            onClick={handleStart}
            className="ui-button-primary w-full py-4 text-lg font-bold shadow-lg transition hover:-translate-y-0.5"
          >
            Bắt đầu ván
          </button>
        </div>

      </div>
    </div>
  );
}
