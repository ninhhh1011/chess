import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { AppButton } from '@/ui/AppButton';
import { AppRadioGroup, AppRadioCard } from '@/ui/AppRadioGroup';
import { AppSurface } from '@/ui/AppSurface';
import { TIME_CONTROLS } from '../../domain/clock/chessClock';
import MatchHistoryModal from './MatchHistoryModal';
import { Shield, Sparkles, Swords, Flame, Trophy, Zap, Crown, Medal, Check, Clock, History } from 'lucide-react';

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
    ariaLabel: 'Khó - Sơ cấp',
    description: 'Đã có kinh nghiệm chiến thuật, cần tính toán sâu từ 2-3 nước trước khi đi.',
    botNotes: 'Máy trừng phạt nghiêm khắc các lỗi bỏ quân hoặc xuất Hậu vội.',
    icon: Swords,
  },
  {
    id: 'expert',
    elo: 1600,
    label: 'Thử thách',
    ariaLabel: 'Thử thách - Trung cấp',
    description: 'Mức độ chơi chuẩn xác cao, kiểm tra khả năng duy trì thế cờ tàn cuộc.',
    botNotes: 'Stockfish giới hạn UCI_Elo 1600 tính toán bài bản.',
    icon: Flame,
  },
  {
    id: 'club',
    elo: 1800,
    label: 'Khá',
    ariaLabel: 'Khá - Câu lạc bộ',
    description: 'Trình độ kỳ thủ phong trào cứng cáp, ít sai lầm chiến thuật đơn lẻ.',
    botNotes: 'Stockfish giới hạn UCI_Elo 1800 phối hợp đòn đôi hiệu quả.',
    icon: Trophy,
  },
  {
    id: 'advanced',
    elo: 2000,
    label: 'Nâng cao',
    ariaLabel: 'Nâng cao - Chuyên sâu',
    description: 'Chiến lược vững vàng, tận dụng từng điểm yếu cấu trúc tốt của đối thủ.',
    botNotes: 'Stockfish giới hạn UCI_Elo 2000 kiểm soát thế trận tàn cuộc chặt chẽ.',
    icon: Zap,
  },
  {
    id: 'master',
    elo: 2200,
    label: 'Kiện tướng',
    ariaLabel: 'Kiện tướng - Master',
    description: 'Chuẩn Master FIDE. Áp lực cực lớn từ giai đoạn trung cuộc.',
    botNotes: 'Stockfish giới hạn UCI_Elo 2200 tính toán sâu đến 16 nước.',
    icon: Crown,
  },
  {
    id: 'grandmaster',
    elo: 2600,
    label: 'Đại kiện tướng',
    ariaLabel: 'Đại kiện tướng - Grandmaster',
    description: 'Thử thách tối thượng. Stockfish bung toàn bộ sức mạnh không hạn chế.',
    botNotes: 'Stockfish Skill Level 20 chiều sâu tìm kiếm 20+ nước.',
    icon: Medal,
  },
];

export default function PreGameLobby() {
  const { startGame } = useChessGame();

  // Defaults: Dễ (400), Trắng ('w'), 10 phút Rapid
  const [selectedElo, setSelectedElo] = useState(400);
  const [selectedColor, setSelectedColor] = useState('w');
  const [selectedTimeControl, setSelectedTimeControl] = useState('rapid_10');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  function handleStart() {
    startGame({
      elo: selectedElo,
      color: selectedColor,
      timeControl: selectedTimeControl,
    });
  }

  const currentDiff = DIFFICULTIES.find((d) => d.elo === selectedElo) || DIFFICULTIES[0];

  return (
    <div className="flex w-full items-center justify-center p-4 min-h-[75vh]">
      <AppSurface
        variant="base"
        radius="lg"
        className="w-full max-w-xl p-6 sm:p-8 space-y-6 bg-white rounded-[28px] border border-[var(--app-border)] shadow-[var(--shadow-modal)]"
      >
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="w-16" />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#030302]">
              Chơi với máy
            </h1>
            <AppButton
              size="sm"
              variant="outline"
              onClick={() => setIsHistoryOpen(true)}
              leftIcon={<History className="h-3.5 w-3.5" />}
              className="h-8 text-xs px-2.5"
              aria-label="Lịch sử ván đấu"
            >
              Lịch sử
            </AppButton>
          </div>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">
            Chọn trình độ đối thủ, thể thức thời gian và màu quân yêu thích
          </p>
        </div>

        {/* Difficulty Selection: 8 tiers grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--app-subtle)]">
              Mức độ Bot
            </label>
            <span className="text-xs font-bold text-[#030302]">
              ELO {currentDiff.elo} · {currentDiff.label}
            </span>
          </div>

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
                  <div className="flex flex-col items-center justify-center py-0.5 text-center">
                    <Icon
                      className={`h-4 w-4 mb-1 ${
                        isSelected ? 'text-[#030302]' : 'text-[var(--app-subtle)]'
                      }`}
                    />
                    <span className="text-[11px] font-semibold text-[#030302]">
                      {diff.label}
                    </span>
                    <span className="text-[10px] text-[var(--app-muted)]">
                      {diff.elo}
                    </span>
                  </div>
                </AppRadioCard>
              );
            })}
          </AppRadioGroup>

          {/* Dynamic description box */}
          <div className="p-3.5 text-xs text-[#030302] space-y-1 bg-[var(--app-muted-surface)]/60 rounded-[16px] border border-[var(--app-border)]">
            <p className="font-medium leading-relaxed">{currentDiff.description}</p>
            <p className="text-[11px] text-[var(--app-muted)]">
              <span className="font-semibold text-[var(--app-subtle)]">Đặc điểm: </span>
              {currentDiff.botNotes}
            </p>
          </div>
        </div>

        {/* Time Control Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--app-subtle)]" />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--app-subtle)]">
              Thời gian ván đấu
            </label>
          </div>

          <AppRadioGroup
            value={selectedTimeControl}
            onChange={setSelectedTimeControl}
            ariaLabel="Chọn thể thức thời gian"
            orientation="horizontal"
            className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {TIME_CONTROLS.map((tc) => {
              return (
                <AppRadioCard
                  key={tc.id}
                  value={tc.id}
                  className="w-full"
                >
                  <div className="flex flex-col items-center justify-center py-0.5 text-center">
                    <span className="text-xs font-bold text-[#030302]">
                      {tc.label}
                    </span>
                    <span className="text-[10px] text-[var(--app-muted)] truncate w-full">
                      {tc.subLabel}
                    </span>
                  </div>
                </AppRadioCard>
              );
            })}
          </AppRadioGroup>
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

      <MatchHistoryModal
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  );
}
