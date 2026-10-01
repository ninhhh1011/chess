import { useState } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useMobileTouch } from '../hooks/useMobileTouch';
import { AppAlertDialog } from '@/ui/AppAlertDialog';
import { AppButton } from '@/ui/AppButton';
import { RotateCcw, FlipHorizontal, Flag, Plus } from 'lucide-react';

export default function MobileControls() {
  const {
    undoMove,
    flipBoard,
    resignGame,
    playState,
    setPlayState,
    newGame,
  } = useChessGame();
  const { isMobile } = useMobileTouch();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isMobile || playState !== 'playing') return null;

  const handleResign = () => {
    resignGame();
    setShowConfirm(false);
  };

  const handleNewGame = () => {
    newGame();
    setShowConfirm(false);
    setPlayState('lobby');
  };

  return (
    <>
      {/* Mobile bottom controls */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--app-border)] bg-[var(--app-surface-raised)]/95 backdrop-blur">
        <div className="flex items-center justify-around py-2 px-1">
          <AppButton
            variant="ghost"
            onClick={undoMove}
            className="flex-col gap-1 py-2 px-3 h-auto min-h-[44px]"
          >
            <RotateCcw className="h-5 w-5 text-[var(--app-muted)]" />
            <span className="text-[10px]">Đi lại</span>
          </AppButton>

          <AppButton
            variant="ghost"
            onClick={flipBoard}
            className="flex-col gap-1 py-2 px-3 h-auto min-h-[44px]"
          >
            <FlipHorizontal className="h-5 w-5 text-[var(--app-muted)]" />
            <span className="text-[10px]">Lật bàn</span>
          </AppButton>

          <AppButton
            variant="ghost"
            onClick={() => setShowConfirm('resign')}
            className="flex-col gap-1 py-2 px-3 h-auto min-h-[44px] hover:text-[var(--app-danger)]"
          >
            <Flag className="h-5 w-5 text-[var(--app-danger)]" />
            <span className="text-[10px] text-[var(--app-danger)]">Đầu hàng</span>
          </AppButton>

          <AppButton
            variant="ghost"
            onClick={() => setShowConfirm('new')}
            className="flex-col gap-1 py-2 px-3 h-auto min-h-[44px]"
          >
            <Plus className="h-5 w-5 text-[var(--app-accent)]" />
            <span className="text-[10px] text-[var(--app-accent)]">Ván mới</span>
          </AppButton>
        </div>
      </div>

      {/* Confirm dialog */}
      <AppAlertDialog
        isOpen={Boolean(showConfirm)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShowConfirm(false);
        }}
        title={showConfirm === 'resign' ? 'Đầu hàng?' : 'Ván mới?'}
        description={
          showConfirm === 'resign'
            ? 'Bạn sẽ nhận kết quả thua cho ván cờ này. Bạn có chắc chắn không?'
            : 'Ván cờ hiện tại sẽ kết thúc và bắt đầu ván mới.'
        }
        confirmText={showConfirm === 'resign' ? 'Đầu hàng' : 'Xác nhận'}
        cancelText="Hủy"
        variant={showConfirm === 'resign' ? 'danger' : 'primary'}
        onConfirm={showConfirm === 'resign' ? handleResign : handleNewGame}
      />
    </>
  );
}
