import { useState } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useMobileTouch } from '../hooks/useMobileTouch';

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
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-elevated/95 backdrop-blur">
        <div className="flex items-center justify-around py-3">
          <button
            onClick={undoMove}
            className="flex flex-col items-center gap-1 px-4 py-2 text-text-secondary transition hover:text-text-primary"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="text-xs">Đi lại</span>
          </button>

          <button
            onClick={flipBoard}
            className="flex flex-col items-center gap-1 px-4 py-2 text-text-secondary transition hover:text-text-primary"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs">Lật bàn</span>
          </button>

          <button
            onClick={() => setShowConfirm('resign')}
            className="flex flex-col items-center gap-1 px-4 py-2 text-text-secondary transition hover:text-red-400"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-xs">Đầu hàng</span>
          </button>

          <button
            onClick={() => setShowConfirm('new')}
            className="flex flex-col items-center gap-1 px-4 py-2 text-text-secondary transition hover:text-primary-400"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs">Ván mới</span>
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-xs rounded-xl border border-border bg-bg-elevated p-4">
            <h3 className="mb-2 text-center text-lg font-bold text-text-primary">
              {showConfirm === 'resign' ? 'Đầu hàng?' : 'Ván mới?'}
            </h3>
            <p className="mb-4 text-center text-sm text-text-secondary">
              {showConfirm === 'resign'
                ? 'Bạn sẽ thua ván cờ này.'
                : 'Bắt đầu ván cờ mới.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary"
              >
                Hủy
              </button>
              <button
                onClick={showConfirm === 'resign' ? handleResign : handleNewGame}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                  showConfirm === 'resign'
                    ? 'bg-red-600 text-white'
                    : 'bg-primary-400 text-bg-base'
                }`}
              >
                {showConfirm === 'resign' ? 'Đầu hàng' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
