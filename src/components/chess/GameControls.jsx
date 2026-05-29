import { useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';

export default function GameControls() {
  const { newGame, undoMove, flipBoard, resignGame, playState, setPlayState, engineHint, setEngineHint } = useChessGame();
  
  const [confirmAction, setConfirmAction] = useState(null); // 'resign' or 'new'

  if (playState !== 'playing') return null;

  const handleHintClick = () => {
    // If we have an engine hint but it's not shown somehow or just to request a re-eval if needed
    // In our setup, engineHint is automatically generated, we can just highlight it via CSS or it's handled by GameLayout
    if (!engineHint) {
      // Just a placeholder, as Engine is always analyzing in the background
      alert('Đang chờ phân tích từ Engine...');
    }
  };

  const renderConfirm = () => {
    if (confirmAction === 'resign') {
      return (
        <div className="flex w-full items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 animate-in slide-in-from-bottom-2">
          <span className="text-sm font-medium text-rose-400">Chắc chắn đầu hàng?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmAction(null)} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">Huỷ</button>
            <button onClick={() => { resignGame(); setConfirmAction(null); }} className="rounded bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-500">Đầu hàng</button>
          </div>
        </div>
      );
    }
    
    if (confirmAction === 'new') {
      return (
        <div className="flex w-full flex-col gap-2 rounded-lg bg-slate-800 px-3 py-2 animate-in slide-in-from-bottom-2">
          <span className="text-sm font-medium text-slate-300">Ván cờ chưa xong. Bạn muốn đổi thiết lập hay chơi lại từ đầu?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmAction(null)} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">Huỷ</button>
            <button onClick={() => { newGame(); setPlayState('lobby'); setConfirmAction(null); }} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">Về sảnh (Đổi Bot)</button>
            <button onClick={() => { newGame(); setConfirmAction(null); }} className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500">Chơi lại ngay</button>
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
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
              title="Đầu hàng"
            >
              🏳️ Đầu hàng
            </button>
            <button 
              onClick={() => setConfirmAction('new')}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              🔄 Ván mới
            </button>
          </div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={undoMove}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Đi lại (Undo)"
            >
              ↩️
            </button>
            <button 
              onClick={flipBoard}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Xoay bàn cờ"
            >
              🔃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
