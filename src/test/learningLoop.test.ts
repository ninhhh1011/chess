/**
 * Phase 3: Learning Loop Integration Test
 *
 * Tests the complete learning loop: profile -> daily plan -> exercise -> skill update
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  getUserProfile,
  saveUserProfile,
  resetUserProfile,
  updateExerciseResult,
  updateAfterGame,
  levelUpIfEligible,
} from '../services/userProfileService';
import {
  generateDailyTrainingPlan,
  getRecommendedExercises,
  getRecommendedLessons,
} from '../services/recommendationService';
import { loadCorpus, getRandomPuzzle } from '../services/corpusLoader';

describe('Learning Loop Integration', () => {
  beforeEach(() => {
    resetUserProfile();
    loadCorpus();
  }, 60000); // 60s timeout for corpus loading

  describe('New User Profile', () => {
    test('creates default profile with all required fields', () => {
      const profile = getUserProfile();
      expect(profile).toBeDefined();
      expect(profile.currentLevel).toBe('noob');
      expect(profile.exerciseStats).toBeDefined();
      expect(profile.exerciseStats.total).toBe(0);
    });

    test('has no weaknesses initially', () => {
      const profile = getUserProfile();
      expect(profile.weaknesses).toEqual([]);
    });

    test('has empty exercise history', () => {
      const profile = getUserProfile();
      expect(profile.exercisesCompleted).toEqual([]);
    });
  });

  describe('Daily Training Plan', () => {
    test('generates non-empty plan for new user', () => {
      const profile = getUserProfile();
      const plan = generateDailyTrainingPlan(profile);
      expect(plan).toBeDefined();
      expect(plan.tasks).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);
    });

    test('plan has lesson task', () => {
      const profile = getUserProfile();
      const plan = generateDailyTrainingPlan(profile);
      const lessonTasks = plan.tasks.filter(t => t.type === 'lesson');
      expect(lessonTasks.length).toBeGreaterThan(0);
    });

    test('plan has exercise tasks', () => {
      const profile = getUserProfile();
      const plan = generateDailyTrainingPlan(profile);
      const exerciseTasks = plan.tasks.filter(t => t.type === 'exercise');
      expect(exerciseTasks.length).toBeGreaterThan(0);
    });

    test('plan has challenge task', () => {
      const profile = getUserProfile();
      const plan = generateDailyTrainingPlan(profile);
      const challengeTasks = plan.tasks.filter(t => t.type === 'challenge');
      expect(challengeTasks.length).toBeGreaterThan(0);
    });

    test('each task has required fields', () => {
      const profile = getUserProfile();
      const plan = generateDailyTrainingPlan(profile);
      for (const task of plan.tasks) {
        expect(task.type).toBeDefined();
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.reason).toBeDefined();
      }
    });

    test('exercise tasks have skillTag', () => {
      const profile = getUserProfile();
      const plan = generateDailyTrainingPlan(profile);
      const exerciseTasks = plan.tasks.filter(t => t.type === 'exercise');
      for (const task of exerciseTasks) {
        expect(task.skillTag).toBeDefined();
      }
    });
  });

  describe('Exercise Completion', () => {
    test('correct answer updates stats', () => {
      const result = updateExerciseResult({
        exerciseId: 'test-exercise-1',
        isCorrect: true,
        tags: ['tactics', 'fork'],
      });

      expect(result.exerciseStats.total).toBe(1);
      expect(result.exerciseStats.correct).toBe(1);
      expect(result.exerciseStats.wrong).toBe(0);
    });

    test('wrong answer updates stats', () => {
      const result = updateExerciseResult({
        exerciseId: 'test-exercise-2',
        isCorrect: false,
        tags: ['tactics', 'pin'],
      });

      expect(result.exerciseStats.total).toBe(1);
      expect(result.exerciseStats.correct).toBe(0);
      expect(result.exerciseStats.wrong).toBe(1);
    });

    test('correct answer adds to strengths', () => {
      const result = updateExerciseResult({
        exerciseId: 'test-exercise-3',
        isCorrect: true,
        tags: ['mate_1'],
      });

      expect(result.strengths).toContain('mate_1');
    });

    test('wrong answer adds to weaknesses', () => {
      const result = updateExerciseResult({
        exerciseId: 'test-exercise-4',
        isCorrect: false,
        tags: ['pin'],
      });

      expect(result.weaknesses).toContain('pin');
    });
  });

  describe('Game Review Integration', () => {
    test('updateAfterGame increments gamesPlayed', () => {
      const result = updateAfterGame({
        result: 'win',
        movesCount: 40,
        mistakes: [],
      });

      expect(result.gamesPlayed).toBe(1);
    });

    test('updateAfterGame records mistakes', () => {
      const result = updateAfterGame({
        result: 'loss',
        movesCount: 30,
        mistakes: ['poor_development', 'weak_opening'],
      });

      expect(result.commonMistakes).toContain('poor_development');
      expect(result.commonMistakes).toContain('weak_opening');
    });

    test('short game adds development mistakes', () => {
      const result = updateAfterGame({
        result: 'loss',
        movesCount: 10,
        mistakes: [],
      });

      expect(result.commonMistakes).toContain('poor_development');
    });
  });

  describe('Skill Progression', () => {
    test('no level up without sufficient data', () => {
      const result = levelUpIfEligible();
      expect(result.currentLevel).toBe('noob');
    });

    test('accuracy calculation is correct', () => {
      // Simulate 5 correct answers
      for (let i = 0; i < 5; i++) {
        updateExerciseResult({
          exerciseId: `ex-${i}`,
          isCorrect: true,
          tags: ['tactics'],
        });
      }

      const profile = getUserProfile();
      expect(profile.exerciseStats.accuracy).toBe(100);
    });

    test('accuracy updates after wrong answer', () => {
      // 3 correct, 1 wrong
      for (let i = 0; i < 3; i++) {
        updateExerciseResult({
          exerciseId: `ex-correct-${i}`,
          isCorrect: true,
          tags: ['tactics'],
        });
      }
      updateExerciseResult({
        exerciseId: 'ex-wrong-1',
        isCorrect: false,
        tags: ['pin'],
      });

      const profile = getUserProfile();
      expect(profile.exerciseStats.accuracy).toBe(75);
    });
  });

  describe('Corpus Integration', () => {
    test('can get random puzzle', () => {
      const puzzle = getRandomPuzzle();
      expect(puzzle).toBeDefined();
      expect(puzzle?.fen).toBeDefined();
    });

    test('puzzles have required fields', () => {
      const puzzle = getRandomPuzzle();
      if (puzzle) {
        expect(puzzle.fen).toBeDefined();
        expect(puzzle.correctMoves).toBeDefined();
        expect(Array.isArray(puzzle.correctMoves)).toBe(true);
      }
    });

    test('recommendations use corpus', () => {
      const profile = getUserProfile();
      const exercises = getRecommendedExercises(profile);
      expect(Array.isArray(exercises)).toBe(true);
    });
  });
});

describe('Phase 3 Gate Verification', () => {
  beforeEach(() => {
    resetUserProfile();
    loadCorpus();
  }, 60000); // 60s timeout for corpus loading

  test('new user never has 0 tasks', () => {
    const profile = getUserProfile();
    const plan = generateDailyTrainingPlan(profile);
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  test('weaknesses have evidence path', () => {
    // Wrong answer creates weakness
    updateExerciseResult({
      exerciseId: 'test-evidence-1',
      isCorrect: false,
      tags: ['fork'],
    });

    const profile = getUserProfile();
    expect(profile.weaknesses.length).toBeGreaterThan(0);
    expect(profile.weaknesses[0]).toBe('fork');
  });

  test('completing puzzle updates profile', () => {
    updateExerciseResult({
      exerciseId: 'corpus-puzzle-1',
      isCorrect: true,
      tags: ['tactics'],
    });

    const profile = getUserProfile();
    expect(profile.exerciseStats.total).toBe(1);
    expect(profile.exercisesCompleted).toContain('corpus-puzzle-1');
  });

  test('plan schema is canonical', () => {
    const profile = getUserProfile();
    const plan = generateDailyTrainingPlan(profile);

    // Verify structure
    expect(plan.generatedAt).toBeDefined();
    expect(Array.isArray(plan.tasks)).toBe(true);

    // Verify each task
    for (const task of plan.tasks) {
      expect(['lesson', 'exercise', 'opening', 'challenge']).toContain(task.type);
      expect(typeof task.id).toBe('string');
      expect(typeof task.title).toBe('string');
      expect(typeof task.reason).toBe('string');
    }
  });
});
