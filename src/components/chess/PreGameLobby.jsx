import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { AppButton } from '@/ui/AppButton';
import { Shield, Sparkles, Swords, Flame, Check } from 'lucide-react';

const DIFFICULTIES = [
  {
    id: 'easy',
    elo: 400,
    label: 'Dễ',
    ariaLabel: 'Dễ - Người mới',
    description: 'Dành cho người mới làm quen luật cờ và muốn rèn phản xạ ăn quân an toàn.',
    botNotes: 'Máy chơi nhẹ nhàng để bạn làm quen nhịp độ ván đấu.',
    icon: Shield,
  },
  {
    id: 'medium',
    elo: 800,
    label: 'Vừa',
    ariaLabel: 'Vừa - Cơ bản',
    description: 'Nắm vững nguyên tắc phát triển quân cơ bản, hạn chế các sai lầm thô sơ.',
    botNotes: 'Máy bắt đầu kiểm soát trung tâm và nhập thành đều đặn.',
    icon: Sparkles,
  },
  {
    id: 'hard',
    elo: 1200,
    label: 'Khó',
    ariaLabel: 'Khó - Trung bình',
    description: 'Đã có kinh nghiệm chiến thuật, cần tính toán sâu từ 2-3 nước trước khi đi.',
    botNotes: 'Máy trừng phạt nghiêm khắc các lỗi bỏ quân hoặc xuất Hậu vội.',
    icon: Swords,
  },
  {
    id: 'expert',
    elo: 1600,
    label: 'Thử thách',
    ariaLabel: 'Thử thách - Nâng cao',
    description: 'Mức độ chơi chuẩn xác cao, kiểm tra khả năng duy trì thế cờ tàn cuộc.',
    botNotes: 'Stockfish tính toán tối ưu theo chiều sâu thực tế.',
    icon: Flame,
  },
];

export default function PreGameLobby() {
  const { GAME_MODES, startGame } = useChessGame();

  // Default: Dễ (400) + Trắng ('w')
  const [selectedElo, setSelectedElo] = useState(400);
  const [selectedColor, setSelectedColor] = useState('w');

  function handleStart() {
    startGame({
      elo: selectedElo,
      color: selectedColor,
      mode: GAME_MODES.BOT,
      gameGoal: 'fun',
      timeControl: 'unlimited',
    });
  }

  const currentDiff = DIFFICULTIES.find((d) => d.elo === selectedElo) || DIFFICULTIES[0];

  return (
    <div className="flex w-full items-center justify-center p-4 min-h-[75vh]">
      <div
        className="w-full max-w-lg rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 space-y-6 shadow-sm"
        style={{ borderRadius: '12px' }}
      >
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--app-foreground)]">
            Chơi với máy
          </h1>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">
            Chọn mức độ thách thức và màu quân phù hợp với mục tiêu hôm nay
          </p>
        </div>

        {/* Difficulty Selection: 4 segmented buttons with NO Elo displayed */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">
            Mức độ
          </label>

          <div
            aria-label="Chọn mức độ"
            className="grid grid-cols-4 gap-1.5 p-1 rounded-[8px] bg-[var(--app-bg)] border border-[var(--app-border)]"
          >
            {DIFFICULTIES.map((diff) => {
              const isSelected = selectedElo === diff.elo;
              const Icon = diff.icon;
              return (
                <button
                  key={diff.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={diff.ariaLabel}
                  onClick={() => setSelectedElo(diff.elo)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[6px] text-xs font-bold transition-all duration-150 min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isSelected
                      ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)] shadow-xs'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mb-1 ${
                      isSelected ? 'text-[var(--app-accent)]' : 'text-[var(--app-subtle)]'
                    }`}
                  />
                  <span>{diff.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic description box */}
          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3.5 text-xs text-[var(--app-foreground)] space-y-1">
            <p className="font-medium leading-relaxed">{currentDiff.description}</p>
            <p className="text-[11px] text-[var(--app-muted)]">
              <span className="font-semibold text-[var(--app-subtle)]">Đặc điểm Bot: </span>
              {currentDiff.botNotes}
            </p>
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">
            Màu quân
          </label>

          <div className="grid grid-cols-2 gap-3">
            {/* White Option */}
            <button
              type="button"
              aria-label="Trắng - Bạn được đi trước"
              onClick={() => setSelectedColor('w')}
              className={`flex items-center gap-3 p-3 rounded-[8px] border transition-all duration-150 min-h-[52px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] text-left ${
                selectedColor === 'w'
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-foreground)] ring-1 ring-[var(--app-accent)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              <span className="text-2xl select-none">♔</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--app-foreground)]">Trắng</span>
                  {selectedColor === 'w' && <Check className="h-3.5 w-3.5 text-[var(--app-accent)]" />}
                </div>
                <span className="text-[11px] text-[var(--app-muted)] block">
                  Đi trước
                </span>
              </div>
            </button>

            {/* Black Option */}
            <button
              type="button"
              aria-label="Đen - Máy đi trước"
              onClick={() => setSelectedColor('b')}
              className={`flex items-center gap-3 p-3 rounded-[8px] border transition-all duration-150 min-h-[52px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] text-left ${
                selectedColor === 'b'
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-foreground)] ring-1 ring-[var(--app-accent)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              <span className="text-2xl select-none">♚</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--app-foreground)]">Đen</span>
                  {selectedColor === 'b' && <Check className="h-3.5 w-3.5 text-[var(--app-accent)]" />}
                </div>
                <span className="text-[11px] text-[var(--app-muted)] block">
                  Máy đi trước
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Start Button - Single CTA */}
        <div className="pt-2">
          <AppButton
            variant="primary"
            size="lg"
            className="w-full h-12 text-base font-bold shadow-sm"
            onClick={handleStart}
            leftIcon={<Swords className="h-4 w-4" />}
          >
            Bắt đầu ván
          </AppButton>
        </div>
      </div>
    </div>
  );
}
