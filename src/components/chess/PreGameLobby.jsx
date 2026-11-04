import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { AppButton } from '@/ui/AppButton';
import { AppRadioGroup, AppRadioCard } from '@/ui/AppRadioGroup';
import { AppSurface } from '@/ui/AppSurface';
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
  const { startGame } = useChessGame();

  // Default: Dễ (400) + Trắng ('w')
  const [selectedElo, setSelectedElo] = useState(400);
  const [selectedColor, setSelectedColor] = useState('w');

  function handleStart() {
    startGame({
      elo: selectedElo,
      color: selectedColor,
    });
  }

  const currentDiff = DIFFICULTIES.find((d) => d.elo === selectedElo) || DIFFICULTIES[0];

  return (
    <div className="flex w-full items-center justify-center p-4 min-h-[75vh]">
      <AppSurface
        variant="base"
        radius="lg"
        className="w-full max-w-lg p-6 sm:p-10 space-y-6 bg-white rounded-[28px] border border-[var(--app-border)] shadow-[var(--shadow-modal)]"
      >
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#030302]">
            Chơi với máy
          </h1>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">
            Chọn mức độ thách thức và màu quân phù hợp với mục tiêu hôm nay
          </p>
        </div>

        {/* Difficulty Selection: HeroUI RadioGroup with Card-style Options */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--app-subtle)]">
            Mức độ
          </label>

          <AppRadioGroup
            value={String(selectedElo)}
            onChange={(val) => setSelectedElo(Number(val))}
            ariaLabel="Chọn mức độ chơi"
            orientation="horizontal"
            className="w-full grid grid-cols-4 gap-2"
          >
            {DIFFICULTIES.map((diff) => {
              const Icon = diff.icon;
              const isSelected = selectedElo === diff.elo;
              return (
                <AppRadioCard
                  key={diff.id}
                  value={String(diff.elo)}
                  className="w-full"
                >
                  <div className="flex flex-col items-center justify-center py-1 text-center">
                    <Icon
                      className={`h-4 w-4 mb-1.5 ${
                        isSelected ? 'text-[#030302]' : 'text-[var(--app-subtle)]'
                      }`}
                    />
                    <span className="text-xs font-medium text-[#030302]">
                      {diff.label}
                    </span>
                  </div>
                </AppRadioCard>
              );
            })}
          </AppRadioGroup>

          {/* Dynamic description box */}
          <div className="p-4 text-xs text-[#030302] space-y-1 bg-[var(--app-muted-surface)]/60 rounded-[16px] border border-[var(--app-border)]">
            <p className="font-medium leading-relaxed">{currentDiff.description}</p>
            <p className="text-[11px] text-[var(--app-muted)]">
              <span className="font-semibold text-[var(--app-subtle)]">Đặc điểm Bot: </span>
              {currentDiff.botNotes}
            </p>
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--app-subtle)]">
            Màu quân
          </label>

          <AppRadioGroup
            value={selectedColor}
            onChange={setSelectedColor}
            ariaLabel="Chọn màu quân"
            orientation="horizontal"
            className="w-full grid grid-cols-2 gap-3"
          >
            {/* White Option */}
            <AppRadioCard value="w" className="w-full">
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">♔</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-[#030302]">Trắng</span>
                    {selectedColor === 'w' && (
                      <Check className="h-3.5 w-3.5 text-[var(--app-secondary)]" />
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--app-muted)] block">
                    Đi trước
                  </span>
                </div>
              </div>
            </AppRadioCard>

            {/* Black Option */}
            <AppRadioCard value="b" className="w-full">
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">♚</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-[#030302]">Đen</span>
                    {selectedColor === 'b' && (
                      <Check className="h-3.5 w-3.5 text-[var(--app-secondary)]" />
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--app-muted)] block">
                    Máy đi trước
                  </span>
                </div>
              </div>
            </AppRadioCard>
          </AppRadioGroup>
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <AppButton
            variant="primary"
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-xs"
            onClick={handleStart}
            leftIcon={<Swords className="h-4 w-4" />}
          >
            Bắt đầu ván đấu
          </AppButton>
        </div>
      </AppSurface>
    </div>
  );
}
