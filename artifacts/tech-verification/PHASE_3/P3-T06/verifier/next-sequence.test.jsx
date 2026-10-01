import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ loadProductionCorpus: vi.fn() }));
vi.mock('../../../../../src/services/corpusLoader', () => ({
  CORPUS_AVAILABILITY: { available: false, source: 'unavailable', puzzleCount: 0 },
  loadProductionCorpus: mocks.loadProductionCorpus,
}));
vi.mock('../../../../../src/services/userProfileService', () => ({
  getUserProfile: () => ({ exerciseStats: { accuracy: 0 } }),
  recordPuzzleAttemptEvent: vi.fn(),
  updateExerciseResult: vi.fn(),
}));
vi.mock('../../../../../src/components/ExerciseBoard', () => ({
  default: ({ exercise }) => <div data-testid="current-puzzle">{exercise.id}</div>,
}));

import Exercises from '../../../../../src/pages/Exercises';

const ids = ['00008', '0000D', '0008Q', '000B9'];
const puzzles = ids.map((sourcePuzzleId) => ({
  id: `lichess-${sourcePuzzleId}`, sourcePuzzleId, title: `Lichess puzzle ${sourcePuzzleId}`,
  description: 'Real puzzle', hint: 'Find it', fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
  correctMove: { from: 'a1', to: 'a2' }, solutionMoves: ['a1a2'], tags: ['endgame'],
  sourceUrl: `https://lichess.org/training/${sourcePuzzleId}`,
}));

describe('P3-T06 independent Next sequence', () => {
  beforeEach(() => mocks.loadProductionCorpus.mockResolvedValue({
    available: true, source: 'lichess', puzzleCount: puzzles.length,
    licenseId: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    datasetVersion: '2026-08-02', puzzles,
  }));

  test('visits each available real corpus puzzle exactly once before wrapping', async () => {
    render(<Exercises />);
    const seen = [await screen.findByTestId('current-puzzle').then((node) => node.textContent)];
    for (let index = 1; index <= puzzles.length; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: /B.i ti.p theo/i }));
      seen.push(screen.getByTestId('current-puzzle').textContent);
    }
    expect(seen.slice(0, puzzles.length)).toEqual(puzzles.map(({ id }) => id));
    expect(new Set(seen.slice(0, puzzles.length)).size).toBe(puzzles.length);
    expect(seen.at(-1)).toBe(puzzles[0].id);
  });
});
