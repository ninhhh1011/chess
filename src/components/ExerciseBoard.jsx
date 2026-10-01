import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { sameMove } from '../utils/chessStatus';
import { UI_COPY } from '../config/brand';
import { AppButton } from '@/ui/AppButton';
import { Lightbulb, RotateCcw } from 'lucide-react';

function uciMove(value) {
  return { from: value.slice(0, 2), to: value.slice(2, 4), ...(value[4] ? { promotion: value[4] } : {}) };
}

function newAttemptId() {
  return `attempt:${globalThis.crypto.randomUUID()}`;
}

export default function ExerciseBoard({ exercise, onResult, onAttempt }) {
  const [game, setGame] = useState(() => new Chess(exercise.fen));
  const [message, setMessage] = useState('Kéo quân để nhập đáp án của bạn.');
  const [showHint, setShowHint] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [attemptId, setAttemptId] = useState(newAttemptId);
  const solutionMoves = exercise.solutionMoves?.length
    ? exercise.solutionMoves
    : [`${exercise.correctMove.from}${exercise.correctMove.to}${exercise.correctMove.promotion || ''}`];

  function reset() {
    if (isSolved) setAttemptId(newAttemptId());
    else emitAttempt('retry', null, false);
    setGame(new Chess(exercise.fen));
    setMessage('Kéo quân để nhập đáp án của bạn.');
    setShowHint(false);
    setIsSolved(false);
    setSolutionIndex(0);
  }

  function emitAttempt(type, moveUci, solved) {
    if (!exercise.sourcePuzzleId) return;
    onAttempt?.({
      attemptId,
      eventId: `event:${globalThis.crypto.randomUUID()}`,
      puzzleId: exercise.id,
      sourcePuzzleId: exercise.sourcePuzzleId,
      skillTags: exercise.tags || [],
      type,
      moveUci,
      solved,
      at: new Date().toISOString(),
    });
  }

  function onDrop({ sourceSquare, targetSquare }) {
    if (isSolved) return false;

    const copy = new Chess(game.fen());
    const move = copy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) {
      setMessage('Nước đi không hợp lệ. Vui lòng thử lại.');
      emitAttempt('wrong', `${sourceSquare}${targetSquare}`, false);
      onResult?.({ exerciseId: exercise.id || exercise.title, isCorrect: false, tags: exercise.tags || ['illegal_move'] });
      return false;
    }
    if (!sameMove(move, uciMove(solutionMoves[solutionIndex]))) {
      setMessage('Chưa đúng. Hãy tính toán lại nước cờ.');
      emitAttempt('wrong', `${sourceSquare}${targetSquare}${move.promotion || ''}`, false);
      onResult?.({ exerciseId: exercise.id || exercise.title, isCorrect: false, tags: exercise.tags || ['wrong_candidate_move'] });
      return false;
    }

    let nextIndex = solutionIndex + 1;
    if (nextIndex < solutionMoves.length) {
      const reply = copy.move(uciMove(solutionMoves[nextIndex]));
      if (!reply) {
        setMessage('Không thể phát nước đáp của bài tập.');
        return false;
      }
      nextIndex += 1;
    }
    setGame(copy);
    const solved = nextIndex >= solutionMoves.length;
    emitAttempt('correct', solutionMoves[solutionIndex], solved);
    if (nextIndex < solutionMoves.length) {
      setSolutionIndex(nextIndex);
      setMessage('Đúng! Đối thủ đã đáp lại, hãy tiếp tục.');
      return true;
    }
    setMessage('Chính xác! Bạn đã hoàn tất lời giải.');
    setIsSolved(true);
    onResult?.({ exerciseId: exercise.id || exercise.title, isCorrect: true, tags: exercise.tags || ['tactic'] });
    return true;
  }

  const isSuccess = isSolved;
  const isWrong = message.includes('Chưa đúng') || message.includes('không hợp lệ');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,540px)_1fr] items-start">
      {/* Board Column */}
      <div className="mx-auto w-full max-w-[540px] rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm">
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop: onDrop,
            showNotation: true,
            darkSquareStyle: { backgroundColor: '#66745C' },
            lightSquareStyle: { backgroundColor: '#DAD2BD' },
          }}
        />
      </div>

      {/* Details & Controls Column */}
      <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--app-accent)]">
            Bài tập chiến thuật
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--app-foreground)]">
            {exercise.title}
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--app-muted)]">
            {exercise.description}
          </p>
        </div>

        {/* Feedback Alert Box */}
        <div
          className={`rounded-[8px] p-3 text-xs font-semibold border transition-colors ${
            isSuccess
              ? 'border-[var(--app-success)]/40 bg-[var(--app-success)]/10 text-[var(--app-success)]'
              : isWrong
              ? 'border-[var(--app-danger)]/40 bg-[var(--app-danger)]/10 text-[var(--app-danger)]'
              : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-muted)]'
          }`}
        >
          {message}
        </div>

        {showHint && (
          <div className="rounded-[8px] bg-[var(--app-surface-raised)] p-3 border border-[var(--app-border)] text-xs text-[var(--app-muted)] leading-relaxed">
            <span className="font-semibold text-[var(--app-foreground)]">{UI_COPY.hint}: </span>
            {exercise.hint}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => setShowHint(true)}
            leftIcon={<Lightbulb className="h-3.5 w-3.5" />}
          >
            {UI_COPY.hint}
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={reset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Làm lại
          </AppButton>
        </div>

        <p className="pt-2 text-[11px] font-mono text-[var(--app-subtle)] break-all border-t border-[var(--app-border)]">
          FEN: {exercise.fen}
        </p>
      </div>
    </div>
  );
}
