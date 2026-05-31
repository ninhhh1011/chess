import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { UI_COPY } from '../../config/brand';

export default function GameControls({ onHint }) {
  const { newGame, undoMove, flipBoard, resignGame, playState, setPlayState } = useChessGame();
  const [confirmAction, setConfirmAction] = useState(null);

  if (playState !== 'playing') return null;

  const renderConfirm = () => {
    if (confirmAction === 'resign') {
      return (
        <div className="flex w-full items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
          <span className="text-sm font-medium text-rose-300">Chắc chắn đầu hàng?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmAction(null)} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
              Hủy
            </button>
            <button
              onClick={() => {
                resignGame();
                setConfirmAction(null);
              }}
              className="rounded bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-500"
            >
              {UI_COPY.resign}
            </button>
          </div>
        </div>
      );
    }

    if (confirmAction === 'new') {
      return (
        <div className="flex w-full flex-col gap-2 rounded-lg bg-slate-800 px-3 py-2">
          <span className="text-sm font-medium text-slate-300">Ván này chưa xong. Làm ván mới hay đổi thiết lập?</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setConfirmAction(null)} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
              Hủy
            </button>
            <button
              onClick={() => {
                newGame();
                setPlayState('lobby');
                setConfirmAction(null);
              }}
              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              Đổi thiết lập
            </button>
            <button
              onClick={() => {
                newGame();
                setConfirmAction(null);
              }}
              className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
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
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-sm">
      {confirmAction ? (
        renderConfirm()
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirmAction('resign')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
              title={UI_COPY.resign}
            >
              {UI_COPY.resign}
            </button>
            <button
              onClick={() => setConfirmAction('new')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              {UI_COPY.newGame}
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={onHint}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-slate-700 hover:text-emerald-300"
              title={UI_COPY.hint}
            >
              {UI_COPY.hint}
            </button>
            <button
              onClick={undoMove}
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              title={UI_COPY.undo}
            >
              {UI_COPY.undo}
            </button>
            <button
              onClick={flipBoard}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Xoay bàn cờ"
            >
              ↕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
