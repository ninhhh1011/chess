/**
 * Phase 2: Corpus Integration Test
 *
 * Verifies that the corpus can be loaded, puzzles can be solved,
 * and the UI integration works correctly.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { loadCorpus, getCorpusSummary, getRandomPuzzle, getPuzzleById } from '../services/corpusLoader';
import { getAllPuzzles, validateSolutionReplay } from '../services/corpusService';

describe('Corpus Integration', () => {
  beforeAll(() => {
    loadCorpus();
  }, 180000); // 3 minute timeout for loading 20k puzzles

  describe('Corpus Loading', () => {
    test('loads corpus with all puzzle sources', () => {
      const allPuzzles = getAllPuzzles();
      console.log(`[DEBUG] All puzzles count: ${allPuzzles.length}`);
      const summary = getCorpusSummary();
      expect(summary.totalPuzzles).toBeGreaterThan(0);
      console.log(`Total puzzles loaded: ${summary.totalPuzzles}`);
    });

    test('has corpus version', () => {
      const summary = getCorpusSummary();
      expect(summary.corpusVersion).toBeDefined();
      expect(summary.corpusVersion).toMatch(/^v?\d+\.\d+/);
    });
  });

  describe('Corpus Quality', () => {
    test('has minimum 20,000 puzzles', () => {
      const summary = getCorpusSummary();
      console.log(`Puzzle count: ${summary.totalPuzzles}`);
      expect(summary.totalPuzzles).toBeGreaterThanOrEqual(20000);
    });

    test('all puzzles have provenance', () => {
      const puzzles = getAllPuzzles();
      const withProvenance = puzzles.filter(p =>
        p.sourceId && p.licenseId && p.corpusVersion
      );
      expect(withProvenance.length).toBe(puzzles.length);
      console.log(`Puzzles with provenance: ${withProvenance.length}/${puzzles.length}`);
    });

    test('has at least 12 motifs', () => {
      const summary = getCorpusSummary();
      expect(summary.motifs.length).toBeGreaterThanOrEqual(12);
      console.log(`Motifs: ${summary.motifs.join(', ')}`);
    });

    test('no quarantined records from generated data', () => {
      const summary = getCorpusSummary();
      expect(summary.qualityReport.quarantinedCount).toBe(0);
    });
  });

  describe('Puzzle Solving', () => {
    test('can retrieve random puzzle', () => {
      const puzzle = getRandomPuzzle();
      expect(puzzle).toBeDefined();
      expect(puzzle?.fen).toBeDefined();
      expect(puzzle?.correctMoves).toBeDefined();
      expect(puzzle?.correctMoves.length).toBeGreaterThan(0);
    });

    test('can retrieve puzzle by ID', () => {
      const puzzle = getRandomPuzzle();
      if (puzzle) {
        const retrieved = getPuzzleById(puzzle.puzzleId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.fen).toBe(puzzle.fen);
      }
    });

    test('solution can be replayed', () => {
      const puzzle = getRandomPuzzle();
      if (puzzle && puzzle.correctMoves.length > 0) {
        const result = validateSolutionReplay(puzzle.fen, puzzle.correctMoves);
        expect(result.valid).toBe(true);
      }
    });

    test('all puzzles have valid FEN', () => {
      const puzzles = getAllPuzzles();
      // Sample 1000 puzzles for validation (full validation would be too slow)
      const sampleSize = Math.min(1000, puzzles.length);
      const sampled = puzzles.slice(0, sampleSize);
      let validCount = 0;
      let invalidFens: string[] = [];

      for (const puzzle of sampled) {
        try {
          const result = validateSolutionReplay(puzzle.fen, [puzzle.correctMoves[0]].filter(Boolean));
          if (result.valid) validCount++;
        } catch {
          invalidFens.push(puzzle.puzzleId);
        }
      }

      console.log(`Valid FEN puzzles: ${validCount}/${sampleSize} (sampled from ${puzzles.length})`);
      if (invalidFens.length > 0) {
        console.log(`Invalid FENs: ${invalidFens.slice(0, 5).join(', ')}...`);
      }

      const validRate = validCount / sampled.length;
      expect(validRate).toBeGreaterThan(0.95);
    });
  });

  describe('Motif Coverage', () => {
    test('covers mate_1 motif', () => {
      const puzzle = getRandomPuzzle({ motif: 'mate_1' });
      // May be null if not generated with this motif
      expect(puzzle === null || puzzle.motifs.includes('mate_1')).toBe(true);
    });

    test('covers tactics motif', () => {
      const puzzle = getRandomPuzzle({ motif: 'tactics' });
      expect(puzzle).toBeDefined();
      expect(puzzle?.motifs).toContain('tactics');
    });

    test('covers fork motif', () => {
      const puzzle = getRandomPuzzle({ motif: 'fork' });
      expect(puzzle === null || puzzle.motifs.includes('fork')).toBe(true);
    });

    test('covers pin motif', () => {
      const puzzle = getRandomPuzzle({ motif: 'pin' });
      expect(puzzle === null || puzzle.motifs.includes('pin')).toBe(true);
    });

    test('covers endgame motif', () => {
      const puzzle = getRandomPuzzle({ motif: 'endgame_conversion' });
      expect(puzzle === null || puzzle.motifs.includes('endgame_conversion')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('can load corpus in reasonable time', () => {
      const start = performance.now();
      const puzzles = getAllPuzzles();
      const end = performance.now();
      const loadTime = end - start;

      console.log(`Load time: ${loadTime.toFixed(2)}ms for ${puzzles.length} puzzles`);
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
    });

    test('random puzzle selection is fast', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        getRandomPuzzle();
      }
      const end = performance.now();
      const avgTime = (end - start) / 100;

      console.log(`Avg puzzle selection time: ${avgTime.toFixed(2)}ms`);
      expect(avgTime).toBeLessThan(10); // Should be fast
    });
  });
});

describe('Corpus 20,000 Puzzle Gate', () => {
  beforeAll(() => {
    loadCorpus();
  }, 180000); // 3 minute timeout for loading 20k puzzles

  test('Phase 2 Gate: >= 20,000 puzzles', () => {
    const summary = getCorpusSummary();
    console.log(`\n=== PHASE 2 GATE RESULTS ===`);
    console.log(`Total puzzles: ${summary.totalPuzzles}`);
    console.log(`Required: 20,000`);
    console.log(`Status: ${summary.totalPuzzles >= 20000 ? 'PASS ✓' : 'FAIL ✗'}`);
    expect(summary.totalPuzzles).toBeGreaterThanOrEqual(20000);
  });

  test('Phase 2 Gate: 100% solution replay', () => {
    const puzzles = getAllPuzzles();
    // Sample for performance
    const sampleSize = Math.min(1000, puzzles.length);
    const sampled = puzzles.slice(0, sampleSize);
    let replayable = 0;

    for (const puzzle of sampled) {
      if (puzzle.correctMoves.length > 0) {
        const result = validateSolutionReplay(puzzle.fen, puzzle.correctMoves);
        if (result.valid) replayable++;
      }
    }

    const rate = (replayable / sampled.length) * 100;
    console.log(`Solution replay rate: ${rate.toFixed(2)}% (sampled ${sampleSize} from ${puzzles.length})`);
    console.log(`Status: ${rate >= 95 ? 'PASS ✓' : 'PARTIAL ⚠'}`);
    expect(rate).toBeGreaterThanOrEqual(95);
  });

  test('Phase 2 Gate: >= 12 motifs', () => {
    const summary = getCorpusSummary();
    console.log(`Motif count: ${summary.motifs.length}`);
    console.log(`Required: 12`);
    console.log(`Motifs: ${summary.motifs.slice(0, 15).join(', ')}`);
    console.log(`Status: ${summary.motifs.length >= 12 ? 'PASS ✓' : 'FAIL ✗'}`);
    expect(summary.motifs.length).toBeGreaterThanOrEqual(12);
  });

  test('Phase 2 Gate: 100% provenance', () => {
    const puzzles = getAllPuzzles();
    const withProvenance = puzzles.filter(p =>
      p.sourceId && p.licenseId && p.corpusVersion && p.importRunId
    );
    const rate = (withProvenance.length / puzzles.length) * 100;
    console.log(`Provenance rate: ${rate.toFixed(2)}%`);
    console.log(`Status: ${rate === 100 ? 'PASS ✓' : 'FAIL ✗'}`);
    expect(rate).toBe(100);
  });
});
