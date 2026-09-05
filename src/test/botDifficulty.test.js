/**
 * Bot Difficulty Configuration Tests
 */

import { BOT_ELO_LEVELS, getBotLevelByElo } from '../data/botLevels';

describe('Bot Difficulty Configuration', () => {
  describe('Difficulty Labels', () => {
    it('uses correct UI labels', () => {
      const labels = BOT_ELO_LEVELS.map(l => l.label);
      expect(labels).toEqual(['Dễ', 'Vừa', 'Khó', 'Thử thách']);
    });

    it('has monotonically increasing ELO', () => {
      const elos = BOT_ELO_LEVELS.map(l => l.elo);
      for (let i = 1; i < elos.length; i++) {
        expect(elos[i]).toBeGreaterThan(elos[i - 1]);
      }
    });

    it('has monotonically increasing depth', () => {
      const depths = BOT_ELO_LEVELS.map(l => l.depth);
      for (let i = 1; i < depths.length; i++) {
        expect(depths[i]).toBeGreaterThan(depths[i - 1]);
      }
    });

    it('has monotonically increasing movetime', () => {
      const times = BOT_ELO_LEVELS.map(l => l.movetime);
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1]);
      }
    });

    it('has monotonically increasing skillLevel', () => {
      const skills = BOT_ELO_LEVELS.map(l => l.skillLevel);
      for (let i = 1; i < skills.length; i++) {
        expect(skills[i]).toBeGreaterThan(skills[i - 1]);
      }
    });
  });

  describe('getBotLevelByElo', () => {
    it('returns exact match for valid ELO', () => {
      const level = getBotLevelByElo(400);
      expect(level.elo).toBe(400);
      expect(level.label).toBe('Dễ');
    });

    it('returns fallback for invalid ELO', () => {
      const level = getBotLevelByElo(999);
      expect(level).toBeDefined();
      expect(level.elo).toBeDefined();
    });

    it('returns correct level for each difficulty', () => {
      expect(getBotLevelByElo(400).label).toBe('Dễ');
      expect(getBotLevelByElo(800).label).toBe('Vừa');
      expect(getBotLevelByElo(1200).label).toBe('Khó');
      expect(getBotLevelByElo(1600).label).toBe('Thử thách');
    });
  });

  describe('Configuration Values', () => {
    it('Dễ uses Skill Level only (low ELO)', () => {
      const easy = getBotLevelByElo(400);
      expect(easy.useSkillLevelOnly).toBe(true);
      expect(easy.skillLevel).toBeLessThanOrEqual(3);
    });

    it('Vừa uses Skill Level only', () => {
      const medium = getBotLevelByElo(800);
      expect(medium.useSkillLevelOnly).toBe(true);
      expect(medium.skillLevel).toBeGreaterThan(0);
    });

    it('Khó and above use UCI_Elo', () => {
      const hard = getBotLevelByElo(1200);
      const challenge = getBotLevelByElo(1600);
      expect(hard.useSkillLevelOnly).toBe(false);
      expect(challenge.useSkillLevelOnly).toBe(false);
    });

    it('no random chance in any difficulty', () => {
      BOT_ELO_LEVELS.forEach(level => {
        expect(level.randomChance).toBe(0);
      });
    });
  });
});
