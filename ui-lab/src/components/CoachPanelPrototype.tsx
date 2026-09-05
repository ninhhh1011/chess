import { useState } from 'react';
import { AppButton } from '../ui/AppButton';
import { AppTooltip } from '../ui/AppTooltip';
import { TruthfulSourceLine } from '../ui/AppStatus';
import { Bot, Lightbulb, AlertTriangle, MessageSquare, Info } from 'lucide-react';

export interface CoachPanelPrototypeProps {
  className?: string;
  sourceMode?: 'basic' | 'llm' | 'unavailable';
}

export function CoachPanelPrototype({
  className = '',
  sourceMode = 'basic',
}: CoachPanelPrototypeProps) {
  const [selectedTopic, setSelectedTopic] = useState<'quick' | 'focus' | 'hint'>('hint');

  const adviceContent = {
    quick: {
      title: 'Nhận xét nhanh thế cờ',
      text: 'Trắng vừa di chuyển Hậu lên h5 quá sớm ở nước 12. Điều này để lộ điểm yếu ở cánh Vua và tạo cơ hội cho Mã Đen phản công d4.',
      focusPoint: 'Ưu tiên phát triển Xe và kiểm soát trung tâm trước khi tấn công.',
    },
    focus: {
      title: 'Điểm then chốt cần lưu ý',
      text: 'Quân Mã Đen ở d5 đang chiếm vị trí trung tâm rất mạnh. Cần đề phòng nước nhảy Mã vào f4 đe dọa trực tiếp điểm g2.',
      focusPoint: 'Bảo vệ an toàn cho Vua trước mọi hành động đẩy quân.',
    },
    hint: {
      title: 'Gợi ý nước đi',
      text: 'Nên lùi Hậu về vị trí an toàn hoặc phát triển Xe Rfe1 để giữ vững cột mở e, củng cố trung tâm vững chắc.',
      focusPoint: 'Nước tốt nhất: 12. Rfe1 (Đánh giá +0.3)',
    },
  }[selectedTopic];

  return (
    <div className={`flex flex-col h-full space-y-3 ${className}`}>
      {/* Coach Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--app-foreground)]">Ninh Lốp Trưởng AI Coach</h4>
            <p className="text-[10px] text-[var(--app-muted)]">Cố vấn chiến thuật thời gian thực</p>
          </div>
        </div>

        <AppTooltip content="Xem chi tiết nguồn phân tích Stockfish và AI">
          <button
            type="button"
            className="text-[var(--app-subtle)] hover:text-[var(--app-foreground)] p-1 rounded-[4px]"
            aria-label="Thông tin nguồn dữ liệu"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </AppTooltip>
      </div>

      {/* Action Chips */}
      <div className="grid grid-cols-3 gap-1.5">
        <AppButton
          variant={selectedTopic === 'quick' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedTopic('quick')}
          leftIcon={<MessageSquare className="h-3 w-3" />}
          className="text-[11px] px-2"
        >
          Nhận xét
        </AppButton>
        <AppButton
          variant={selectedTopic === 'focus' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedTopic('focus')}
          leftIcon={<AlertTriangle className="h-3 w-3" />}
          className="text-[11px] px-2"
        >
          Chú ý
        </AppButton>
        <AppButton
          variant={selectedTopic === 'hint' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedTopic('hint')}
          leftIcon={<Lightbulb className="h-3 w-3" />}
          className="text-[11px] px-2"
        >
          Gợi ý
        </AppButton>
      </div>

      {/* Advice Display Box */}
      <div
        className="flex-1 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 text-xs flex flex-col justify-between"
        style={{ borderRadius: '8px' }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--app-foreground)] text-xs">
              {adviceContent.title}
            </span>
            <span className="text-[10px] text-[var(--app-chess-gold)] font-medium">
              Ván đấu: Nước 12
            </span>
          </div>

          <p className="text-[var(--app-foreground)] leading-relaxed text-xs">
            {adviceContent.text}
          </p>

          <div className="mt-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[11px] text-[var(--app-muted)]">
            <span className="font-semibold text-[var(--app-foreground)]">Điểm cần nhớ: </span>
            {adviceContent.focusPoint}
          </div>
        </div>

        {/* Truthful Source presentation */}
        <TruthfulSourceLine
          source={sourceMode === 'llm' ? 'coach-llm' : sourceMode === 'unavailable' ? 'unavailable' : 'coach-basic'}
          details="Độ sâu 16 plies"
        />
      </div>
    </div>
  );
}
