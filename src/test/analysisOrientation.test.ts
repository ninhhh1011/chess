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
  calculateCPL,
  calculateMoverCPL,
  classifyMove,
  determineSkillTags,
  parseEngineEval,
} from '../services/analysis/orientation';

describe('Evaluation Orientation', () => {
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

    test('engine noise cannot produce negative CPL', () => {
      const played = { type: 'cp' as const, value: 80 };
      const best = { type: 'cp' as const, value: 30 };
      expect(calculateCPL(played, best)).toBe(0);
    });

    test('orders winning mate by the shorter distance', () => {
      expect(calculateCPL(
        { type: 'mate', value: 4 },
        { type: 'mate', value: 2 }
      )).toBe(200);
      expect(calculateCPL(
        { type: 'mate', value: 2 },
        { type: 'mate', value: 4 }
      )).toBe(0);
    });

    test('orders losing mate by the longer survival', () => {
      expect(calculateCPL(
        { type: 'mate', value: -2 },
        { type: 'mate', value: -4 }
      )).toBe(200);
      expect(calculateCPL(
        { type: 'mate', value: -4 },
        { type: 'mate', value: -2 }
      )).toBe(0);
    });

    test('orders mate above centipawn advantage and below centipawn when losing', () => {
      expect(calculateCPL(
        { type: 'cp', value: 900 },
        { type: 'mate', value: 3 }
      )).toBeGreaterThan(900);
      expect(calculateCPL(
        { type: 'mate', value: -3 },
        { type: 'cp', value: -900 }
      )).toBeGreaterThan(900);
    });

    test('is symmetric and non-negative for white and black movers', () => {
      expect(calculateMoverCPL(
        { type: 'cp', value: 100 },
        { type: 'cp', value: -100 },
        'w'
      )).toBe(200);
      expect(calculateMoverCPL(
        { type: 'cp', value: -100 },
        { type: 'cp', value: 100 },
        'b'
      )).toBe(200);
      expect(calculateMoverCPL(
        { type: 'cp', value: 0 },
        { type: 'cp', value: 20 },
        'w'
      )).toBe(0);
      expect(calculateMoverCPL(
        { type: 'cp', value: 0 },
        { type: 'cp', value: -20 },
        'b'
      )).toBe(0);
    });

    test.each([
      ['w', { type: 'mate' as const, value: 2 }, { type: 'mate' as const, value: 4 }, 200],
      ['w', { type: 'mate' as const, value: -4 }, { type: 'mate' as const, value: -2 }, 200],
      ['b', { type: 'mate' as const, value: -2 }, { type: 'mate' as const, value: -4 }, 200],
      ['b', { type: 'mate' as const, value: 4 }, { type: 'mate' as const, value: 2 }, 200],
    ] as const)('preserves mate-distance loss for %s mover', (mover, before, after, expected) => {
      expect(calculateMoverCPL(before, after, mover)).toBe(expected);
    });
  });

  describe('skill tags', () => {
    test('uses positive CPL for tactical and endgame losses', () => {
      const move = { san: 'Qe4', piece: 'Q', isCapture: false, isCheck: false, isMate: false };

      expect(determineSkillTags(move, 200, {
        isBackRank: false,
        isHanging: false,
        isOpening: false,
        isEndgame: false,
      })).toContain('tactical_oversight');
      expect(determineSkillTags(move, 120, {
        isBackRank: false,
        isHanging: false,
        isOpening: false,
        isEndgame: true,
      })).toContain('endgame_conversion');
    });
  });

  describe('classifyMove', () => {
    test('best move', () => {
      expect(classifyMove(0)).toBe('best');
    });

    test('excellent (≤0.1 pawn)', () => {
      expect(classifyMove(5)).toBe('excellent');
    });

    test('good (≤0.3 pawn)', () => {
      expect(classifyMove(20)).toBe('good');
    });

    test('inaccuracy (≤0.8 pawn)', () => {
      expect(classifyMove(60)).toBe('inaccuracy');
    });

    test('mistake (≤2 pawn)', () => {
      expect(classifyMove(150)).toBe('mistake');
    });

    test('blunder (>2 pawn)', () => {
      expect(classifyMove(300)).toBe('blunder');
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
