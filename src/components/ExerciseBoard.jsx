import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { sameMove } from '../utils/chessStatus';

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
    <div className="mx-auto w-full max-w-[560px] rounded-[2rem] border border-white/10 bg-white/[.08] p-4 shadow-glow backdrop-blur">
      <Chessboard options={{
        position: game.fen(),
        onPieceDrop: onDrop,
        showNotation: true,
        darkSquareStyle: { backgroundColor: '#7a4f2d' },
        lightSquareStyle: { backgroundColor: '#f7e4bf' },
      }} />
    </div>
    <div className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
      <h2 className="text-2xl font-black">{exercise.title}</h2>
      <p className="mt-3 leading-7 text-cream/75">{exercise.description}</p>
      <div className={`mt-5 rounded-2xl p-4 font-bold ${message === 'Chính xác!' ? 'bg-emerald-400/15 text-emerald-100' : 'bg-amber-400/15 text-amber-100'}`}>{message}</div>
      {showHint && <p className="mt-4 rounded-2xl bg-ink/45 p-4 text-cream/75">Gợi ý: {exercise.hint}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-secondary" onClick={() => setShowHint(true)}>Gợi ý</button>
        <button className="btn-secondary" onClick={reset}>Làm lại</button>
      </div>
      <p className="mt-5 break-all text-xs text-cream/45">FEN: {exercise.fen}</p>
    </div>
  </div>;
}
