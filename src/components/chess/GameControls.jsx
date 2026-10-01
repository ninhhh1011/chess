import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { AppButton } from '@/ui/AppButton';
import { AppTooltip } from '@/ui/AppTooltip';
import { AppAlertDialog } from '@/ui/AppAlertDialog';
import { AppSurface } from '@/ui/AppSurface';
import { Lightbulb, RotateCcw, Plus, ArrowLeftRight, Flag, AlertTriangle } from 'lucide-react';

export default function GameControls({ onHint, requestHint }) {
  const { newGame, undoMove, flipBoard, resignGame, playState, setPlayState, isBotThinking } = useChessGame();
  const [isResignOpen, setIsResignOpen] = useState(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);

  if (playState !== 'playing') return null;

  return (
    <>
      <AppSurface
        variant="base"
        radius="sm"
        className="flex items-center justify-between gap-1.5 p-2 shadow-xs"
      >
        {/* Primary / Contextual action: Gợi ý, Hoàn tác, Ván mới */}
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
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
            onClick={() => setIsNewGameOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            aria-label="Bắt đầu ván mới"
          >
            Ván mới
          </AppButton>
        </div>

        {/* Utility / Danger actions */}
        <div className="flex items-center gap-1">
          <AppTooltip content="Lật bàn cờ" placement="top">
            <AppButton
              size="sm"
              variant="outline"
              onClick={flipBoard}
              aria-label="Lật bàn cờ"
              className="h-8 w-8 p-0 shrink-0"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </AppButton>
          </AppTooltip>

          <AppTooltip content="Đầu hàng ván đấu" placement="top">
            <AppButton
              size="sm"
              variant="danger"
              onClick={() => setIsResignOpen(true)}
              aria-label="Đầu hàng ván đấu"
              className="h-8 w-8 p-0 shrink-0"
            >
              <Flag className="h-3.5 w-3.5" />
            </AppButton>
          </AppTooltip>
        </div>
      </AppSurface>

      {/* Resign Confirmation: HeroUI AlertDialog */}
      <AppAlertDialog
        isOpen={isResignOpen}
        onOpenChange={setIsResignOpen}
        title="Xác nhận đầu hàng"
        confirmLabel="Đầu hàng"
        cancelLabel="Tiếp tục chơi"
        confirmVariant="danger"
        status="danger"
        icon={<AlertTriangle className="h-5 w-5 text-[var(--app-danger)]" />}
        onConfirm={resignGame}
      >
        Bạn có chắc chắn muốn đầu hàng ván cờ này không? Kết quả sẽ được ghi nhận là một trận thua.
      </AppAlertDialog>

      {/* New Game Confirmation: HeroUI AlertDialog */}
      <AppAlertDialog
        isOpen={isNewGameOpen}
        onOpenChange={setIsNewGameOpen}
        title="Bắt đầu ván mới"
        confirmLabel="Tạo ván mới"
        cancelLabel="Tiếp tục ván hiện tại"
        confirmVariant="primary"
        status="warning"
        icon={<Plus className="h-5 w-5 text-[var(--app-accent)]" />}
        onConfirm={() => {
          newGame();
          setPlayState('lobby');
        }}
      >
        Ván cờ hiện tại sẽ kết thúc và bạn sẽ được quay về phòng chờ để chọn mức độ Bot hoặc màu quân mới.
      </AppAlertDialog>
    </>
  );
}
