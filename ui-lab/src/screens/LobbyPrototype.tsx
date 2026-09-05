import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../ui/AppButton';
import { Swords, Shield, Sparkles, Flame, Check } from 'lucide-react';

interface DifficultyLevel {
  id: string;
  label: string;
  description: string;
  botNotes: string;
  icon: typeof Swords;
}

const DIFFICULTIES: DifficultyLevel[] = [
  {
    id: 'easy',
    label: 'Dễ',
    description: 'Dành cho người mới làm quen luật cờ và muốn rèn phản xạ ăn quân an toàn.',
    botNotes: 'Máy đôi khi bỏ sót nước đe dọa để bạn tập phản xạ.',
    icon: Shield,
  },
  {
    id: 'medium',
    label: 'Vừa',
    description: 'Nắm vững nguyên tắc phát triển quân cơ bản, hạn chế các sai lầm thô sơ.',
    botNotes: 'Máy bắt đầu kiểm soát trung tâm và nhập thành đều đặn.',
    icon: Sparkles,
  },
  {
    id: 'hard',
    label: 'Khó',
    description: 'Đã có kinh nghiệm chiến thuật, cần tính toán sâu từ 2-3 nước trước khi đi.',
    botNotes: 'Máy trừng phạt nghiêm khắc các lỗi bỏ quân hoặc xuất Hậu vội.',
    icon: Swords,
  },
  {
    id: 'expert',
    label: 'Thử thách',
    description: 'Mức độ chơi chuẩn xác cao, kiểm tra khả năng duy trì thế cờ tàn cuộc.',
    botNotes: 'Engine Stockfish tính toán tối ưu theo chiều sâu thực tế.',
    icon: Flame,
  },
];

export function LobbyPrototype() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [selectedColor, setSelectedColor] = useState<'w' | 'b'>('w');
  const navigate = useNavigate();

  const currentDiff = DIFFICULTIES.find(d => d.id === selectedDifficulty) || DIFFICULTIES[1];

  return (
    <div className="mx-auto max-w-xl py-6 sm:py-10">
      <div
        className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 space-y-8 shadow-sm"
        style={{ borderRadius: '12px' }}
      >
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--app-foreground)]">
            Thiết lập ván cờ mới
          </h1>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">
            Chọn mức độ thách thức và màu quân phù hợp với mục tiêu hôm nay
          </p>
        </div>

        {/* Difficulty Selection: Segmented Control */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">
            Mức độ thách thức
          </label>

          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-[8px] bg-[var(--app-bg)] border border-[var(--app-border)]">
            {DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              const Icon = diff.icon;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-[6px] text-xs font-bold transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] ${
                    isSelected
                      ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)] shadow-xs'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-[var(--app-accent)]' : 'text-[var(--app-subtle)]'}`} />
                  <span>{diff.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Description Box */}
          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3.5 text-xs text-[var(--app-foreground)] space-y-1.5">
            <p className="font-medium leading-relaxed">{currentDiff.description}</p>
            <p className="text-[11px] text-[var(--app-muted)]">
              <span className="font-semibold text-[var(--app-subtle)]">Đặc điểm Bot: </span>
              {currentDiff.botNotes}
            </p>
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">
            Chọn màu quân
          </label>

          <div className="grid grid-cols-2 gap-3">
            {/* White Option */}
            <button
              type="button"
              onClick={() => setSelectedColor('w')}
              className={`flex items-center gap-3.5 p-3.5 rounded-[8px] border transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] text-left ${
                selectedColor === 'w'
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-foreground)] ring-1 ring-[var(--app-accent)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              <span className="text-3xl select-none">♔</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--app-foreground)]">Quân Trắng</span>
                  {selectedColor === 'w' && <Check className="h-4 w-4 text-[var(--app-accent)]" />}
                </div>
                <span className="text-[11px] text-[var(--app-muted)] block mt-0.5">
                  Bạn được đi trước
                </span>
              </div>
            </button>

            {/* Black Option */}
            <button
              type="button"
              onClick={() => setSelectedColor('b')}
              className={`flex items-center gap-3.5 p-3.5 rounded-[8px] border transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] text-left ${
                selectedColor === 'b'
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-foreground)] ring-1 ring-[var(--app-accent)]'
                  : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)]'
              }`}
            >
              <span className="text-3xl select-none">♚</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--app-foreground)]">Quân Đen</span>
                  {selectedColor === 'b' && <Check className="h-4 w-4 text-[var(--app-accent)]" />}
                </div>
                <span className="text-[11px] text-[var(--app-muted)] block mt-0.5">
                  Máy đi trước
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <AppButton
            variant="primary"
            size="lg"
            className="w-full h-12 text-base font-bold shadow-sm"
            onClick={() => navigate('/play')}
            leftIcon={<Swords className="h-4 w-4" />}
          >
            Bắt đầu ván
          </AppButton>
        </div>
      </div>
    </div>
  );
}
