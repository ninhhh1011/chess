import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { UI_COPY } from '../../config/brand';

export default function GameControls({ onHint, requestHint }) {
  const { newGame, undoMove, flipBoard, resignGame, playState, setPlayState } = useChessGame();
  const [confirmAction, setConfirmAction] = useState(null);
  const [showMore, setShowMore] = useState(false);

  if (playState !== 'playing') return null;

  const renderConfirm = () => {
    if (confirmAction === 'resign') {
      return (
        <div className="flex w-full items-center justify-between rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2">
          <span className="text-sm font-medium text-rose-300">Xác nhận đầu hàng?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmAction(null)} className="px-2 py-1 text-xs text-text-400 hover:text-text-200 transition-colors">
              Hủy
            </button>
            <button
              onClick={() => {
                resignGame();
                setConfirmAction(null);
              }}
              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
            >
              {UI_COPY.resign}
            </button>
          </div>
        </div>
      );
    }

    if (confirmAction === 'new') {
      return (
        <div className="flex w-full flex-col gap-2 rounded-md border border-border/70 bg-bg-950 px-3 py-2">
          <span className="text-sm font-medium text-text-300">Bắt đầu ván mới?</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setConfirmAction(null)} className="px-2 py-1 text-xs text-text-400 hover:text-text-200 transition-colors">
              Hủy
            </button>
            <button
              onClick={() => {
                newGame();
                setPlayState('lobby');
                setConfirmAction(null);
              }}
              className="rounded-md border border-border/60 px-2 py-1 text-xs text-text-300 hover:bg-bg-800 transition-colors"
            >
              Đổi cấp độ
            </button>
            <button
              onClick={() => {
                newGame();
                setConfirmAction(null);
              }}
              className="rounded-md bg-primary-400 px-2 py-1 text-xs font-semibold text-bg-950 hover:bg-primary-300 transition-colors"
            >
              {UI_COPY.newGame}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-bg-950/80 p-2 shadow-sm">
      {confirmAction ? (
        renderConfirm()
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Primary controls - always visible */}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (requestHint) requestHint();
                  if (onHint) onHint();
                }}
                className="rounded-md border border-primary-400/25 bg-primary-400/10 px-3 py-2 text-xs font-medium text-primary-300 hover:bg-primary-400/15 transition-colors"
                title={UI_COPY.hint}
              >
                {UI_COPY.hint}
              </button>
              <button
                onClick={undoMove}
                className="rounded-md border border-border bg-bg-900 px-3 py-2 text-xs font-medium text-text-300 hover:bg-bg-800 transition-colors"
                title={UI_COPY.undo}
              >
                {UI_COPY.undo}
              </button>
              <button
                onClick={() => setConfirmAction('new')}
                className="rounded-md border border-border bg-bg-900 px-3 py-2 text-xs font-medium text-text-300 hover:bg-bg-800 transition-colors"
              >
                {UI_COPY.newGame}
              </button>
            </div>

            {/* Secondary menu toggle */}
            <button
              onClick={() => setShowMore(!showMore)}
              className="rounded-md border border-border bg-bg-900 px-2 py-2 text-text-400 hover:bg-bg-800 hover:text-text-300 transition-colors"
              title="Thêm tùy chọn"
            >
              <span className="text-sm">•••</span>
            </button>
          </div>

          {/* Secondary menu */}
          {showMore && (
            <div className="flex flex-wrap gap-2 rounded-md border border-border/50 bg-bg-900/50 p-2 transition-all duration-200">
              <button
                onClick={() => {
                  flipBoard();
                  setShowMore(false);
                }}
                className="rounded-md border border-border bg-bg-900 px-3 py-2 text-xs text-text-300 hover:bg-bg-800 transition-colors"
              >
                ↕ Lật bàn
              </button>
              <button
                onClick={() => setConfirmAction('resign')}
                className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15 transition-colors"
              >
                {UI_COPY.resign}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
