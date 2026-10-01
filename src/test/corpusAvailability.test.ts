import { describe, expect, test } from 'vitest';
import { getAllPuzzles } from '../services/corpusService';
import { loadCorpus } from '../services/corpusLoader';

describe('corpus availability contract', () => {
  test('does not present bundled or generated exercises as a real corpus', () => {
    const status = loadCorpus();

    expect(status).toEqual({
      available: false,
      source: 'unavailable',
      puzzleCount: 0,
      reason: 'No verified external corpus is bundled with this build.',
    });
    expect(getAllPuzzles()).toEqual([]);
  });
});
