import { useEffect, useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { playStartSound } from '../../utils/sound';

export default function StartNotice() {
  const { playerColor, moveHistory } = useChessGame();
  const [show, setShow] = useState(true);
  const [userHasMoved, setUserHasMoved] = useState(false);
  const initialMoveCount = moveHistory.length;

  useEffect(() => {
    playStartSound();
  }, []);

  // Collapse after user's first move (moveHistory increases)
  useEffect(() => {
    if (moveHistory.length > initialMoveCount && !userHasMoved) {
      setUserHasMoved(true);
      // Fade out after a short delay
      const timer = window.setTimeout(() => {
        setShow(false);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, [moveHistory.length, initialMoveCount, userHasMoved]);

  // Also auto-dismiss after 8 seconds if user hasn't moved
  useEffect(() => {
    if (!userHasMoved) {
      const timer = window.setTimeout(() => {
        setShow(false);
      }, 8000);
      return () => window.clearTimeout(timer);
    }
  }, [userHasMoved]);

  if (!show) return null;

  const isWhite = playerColor === 'w';
  const colorLabel = isWhite ? 'Trắng' : 'Đen';
  const firstMoveText = isWhite
    ? 'Bạn đi trước'
    : 'Máy sẽ đi trước';

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 animate-[notice-pop_2.6s_ease-in-out_forwards] rounded-xl border border-primary-400/40 bg-bg-elevated/95 px-5 py-3 text-center shadow-sm">
      <div className="font-bold text-primary-300">
        Bắt đầu ván cờ
      </div>
      <div className="mt-1 text-sm text-text-secondary">
        Bạn cầm <span className="font-medium text-text-primary">{colorLabel}</span>. {firstMoveText}.
      </div>
      {isWhite && (
        <div className="mt-1 text-xs text-text-tertiary">
          Chạm hoặc kéo quân; ô hợp lệ sẽ sáng
        </div>
      )}
      {!isWhite && (
        <div className="mt-1 text-xs text-text-tertiary">
          Đang đợi máy đi...
        </div>
      )}
    </div>
  );
}
