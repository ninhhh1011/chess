import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ExerciseBoard from '../components/ExerciseBoard';

const board = vi.hoisted(() => ({ options: null }));
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }) => {
    board.options = options;
    return <div data-testid="board-position">{options.position}</div>;
  },
}));

const exercise = {
  id: 'lichess-0000D', sourcePuzzleId: '0000D', title: 'Lichess puzzle 0000D', description: 'Real puzzle', hint: 'Find it',
  fen: '5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27',
  correctMove: { from: 'f8', to: 'd8' }, solutionMoves: ['f8d8', 'd6d8', 'f6d8'], tags: ['advantage'],
};

describe('real multi-ply puzzle solution', () => {
  beforeEach(() => { board.options = null; });

  test('keeps wrong moves off the board, allows retry, plays the reply, and solves the full line', () => {
    const onResult = vi.fn();
    const onAttempt = vi.fn();
    render(<ExerciseBoard exercise={exercise} onResult={onResult} onAttempt={onAttempt} />);
    const initialFen = screen.getByTestId('board-position').textContent;

    act(() => board.options.onPieceDrop({ sourceSquare: 'f8', targetSquare: 'e8' }));
    expect(screen.getByText(/Chưa đúng/)).toBeInTheDocument();
    expect(screen.getByTestId('board-position')).toHaveTextContent(initialFen);

    fireEvent.click(screen.getByRole('button', { name: /m l/i }));
    expect(screen.getByTestId('board-position')).toHaveTextContent(initialFen);

    act(() => board.options.onPieceDrop({ sourceSquare: 'f8', targetSquare: 'd8' }));
    expect(screen.getByText(/tiếp tục/i)).toBeInTheDocument();
    expect(screen.getByTestId('board-position')).toHaveTextContent('3Q2k1/1p3ppp/pq3b2/8/8/1P3N2/P4PPP/3R2K1 b - - 0 28');

    act(() => board.options.onPieceDrop({ sourceSquare: 'f6', targetSquare: 'd8' }));
    expect(screen.getByText(/Chính xác/)).toBeInTheDocument();
    expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ exerciseId: 'lichess-0000D', isCorrect: true }));

    const events = onAttempt.mock.calls.map(([event]) => event);
    expect(events.map(({ type, moveUci, solved }) => ({ type, moveUci, solved }))).toEqual([
      { type: 'wrong', moveUci: 'f8e8', solved: false },
      { type: 'retry', moveUci: null, solved: false },
      { type: 'correct', moveUci: 'f8d8', solved: false },
      { type: 'correct', moveUci: 'f6d8', solved: true },
    ]);
    expect(new Set(events.map(({ attemptId }) => attemptId))).toEqual(new Set([events[0].attemptId]));
    expect(events[0].attemptId).toMatch(/^attempt:[0-9a-f-]{36}$/);
    expect(new Set(events.map(({ eventId }) => eventId))).toHaveLength(4);
    for (const event of events) {
      expect(event).toMatchObject({ puzzleId: 'lichess-0000D', sourcePuzzleId: '0000D', skillTags: ['advantage'] });
      expect(event.eventId).toMatch(/^event:[0-9a-f-]{36}$/);
      expect(event.at).toBe(new Date(event.at).toISOString());
    }

    fireEvent.click(screen.getByRole('button', { name: /m l/i }));
    expect(onAttempt).toHaveBeenCalledTimes(4);
    act(() => board.options.onPieceDrop({ sourceSquare: 'f8', targetSquare: 'd8' }));
    act(() => board.options.onPieceDrop({ sourceSquare: 'f6', targetSquare: 'd8' }));

    const secondAttempt = onAttempt.mock.calls.slice(4).map(([event]) => event);
    expect(secondAttempt.map(({ type, solved }) => ({ type, solved }))).toEqual([
      { type: 'correct', solved: false },
      { type: 'correct', solved: true },
    ]);
    expect(new Set(secondAttempt.map(({ attemptId }) => attemptId)).size).toBe(1);
    expect(secondAttempt[0].attemptId).not.toBe(events[0].attemptId);
  });
});
