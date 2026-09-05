import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { AppButton } from '@/ui/AppButton';
import { AppTooltip } from '@/ui/AppTooltip';
import { Lightbulb, RotateCcw, Plus, ArrowLeftRight, Flag } from 'lucide-react';

export default function GameControls({ onHint, requestHint }) {
  const { newGame, undoMove, flipBoard, resignGame, playState, setPlayState, isBotThinking } = useChessGame();
  const [confirmAction, setConfirmAction] = useState(null);

  if (playState !== 'playing') return null;

  if (confirmAction === 'resign') {
    return (
      <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--app-danger)]/40 bg-[var(--app-surface-raised)] p-3">
        <span className="text-xs font-semibold text-[var(--app-danger)]">
          Xác nhận đầu hàng ván này?
        </span>
        <div className="flex items-center gap-2">
          <AppButton
            size="sm"
            variant="ghost"
            onClick={() => setConfirmAction(null)}
            className="flex-1"
          >
            Hủy
          </AppButton>
          <AppButton
            size="sm"
            variant="danger"
            onClick={() => {
              resignGame();
              setConfirmAction(null);
            }}
            className="flex-1"
          >
            Đầu hàng
          </AppButton>
        </div>
      </div>
    );
  }

  if (confirmAction === 'new') {
    return (
      <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3">
        <span className="text-xs font-semibold text-[var(--app-foreground)]">
          Bắt đầu ván mới?
        </span>
        <div className="flex items-center gap-2">
          <AppButton
            size="sm"
            variant="ghost"
            onClick={() => setConfirmAction(null)}
          >
            Hủy
          </AppButton>
          <AppButton
            size="sm"
            variant="secondary"
            onClick={() => {
              newGame();
              setPlayState('lobby');
              setConfirmAction(null);
            }}
          >
            Đổi cấp độ
          </AppButton>
          <AppButton
            size="sm"
            variant="primary"
            onClick={() => {
              newGame();
              setConfirmAction(null);
            }}
          >
            Ván mới
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1.5 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-xs">
      {/* Primary / Contextual action: Gợi ý */}
      <div className="flex items-center gap-1.5 flex-1">
        <AppButton
          size="sm"
          variant="primary"
          onClick={() => {
            if (requestHint) requestHint();
            if (onHint) onHint();
          }}
          disabled={isBotThinking}
          leftIcon={<Lightbulb className="h-3.5 w-3.5" />}
          aria-label="Gợi ý nước đi"
        >
          Gợi ý
        </AppButton>

        {/* Secondary action: Hoàn tác */}
        <AppButton
          size="sm"
          variant="secondary"
          onClick={undoMove}
          disabled={isBotThinking}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          aria-label="Hoàn tác nước cờ"
        >
          Hoàn tác
        </AppButton>

        {/* New Game */}
        <AppButton
          size="sm"
          variant="secondary"
          onClick={() => setConfirmAction('new')}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          aria-label="Ván mới"
        >
          Ván mới
        </AppButton>
      </div>

      {/* Utility / Danger actions */}
      <div className="flex items-center gap-1">
        <AppTooltip content="Lật bàn cờ" placement="top">
          <button
            type="button"
            onClick={flipBoard}
            aria-label="Lật bàn cờ"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)] transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
        </AppTooltip>

        <AppTooltip content="Đầu hàng ván đấu" placement="top">
          <button
            type="button"
            onClick={() => setConfirmAction('resign')}
            aria-label="Đầu hàng"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/20 transition-colors cursor-pointer"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        </AppTooltip>
      </div>
    </div>
  );
}
