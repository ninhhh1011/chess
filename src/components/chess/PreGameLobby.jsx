import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, UI_COPY, brandName, BRAND_DESCRIPTION } from '../../config/brand';
import coachAvatar from '../../assets/avatarcoach.webp';
import { BOT_ELO_LEVELS } from '../../data/botLevels';

export default function PreGameLobby() {
  const { GAME_MODES, PLAYER_COLORS, startGame } = useChessGame();

  // Local state for the form
  const [selectedElo, setSelectedElo] = useState(BOT_ELO_LEVELS[2].elo); // Default 1200
  const [selectedColor, setSelectedColor] = useState('random');

  function handleStart() {
    let color = selectedColor;
    if (color === 'random') {
      color = Math.random() > 0.5 ? PLAYER_COLORS.WHITE : PLAYER_COLORS.BLACK;
    }
    startGame({ elo: selectedElo, color, mode: GAME_MODES.BOT, gameGoal: 'fun', timeControl: 'unlimited' });
  }

  return (
    <div className="flex w-full items-center justify-center p-4 min-h-[80vh]">
      <div className="ui-card w-full max-w-2xl space-y-8 p-6 md:p-8">

        {/* Header */}
        <div className="text-center">
          <img src={coachAvatar} alt={brandName} className="mx-auto mb-4 h-20 w-20 rounded-full border-2 border-emerald-500/30 object-cover shadow-sm" />
          <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">{brandName}</h1>
          <p className="mt-3 text-slate-400 max-w-lg mx-auto">{BRAND_DESCRIPTION}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Opponent Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Đối thủ: {BRAND_NAMES.bot}</h3>
            <div className="grid gap-2">
              {BOT_ELO_LEVELS.slice(0, 4).map((bot) => (
                <button
                  key={bot.elo}
                  onClick={() => setSelectedElo(bot.elo)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${
                    selectedElo === bot.elo
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="font-medium">{bot.label}</span>
                  <span className="text-xs opacity-60">Elo {bot.elo}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* Color Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Màu quân</h3>
              <div className="flex gap-2">
                {[{ id: PLAYER_COLORS.WHITE, label: 'Trắng', icon: '♔' }, { id: PLAYER_COLORS.BLACK, label: 'Đen', icon: '♚' }, { id: 'random', label: 'Ngẫu nhiên', icon: '❓' }].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    className={`flex-1 rounded-lg border px-2 py-3 text-center transition ${
                      selectedColor === c.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{c.icon}</div>
                    <div className="text-xs font-medium">{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bot Info */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Về {BRAND_NAMES.bot}</h3>
              <p className="text-xs text-slate-500">
                {BRAND_NAMES.bot} sử dụng Stockfish engine với mức Elo tương ứng.
                Càng cao càng khó đánh bại.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4 text-center">
          <button
            onClick={handleStart}
            className="ui-button-primary w-full max-w-sm py-4 text-lg font-bold shadow-lg transition hover:-translate-y-0.5"
          >
            {UI_COPY.startGame}
          </button>
        </div>

      </div>
    </div>
  );
}
