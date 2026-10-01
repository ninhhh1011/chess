import { beforeEach, describe, expect, test } from 'vitest';
import {
  getCorpusSummary,
  getPuzzleById,
  getPuzzlesByDifficulty,
  getPuzzlesByMotif,
  getPuzzlesByPhase,
  getRandomPuzzle,
  loadCorpus,
} from '../services/corpusLoader';
import { getAllPuzzles } from '../services/corpusService';

describe('external corpus integration', () => {
  beforeEach(() => {
    loadCorpus();
  });

  test('reports the external corpus as unavailable', () => {
    expect(getCorpusSummary()).toMatchObject({
      available: false,
      source: 'unavailable',
      puzzleCount: 0,
      totalPuzzles: 0,
      reason: 'No verified external corpus is bundled with this build.',
    });
  });

  test('does not expose bundled exercises as corpus puzzles', () => {
    expect(getAllPuzzles()).toEqual([]);
    expect(getRandomPuzzle()).toBeNull();
    expect(getPuzzleById('puzzle-mate_one_queen')).toBeUndefined();
  });

  test('returns empty results for every corpus filter', () => {
    expect(getPuzzlesByMotif('tactics')).toEqual([]);
    expect(getPuzzlesByDifficulty('beginner')).toEqual([]);
    expect(getPuzzlesByPhase('opening')).toEqual([]);
  });
});
