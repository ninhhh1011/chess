import { useEffect, useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { playStartSound } from '../../utils/sound';

export default function StartNotice() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    playStartSound();
    const timerId = window.setTimeout(() => {
      setShow(false);
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 animate-[notice-pop_2.6s_ease-in-out_forwards] rounded-xl border border-emerald-400/40 bg-slate-950/95 px-6 py-3 text-center font-bold text-emerald-300 shadow-sm ">
      Bắt đầu ván cờ.
    </div>
  );
}
