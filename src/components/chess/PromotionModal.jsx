import { useChessGame } from '../../contexts/ChessGameContext';
import { AppDialog } from '@/ui/AppDialog';
import { AppButton } from '@/ui/AppButton';
import { playPromotionSound } from '../../utils/sound';

const PIECE_LABELS = {
  q: 'Hậu',
  r: 'Xe',
  b: 'Tượng',
  n: 'Mã',
};

const PIECE_SYMBOLS = {
  q: '♕',
  r: '♖',
  b: '♗',
  n: '♘',
};

export default function PromotionModal() {
  const { pendingPromotion, choosePromotion, cancelPromotion } = useChessGame();

  const isOpen = Boolean(pendingPromotion);

  if (!pendingPromotion) return null;

  const pieces = ['q', 'r', 'b', 'n'];

  function handleSelect(piece) {
    if (choosePromotion(piece)) playPromotionSound();
  }

  function handleCancel() {
    cancelPromotion();
  }

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title="Phong cấp Tốt"
      description="Tốt của bạn đã đi đến hàng cuối. Hãy chọn quân cờ muốn phong cấp:"
      maxWidth="max-w-sm"
      footer={
        <AppButton
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={handleCancel}
        >
          Hủy bỏ
        </AppButton>
      }
    >
      <div className="grid grid-cols-2 gap-3 py-2">
        {pieces.map((piece) => (
          <AppButton
            key={piece}
            variant="secondary"
            onClick={() => handleSelect(piece)}
            className="h-28 flex flex-col items-center justify-center p-4 rounded-[20px] bg-[var(--app-muted-surface)]/60 hover:bg-white hover:border-[#030302] hover:shadow-xs transition-all"
            style={{ borderRadius: '20px' }}
          >
            <span className="text-4xl mb-1 select-none leading-none">
              {PIECE_SYMBOLS[piece]}
            </span>
            <span className="font-serif text-xs font-bold text-[#030302]">
              {PIECE_LABELS[piece]}
            </span>
          </AppButton>
        ))}
      </div>
    </AppDialog>
  );
}
