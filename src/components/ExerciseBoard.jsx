import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { sameMove } from '../utils/chessStatus';
import { UI_COPY } from '../config/brand';

export default function ExerciseBoard({ exercise, onResult }) {
  const [game, setGame] = useState(() => new Chess(exercise.fen));
  const [message, setMessage] = useState('Kéo quân để nhập đáp án của bạn.');
  const [showHint, setShowHint] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  function reset() {
    setGame(new Chess(exercise.fen));
    setMessage('Kéo quân để nhập đáp án của bạn.');
    setShowHint(false);
    setIsSolved(false);
  }

  function onDrop({ sourceSquare, targetSquare }) {
    if (isSolved) return false;

    const copy = new Chess(game.fen());
    const move = copy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) {
      setMessage('Chưa đúng, thử lại.');
      onResult?.({ exerciseId: exercise.id || exercise.title, isCorrect: false, tags: exercise.tags || ['illegal_move'] });
      return false;
    }
    if (sameMove(move, exercise.correctMove)) {
      setGame(copy);
      setMessage('Chính xác!');
      setIsSolved(true);
      onResult?.({ exerciseId: exercise.id || exercise.title, isCorrect: true, tags: exercise.tags || ['tactic'] });
      return true;
    }
    setMessage('Chưa đúng, thử lại.');
    onResult?.({ exerciseId: exercise.id || exercise.title, isCorrect: false, tags: exercise.tags || ['wrong_candidate_move'] });
    return false;
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(280px,560px)_1fr]">
    <div className="mx-auto w-full max-w-[560px] rounded-xl border border-slate-800 bg-slate-800 p-4 shadow-sm ">
      <Chessboard options={{
        position: game.fen(),
        onPieceDrop: onDrop,
        showNotation: true,
        darkSquareStyle: { backgroundColor: '#334155' },
        lightSquareStyle: { backgroundColor: '#94a3b8' },
      }} />
    </div>
    <div className="rounded-xl border border-slate-800 bg-slate-800 p-6 ">
      <h2 className="text-2xl font-bold">{exercise.title}</h2>
      <p className="mt-3 leading-7 text-slate-300">{exercise.description}</p>
      <div className={`mt-5 rounded-xl p-4 font-bold ${message === 'Chính xác!' ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-400/15 text-emerald-100'}`}>{message}</div>
      {showHint && <p className="mt-4 rounded-xl bg-slate-900 p-4 text-slate-300">{UI_COPY.hint}: {exercise.hint}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-secondary" onClick={() => setShowHint(true)}>{UI_COPY.hint}</button>
        <button className="btn-secondary" onClick={reset}>Làm lại</button>
      </div>
      <p className="mt-5 break-all text-xs text-slate-400">FEN: {exercise.fen}</p>
    </div>
  </div>;
}
