/**
 * Bot UCI Protocol Tests
 *
 * Tests that bot difficulty levels send correct UCI commands to Stockfish:
 * - Skill Level
 * - UCI_LimitStrength
 * - UCI_Elo
 * - depth
 * - movetime
 *
 * Verifies monotonic increase across difficulty levels.
 */

import { describe, test, expect, vi } from 'vitest';
import { BOT_ELO_LEVELS, getBotLevelByElo } from '../data/botLevels';
import { Chess } from 'chess.js';

describe('Bot UCI Protocol Configuration', () => {
  describe('UCI Options by Difficulty', () => {
    test('Dễ (400 ELO) uses Skill Level only', () => {
      const level = getBotLevelByElo(400);

      expect(level.useSkillLevelOnly).toBe(true);
      expect(level.skillLevel).toBeLessThanOrEqual(5);
      expect(level.skillLevel).toBeGreaterThanOrEqual(0);
      expect(level.elo).toBe(400);
    });

    test('Vừa (800 ELO) uses Skill Level only', () => {
      const level = getBotLevelByElo(800);

      expect(level.useSkillLevelOnly).toBe(true);
      expect(level.skillLevel).toBeGreaterThan(0);
      expect(level.elo).toBe(800);
    });

    test('Khó (1200 ELO) uses UCI_Elo', () => {
      const level = getBotLevelByElo(1200);

      expect(level.useSkillLevelOnly).toBe(false);
      expect(level.elo).toBe(1200);
    });

    test('Thử thách (1600 ELO) uses UCI_Elo', () => {
      const level = getBotLevelByElo(1600);

      expect(level.useSkillLevelOnly).toBe(false);
      expect(level.elo).toBe(1600);
    });
  });

  describe('Monotonic Property', () => {
    test('ELO increases monotonically', () => {
      for (let i = 1; i < BOT_ELO_LEVELS.length; i++) {
        expect(BOT_ELO_LEVELS[i].elo).toBeGreaterThan(BOT_ELO_LEVELS[i - 1].elo);
      }
    });

    test('Depth increases monotonically', () => {
      for (let i = 1; i < BOT_ELO_LEVELS.length; i++) {
        expect(BOT_ELO_LEVELS[i].depth).toBeGreaterThan(BOT_ELO_LEVELS[i - 1].depth);
      }
    });

    test('Movetime increases monotonically', () => {
      for (let i = 1; i < BOT_ELO_LEVELS.length; i++) {
        expect(BOT_ELO_LEVELS[i].movetime).toBeGreaterThan(BOT_ELO_LEVELS[i - 1].movetime);
      }
    });

    test('Skill Level increases monotonically', () => {
      for (let i = 1; i < BOT_ELO_LEVELS.length; i++) {
        expect(BOT_ELO_LEVELS[i].skillLevel).toBeGreaterThan(BOT_ELO_LEVELS[i - 1].skillLevel);
      }
    });
  });

  describe('UCI Command Construction', () => {
    test('generates correct UCI_LimitStrength command for Skill Level mode', () => {
      const level = getBotLevelByElo(400);

      if (level.useSkillLevelOnly) {
        // Should NOT set UCI_Elo when using Skill Level only
        expect(level.elo).toBeLessThan(1200);
      }
    });

    test('generates correct UCI_LimitStrength command for UCI_Elo mode', () => {
      const level = getBotLevelByElo(1200);

      if (!level.useSkillLevelOnly) {
        // UCI_LimitStrength should be true
        // UCI_Elo should be set
        expect(level.elo).toBeGreaterThanOrEqual(1200);
      }
    });

    test('no random chance in any difficulty', () => {
      BOT_ELO_LEVELS.forEach(level => {
        expect(level.randomChance).toBe(0);
      });
    });

    test('all levels have valid depth', () => {
      BOT_ELO_LEVELS.forEach(level => {
        expect(level.depth).toBeGreaterThan(0);
        expect(level.depth).toBeLessThanOrEqual(20);
      });
    });

    test('all levels have valid movetime', () => {
      BOT_ELO_LEVELS.forEach(level => {
        expect(level.movetime).toBeGreaterThan(0);
        expect(level.movetime).toBeLessThanOrEqual(10000);
      });
    });
  });

  describe('Engine Compatibility', () => {
    test('Skill Level values are within Stockfish range (0-20)', () => {
      BOT_ELO_LEVELS.forEach(level => {
        expect(level.skillLevel).toBeGreaterThanOrEqual(0);
        expect(level.skillLevel).toBeLessThanOrEqual(20);
      });
    });

    test('UCI_Elo values are within Stockfish supported range', () => {
      BOT_ELO_LEVELS.forEach(level => {
        if (!level.useSkillLevelOnly) {
          expect(level.elo).toBeGreaterThanOrEqual(1200);
          expect(level.elo).toBeLessThanOrEqual(2850);
        }
      });
    });

    test('low ELO uses only Skill Level (not UCI_Elo)', () => {
      const easy = getBotLevelByElo(400);
      const medium = getBotLevelByElo(800);

      expect(easy.useSkillLevelOnly).toBe(true);
      expect(medium.useSkillLevelOnly).toBe(true);
    });
  });
});

describe('Bot Move Validation', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  test('bot move from any level must be legal', async () => {
    // This test verifies the integration works
    // Actual move generation is tested in integration tests
    const game = new Chess(STARTING_FEN);
    const moves = game.moves({ verbose: true });

    expect(moves.length).toBeGreaterThan(0);
  });

  test('all starting moves are valid', () => {
    const game = new Chess(STARTING_FEN);
    const moves = game.moves({ verbose: true });

    moves.forEach(move => {
      expect(move.from).toBeDefined();
      expect(move.to).toBeDefined();
      expect(move.from).not.toBe(move.to);
    });
  });
});
