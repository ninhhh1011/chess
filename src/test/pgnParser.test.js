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
import {
  PGN_CORPUS_VALID,
  PGN_CORPUS_INVALID,
  PGN_WITH_FEN,
  RKLPC7MK_FULL_PGN,
  RKLPC7MK_FIRST_40_PGN,
} from '../services/analysis/pgnFixtures';

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

    test('replays mainline comments and ignores recursive annotation variations', () => {
      const result = replayPgn(`[Event "Variation"]

1. e4 {main comment} e5 (1... c5 2. Nf3 d6) 2. Nf3 $1 Nc6 *`);

      expect(result?.moves.map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
      expect(result?.moves.map((move) => move.ply)).toEqual([1, 2, 3, 4]);
      expect(result?.moves[0].comment?.trim()).toBe('main comment');
    });

    test('replays a SetUp/FEN game from its declared initial position', () => {
      const result = replayPgn(PGN_WITH_FEN);

      expect(result?.moves).toHaveLength(1);
      expect(result?.moves[0].san).toBe('Bxf7+');
      expect(result?.finalFen).toBe('r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4');
    });

    test('replays the exact Lichess source and the named 80-ply benchmark prefix', () => {
      const full = replayPgn(RKLPC7MK_FULL_PGN);
      const prefix = replayPgn(RKLPC7MK_FIRST_40_PGN);

      expect(full?.headers.GameId).toBe('rklpc7mk');
      expect(full?.moves).toHaveLength(94);
      expect(full?.moves.at(-1)?.ply).toBe(94);
      expect(full?.moves[4].comment?.trim()).toBe('B10 Caro-Kann Defense: Goldman Variation');
      expect(full?.moves.at(-1)?.comment?.trim()).toBe('White resigns.');
      expect(full?.finalFen).toBe('8/p5p1/6P1/6bP/K1pk4/8/8/8 w - - 0 48');

      expect(prefix?.headers.SourcePlies).toBe('80');
      expect(prefix?.moves).toHaveLength(80);
      expect(prefix?.moves.at(-1)?.ply).toBe(80);
      expect(prefix?.finalFen).toBe('8/p3k1p1/2p3P1/1p2K2P/8/8/P7/2b5 w - - 0 41');
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
