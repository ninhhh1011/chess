/**
 * Analysis Orientation Tests
 *
 * Tests evaluation normalization:
 * - White blunder
 * - Black blunder
 * - Mate score handling
 * - CPL calculation
 * - Classification
 */

import { describe, test, expect } from 'vitest';
import {
  normalizeEvalToWhite,
  calculateCPL,
  classifyMove,
  parseEngineEval,
} from '../services/analysis/orientation';

describe('Evaluation Orientation', () => {
  describe('normalizeEvalToWhite', () => {
    test('white perspective stays the same', () => {
      const eval_ = { type: 'cp' as const, value: 50, depth: 10 };
      const result = normalizeEvalToWhite(eval_, 'w');
      expect(result.value).toBe(50);
    });

    test('black perspective flips sign for cp', () => {
      const eval_ = { type: 'cp' as const, value: 50, depth: 10 };
      const result = normalizeEvalToWhite(eval_, 'b');
      expect(result.value).toBe(-50);
    });

    test('white mate stays positive', () => {
      const eval_ = { type: 'mate' as const, value: 3, depth: 10 };
      const result = normalizeEvalToWhite(eval_, 'w');
      expect(result.value).toBe(3);
    });

    test('black mate becomes negative', () => {
      const eval_ = { type: 'mate' as const, value: 3, depth: 10 };
      const result = normalizeEvalToWhite(eval_, 'b');
      expect(result.value).toBe(-3);
    });

    test('mate for black to avoid mate becomes positive', () => {
      const eval_ = { type: 'mate' as const, value: -2, depth: 10 };
      const result = normalizeEvalToWhite(eval_, 'b');
      expect(result.value).toBe(2);
    });
  });

  describe('calculateCPL', () => {
    test('best move has 0 CPL', () => {
      const played = { type: 'cp' as const, value: 30 };
      const best = { type: 'cp' as const, value: 30 };
      expect(calculateCPL(played, best)).toBe(0);
    });

    test('simple centipawn loss', () => {
      const played = { type: 'cp' as const, value: 20 };
      const best = { type: 'cp' as const, value: 70 };
      expect(calculateCPL(played, best)).toBe(50); // 70 - 20 = 50cp
    });

    test('negative loss (opponent error)', () => {
      const played = { type: 'cp' as const, value: 80 };
      const best = { type: 'cp' as const, value: 30 };
      expect(calculateCPL(played, best)).toBe(-50); // Good move!
    });

    test('both mate scores - mate distance', () => {
      const played = { type: 'mate' as const, value: 2 };
      const best = { type: 'mate' as const, value: 4 };
      expect(calculateCPL(played, best)).toBe(200); // |2-4| * 100
    });
  });

  describe('classifyMove', () => {
    test('best move', () => {
      expect(classifyMove(0, { type: 'cp', value: 0 })).toBe('best');
    });

    test('excellent (≤0.1 pawn)', () => {
      expect(classifyMove(5, { type: 'cp', value: 0 })).toBe('excellent');
    });

    test('good (≤0.3 pawn)', () => {
      expect(classifyMove(20, { type: 'cp', value: 0 })).toBe('good');
    });

    test('inaccuracy (≤0.8 pawn)', () => {
      expect(classifyMove(60, { type: 'cp', value: 0 })).toBe('inaccuracy');
    });

    test('mistake (≤2 pawn)', () => {
      expect(classifyMove(150, { type: 'cp', value: 0 })).toBe('mistake');
    });

    test('blunder (>2 pawn)', () => {
      expect(classifyMove(300, { type: 'cp', value: 0 })).toBe('blunder');
    });
  });

  describe('parseEngineEval', () => {
    test('parses cp', () => {
      const result = parseEngineEval('cp 35');
      expect(result).toEqual({ type: 'cp', value: 35 });
    });

    test('parses negative cp', () => {
      const result = parseEngineEval('cp -50');
      expect(result).toEqual({ type: 'cp', value: -50 });
    });

    test('parses mate', () => {
      const result = parseEngineEval('mate 3');
      expect(result).toEqual({ type: 'mate', value: 3 });
    });

    test('parses negative mate', () => {
      const result = parseEngineEval('mate -5');
      expect(result).toEqual({ type: 'mate', value: -5 });
    });

    test('returns null for invalid', () => {
      expect(parseEngineEval('invalid')).toBeNull();
    });
  });
});
