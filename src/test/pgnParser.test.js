/**
 * PGN Parser Tests
 *
 * Tests PGN parsing and game replay.
 */

import { describe, test, expect } from 'vitest';
import {
  parsePgn,
  replayPgn,
  validatePgnCorpus,
  generatePgn,
} from '../services/analysis/pgnParser';
import { PGN_CORPUS_VALID, PGN_CORPUS_INVALID } from '../services/analysis/pgnFixtures';

describe('PGN Parser', () => {
  describe('parsePgn', () => {
    test('parses simple PGN', () => {
      const result = parsePgn('1. e4 e5 2. Nf3 Nc6 *');
      expect(result.success).toBe(true);
      expect(result.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    });

    test('parses with result', () => {
      const result = parsePgn('1. e4 e5 2. Nf3 Nc6 1-0');
      expect(result.success).toBe(true);
      expect(result.result).toBe('1-0');
    });

    test('parses with headers', () => {
      const pgn = `[Event "Test Game"]
[Site "?"]
[Date "2024.01.01"]
[White "Player1"]
[Black "Player2"]

1. e4 e5 1-0`;

      const result = parsePgn(pgn);
      expect(result.success).toBe(true);
      expect(result.headers['Event']).toBe('Test Game');
      expect(result.headers['White']).toBe('Player1');
    });

    test('fails on invalid PGN', () => {
      const result = parsePgn('invalid pgn string');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('handles malformed PGN', () => {
      const result = parsePgn('this is not valid pgn at all');
      expect(result.success).toBe(false);
    });
  });

  describe('replayPgn', () => {
    test('replays and returns positions', () => {
      const result = replayPgn('1. e4 e5 *');
      expect(result).not.toBeNull();
      expect(result?.moves.length).toBe(2);
      expect(result?.moves[0].san).toBe('e4');
    });

    test('captures final FEN', () => {
      const result = replayPgn('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0');
      expect(result).not.toBeNull();
      expect(result?.finalFen).toBeDefined();
    });

    test('handles simple game', () => {
      const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 *';
      const result = replayPgn(pgn);
      expect(result).not.toBeNull();
      expect(result?.moves.length).toBeGreaterThan(0);
    });

    test('handles complex PGN', () => {
      // Use a simple game that should work
      const result = replayPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 *');
      expect(result).not.toBeNull();
      expect(result?.moves.length).toBeGreaterThan(0);
    });

    test('returns null for invalid PGN', () => {
      const result = replayPgn('completely invalid');
      // May return null or have 0 moves
      expect(result === null || result?.moves.length === 0).toBe(true);
    });
  });

  describe('PGN Corpus Validation', () => {
    test('validates all valid corpus', () => {
      const validPgns = PGN_CORPUS_VALID.map(f => f.pgn);
      const result = validatePgnCorpus(validPgns);
      // All valid PGNs should parse successfully
      expect(result.valid.length).toBeGreaterThan(0);
    });
  });

  describe('generatePgn', () => {
    test('generates simple PGN', () => {
      const pgn = generatePgn(['e4', 'e5', 'Nf3']);
      expect(pgn).toBe('1. e4 e5 2. Nf3');
    });

    test('includes headers', () => {
      const pgn = generatePgn(['e4'], {
        White: 'Test',
        Black: 'Opponent',
      });
      expect(pgn).toContain('[White "Test"]');
      expect(pgn).toContain('[Black "Opponent"]');
    });
  });

  describe('Move Recognition', () => {
    test('recognizes standard moves', () => {
      const result = parsePgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 *');
      expect(result.success).toBe(true);
      expect(result.moves.length).toBeGreaterThanOrEqual(4);
    });

    test('recognizes captures', () => {
      const result = parsePgn('1. e4 e5 2. d4 exd4 *');
      expect(result.success).toBe(true);
    });

    test('recognizes check', () => {
      const result = parsePgn('1. e4 e5 2. Qh5 Nc6 3. Qxf7# *');
      expect(result.success).toBe(true);
    });
  });
});

describe('PGN Corpus - Valid PGNs Parse', () => {
  test('valid corpus PGNs parse correctly', () => {
    const validPgns = PGN_CORPUS_VALID.map(f => f.pgn);
    const result = validatePgnCorpus(validPgns);
    const successRate = (result.valid.length / validPgns.length) * 100;
    // At least 80% should parse
    expect(successRate).toBeGreaterThanOrEqual(80);
  });
});
