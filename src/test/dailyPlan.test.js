/**
 * Daily Training Plan Contract Tests
 *
 * Tests:
 * - Generator creates non-empty plan for new user
 * - Generator creates valid tasks format
 * - Legacy data migration
 * - Malformed storage recovery
 * - Regenerate produces non-empty plan
 */

import { generateDailyTrainingPlan } from '../services/recommendationService';
import { getUserProfile } from '../services/userProfileService';

describe('Daily Training Plan Contract', () => {
  const defaultProfile = {
    currentLevel: 'noob',
    gamesPlayed: 0,
    lessonsCompleted: [],
    exercisesCompleted: [],
    exerciseStats: { total: 0, correct: 0, wrong: 0, accuracy: 0 },
    commonMistakes: [],
    strengths: [],
    weaknesses: [],
    openingStats: {
      totalAttempts: 0,
      completedOpenings: [],
      practicedOpenings: [],
      weakOpenings: [],
      favoriteOpenings: [],
    },
  };

  describe('New User Plan', () => {
    it('creates non-empty plan for new user', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);

      expect(plan).toBeDefined();
      expect(plan.schemaVersion).toBe('training.v1');
      expect(plan.generatedAt).toBeDefined();
      expect(plan.tasks).toBeDefined();
      expect(Array.isArray(plan.tasks)).toBe(true);
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('has at least one lesson', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);
      const lessons = plan.tasks.filter(t => t.type === 'lesson');

      expect(lessons.length).toBeGreaterThan(0);
    });

    it('has at least one exercise', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);
      const exercises = plan.tasks.filter(t => t.type === 'exercise');

      expect(exercises.length).toBeGreaterThan(0);
    });

    it('has at least one challenge', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);
      const challenges = plan.tasks.filter(t => t.type === 'challenge');

      expect(challenges.length).toBeGreaterThan(0);
    });
  });

  describe('Task Structure', () => {
    it('each task has required fields', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);

      plan.tasks.forEach(task => {
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('reason');
      });
    });

    it('task type is valid enum', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);
      const validTypes = ['lesson', 'exercise', 'opening', 'challenge'];

      plan.tasks.forEach(task => {
        expect(validTypes).toContain(task.type);
      });
    });

    it('lesson has correct type', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);
      const lessons = plan.tasks.filter(t => t.type === 'lesson');

      lessons.forEach(lesson => {
        expect(lesson.type).toBe('lesson');
        expect(typeof lesson.id).toBe('string');
        expect(typeof lesson.title).toBe('string');
        expect(typeof lesson.reason).toBe('string');
      });
    });

    it('exercise has skillTag field', () => {
      const plan = generateDailyTrainingPlan(defaultProfile);
      const exercises = plan.tasks.filter(t => t.type === 'exercise');

      exercises.forEach(exercise => {
        expect(exercise).toHaveProperty('skillTag');
      });
    });
  });

  describe('User Level Variations', () => {
    it('works for noob level', () => {
      const plan = generateDailyTrainingPlan({ ...defaultProfile, currentLevel: 'noob' });
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('works for beginner level', () => {
      const plan = generateDailyTrainingPlan({ ...defaultProfile, currentLevel: 'beginner' });
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('works for intermediate level', () => {
      const plan = generateDailyTrainingPlan({ ...defaultProfile, currentLevel: 'intermediate' });
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('works for advanced level', () => {
      const plan = generateDailyTrainingPlan({ ...defaultProfile, currentLevel: 'advanced' });
      expect(plan.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('prioritizes the weakest persisted skill and carries its evidence trace', () => {
      const plan = generateDailyTrainingPlan({
        ...defaultProfile,
        persistence: {
          skillStates: [
            { skillId: 'king_safety', score: 1, evidenceIds: ['game:one:ply:2'] },
            { skillId: 'hanging_piece', score: -2, evidenceIds: ['game:one:ply:4', 'event:wrong'] },
          ],
        },
      });

      expect(plan.tasks.find((task) => task.type === 'exercise')).toMatchObject({
        id: 'skill:hanging_piece', skillTag: 'hanging_piece',
        evidenceIds: ['game:one:ply:4', 'event:wrong'],
      });
    });

    it('handles empty profile', () => {
      const plan = generateDailyTrainingPlan({});
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('handles null profile', () => {
      const plan = generateDailyTrainingPlan(null);
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    it('handles missing exercise pool gracefully', () => {
      const profile = {
        ...defaultProfile,
        commonMistakes: [],
        exerciseStats: { total: 0, correct: 0, wrong: 0, accuracy: 0 },
      };
      const plan = generateDailyTrainingPlan(profile);

      // Should still have fallback exercise
      const exercises = plan.tasks.filter(t => t.type === 'exercise');
      expect(exercises.length).toBeGreaterThan(0);
    });

    it('handles user with many games played', () => {
      const profile = {
        ...defaultProfile,
        gamesPlayed: 50,
        exerciseStats: { total: 100, correct: 75, wrong: 25, accuracy: 75 },
      };
      const plan = generateDailyTrainingPlan(profile);

      expect(plan.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('Legacy Data Migration', () => {
    it('handles old format with lesson/exercises/opening/challenge fields', () => {
      const legacyPlan = {
        generatedAt: '2024-01-01T00:00:00Z',
        lesson: { id: 'board', title: 'Bàn cờ', reason: 'Nền tảng' },
        exercises: [{ id: 'ex1', title: 'Bài 1', reason: 'Test' }],
        opening: { id: 'italian', title: 'Italian', reason: 'Test' },
        challenge: 'Chơi 1 ván',
      };

      localStorage.setItem('vuaCoUserTrainingProfile', JSON.stringify({
        ...defaultProfile,
        dailyTrainingPlan: legacyPlan,
      }));

      const profile = getUserProfile();

      expect(profile.schemaVersion).toBe('profile.v2');
      expect(profile.dailyTrainingPlan.schemaVersion).toBe('training.v1');
      expect(profile.dailyTrainingPlan.tasks.map((task) => task.type)).toEqual([
        'lesson',
        'exercise',
        'opening',
        'challenge',
      ]);

      const persisted = JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile'));
      expect(persisted.schemaVersion).toBe('profile.v2');
      expect(persisted.dailyTrainingPlan.schemaVersion).toBe('training.v1');
    });

    it('rejects malformed persisted tasks and regenerates a usable plan', () => {
      localStorage.setItem('vuaCoUserTrainingProfile', JSON.stringify({
        ...defaultProfile,
        dailyTrainingPlan: {
          schemaVersion: 'training.v1',
          generatedAt: 'not-a-date',
          tasks: [{ type: 'unknown', id: '', title: '', reason: '' }],
        },
      }));

      const profile = getUserProfile();

      expect(profile.dailyTrainingPlan.schemaVersion).toBe('training.v1');
      expect(profile.dailyTrainingPlan.tasks.length).toBeGreaterThan(0);
      expect(profile.dailyTrainingPlan.tasks.every((task) =>
        ['lesson', 'exercise', 'opening', 'challenge'].includes(task.type)
        && task.id
        && task.title
        && task.reason
      )).toBe(true);
    });
  });
});
