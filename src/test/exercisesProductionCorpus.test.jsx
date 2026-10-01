import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ loadProductionCorpus: vi.fn(), recordPuzzleAttemptEvent: vi.fn() }));

vi.mock('../services/corpusLoader', () => ({
  CORPUS_AVAILABILITY: { available: false, source: 'unavailable', puzzleCount: 0 },
  loadProductionCorpus: mocks.loadProductionCorpus,
}));
vi.mock('../services/userProfileService', () => ({
  getUserProfile: () => ({ exerciseStats: { accuracy: 0 } }),
  recordPuzzleAttemptEvent: mocks.recordPuzzleAttemptEvent,
  updateExerciseResult: vi.fn(),
}));
vi.mock('../components/ExerciseBoard', () => ({
  default: ({ exercise, onAttempt }) => (
    <button type="button" onClick={() => onAttempt?.({
      attemptId: 'attempt:00000000-0000-4000-8000-000000000001',
      eventId: 'event:00000000-0000-4000-8000-000000000002',
      puzzleId: exercise.id,
      sourcePuzzleId: exercise.sourcePuzzleId,
      type: 'wrong', moveUci: 'f8e8', solved: false, at: '2026-09-06T00:00:00.000Z',
    })}
    >{exercise.title}</button>
  ),
}));

import Exercises from '../pages/Exercises';

describe('production corpus exercises', () => {
  beforeEach(() => {
    mocks.recordPuzzleAttemptEvent.mockReturnValue({ exerciseStats: { accuracy: 0 } });
    mocks.loadProductionCorpus.mockResolvedValue({
      available: true,
      source: 'lichess',
      puzzleCount: 1,
      licenseId: 'CC0-1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      datasetVersion: '2026-08-02',
      puzzles: [{
        id: 'lichess-0000D', sourcePuzzleId: '0000D', title: 'Lichess puzzle 0000D', description: 'Real puzzle', hint: 'Find it',
        fen: '5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27',
        correctMove: { from: 'f8', to: 'd8' }, solutionMoves: ['f8d8', 'd6d8', 'f6d8'],
        tags: ['advantage'], sourceUrl: 'https://lichess.org/training/0000D',
        licenseId: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', rating: 1559,
      }, {
        id: 'lichess-00008', sourcePuzzleId: '00008', title: 'Lichess puzzle 00008', description: 'Real puzzle', hint: 'Find it',
        fen: 'r6k/ppp3pp/8/4Pp2/8/1P1P1Q1P/P1P2PP1/5RK1 b - - 0 23',
        correctMove: { from: 'e6', to: 'e7' }, solutionMoves: ['e6e7', 'b3c1'], tags: ['crushing'],
        sourceUrl: 'https://lichess.org/training/00008', licenseId: 'CC0-1.0',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', rating: 1760,
      }],
    });
  });

  test('opens a real imported puzzle and visibly discloses source and license', async () => {
    render(<Exercises />);

    expect(await screen.findByText('Lichess puzzle 0000D')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lichess/i })).toHaveAttribute('href', 'https://lichess.org/training/0000D');
    expect(screen.getByRole('link', { name: /CC0-1.0/i })).toHaveAttribute('href', 'https://creativecommons.org/publicdomain/zero/1.0/');
    expect(screen.queryByText(/external corpus/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lichess puzzle 0000D' }));
    expect(mocks.recordPuzzleAttemptEvent).toHaveBeenCalledWith(expect.objectContaining({
      puzzleId: 'lichess-0000D', sourcePuzzleId: '0000D', type: 'wrong', moveUci: 'f8e8',
    }));
  });

  test('advances through available real puzzles before wrapping', async () => {
    render(<Exercises />);
    expect(await screen.findByText('Lichess puzzle 0000D')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /B.i ti.p theo/i }));
    expect(screen.getByText('Lichess puzzle 00008')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /B.i ti.p theo/i }));
    expect(screen.getByText('Lichess puzzle 0000D')).toBeInTheDocument();
  });
});
