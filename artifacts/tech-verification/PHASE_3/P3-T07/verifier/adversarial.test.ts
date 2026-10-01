import { Chess } from 'chess.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getUserProfile,
  recordGameReview,
  recordPuzzleAttemptEvent,
  saveUserProfile,
  updateExerciseResult,
} from '../../../../../src/services/userProfileService';
import type { AnalysisFactV1 } from '../../../../../src/types/analysis';

const key = 'vuaCoUserTrainingProfile';
const at = '2026-09-06T08:00:00.000Z';

function mistakeFact(): AnalysisFactV1 {
  const game = new Chess();
  const move = game.move('e4');
  return {
    schemaVersion: 'analysis.v1', gameId: 'verify-game', ply: 1, turn: 'w',
    fenBefore: move.before, fenAfter: move.after,
    playedMove: { uci: 'e2e4', san: 'e4', fen: move.after },
    bestMove: { uci: 'e2e4', san: 'e4', fen: move.after },
    evalBefore: { type: 'cp', value: 20, display: '+0.20' },
    evalAfter: { type: 'cp', value: -100, display: '-1.00' },
    centipawnLoss: 120, classification: 'mistake',
    candidates: [{ uci: 'e2e4', san: 'e4', eval: { type: 'cp', value: 20, display: '+0.20' }, pv: ['e2e4'] }],
    skillTags: ['opening_principle'],
    engine: { source: 'stockfish_wasm', version: '18', depth: 8, movetimeMs: 500, multiPv: 1 },
    analyzedAt: at,
  };
}

function recordPuzzleTrace() {
  const identity = { attemptId: 'attempt:persist', puzzleId: 'lichess-00008', sourcePuzzleId: '00008', skillTags: ['crushing'] };
  recordPuzzleAttemptEvent({ ...identity, eventId: 'event:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at });
  recordPuzzleAttemptEvent({ ...identity, eventId: 'event:retry', type: 'retry', moveUci: null, solved: false, at: '2026-09-06T08:01:00.000Z' });
  recordPuzzleAttemptEvent({ ...identity, eventId: 'event:solved', type: 'correct', moveUci: 'e6e7', solved: true, at: '2026-09-06T08:02:00.000Z' });
}

describe('P3-T07 independent local persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('keeps a full cross-entity profile byte-exact across repeated reads without duplicates', () => {
    getUserProfile();
    const fact = mistakeFact();
    recordGameReview({ reviewId: 'review:persist', gameId: fact.gameId, facts: [fact] });
    recordPuzzleTrace();
    const raw = localStorage.getItem(key);
    const original = JSON.parse(raw!);

    for (let index = 0; index < 3; index += 1) {
      const reread = getUserProfile();
      expect(localStorage.getItem(key)).toBe(raw);
      expect(reread.profileId).toBe(original.profileId);
      expect(reread.revision).toBe(original.revision);
      expect(reread.persistence.sync).toMatchObject({
        syncId: `sync:${original.profileId}`, revision: original.revision,
      });
      expect(reread.persistence.gameReviews[0].factIds).toEqual(['verify-game:ply:1']);
      expect(reread.persistence.analysisFacts).toHaveLength(1);
      expect(reread.persistence.puzzleAttempts[0].events).toHaveLength(3);
      expect(new Set(reread.persistence.puzzleAttempts[0].events.map(({ eventId }) => eventId)).size).toBe(3);
      expect(new Set(reread.persistence.trainingPlans.map(({ planId }) => planId)).size).toBe(reread.persistence.trainingPlans.length);
      expect(reread.persistence.trainingPlans).toContainEqual(reread.dailyTrainingPlan);
    }
  });

  test('migrates profile.v1 exactly once and keeps the migrated snapshot stable', () => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 'profile.v1', currentLevel: 'beginner', gamesPlayed: 7,
      lessonsCompleted: ['board'], exercisesCompleted: ['lichess-00008'],
      exerciseStats: { total: 2, correct: 1, wrong: 1, accuracy: 50 },
      commonMistakes: ['fork'], strengths: [], weaknesses: ['fork'], openingStats: {},
      createdAt: at, updatedAt: at,
      dailyTrainingPlan: {
        schemaVersion: 'training.v1', generatedAt: at,
        tasks: [{ type: 'challenge', id: 'daily', title: 'Play', reason: 'Practice' }],
      },
    }));

    const migrated = getUserProfile();
    const migratedRaw = localStorage.getItem(key);
    const reread = getUserProfile();
    expect(migrated).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 7, createdAt: at, updatedAt: at });
    expect(reread.profileId).toBe(migrated.profileId);
    expect(reread.dailyTrainingPlan.planId).toBe(migrated.dailyTrainingPlan.planId);
    expect(localStorage.getItem(key)).toBe(migratedRaw);
  });

  test('preserves malformed bytes and restores a valid snapshot exactly', () => {
    getUserProfile();
    recordPuzzleTrace();
    const durableRaw = localStorage.getItem(key)!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const corruptions = [
      '{"schemaVersion":"profile.v2","profileId":',
      JSON.stringify({ schemaVersion: 'profile.v999', gamesPlayed: 99 }),
      JSON.stringify({ schemaVersion: 'profile.v2', profileId: 'profile:broken', persistence: { schemaVersion: 'learningPersistence.v1', puzzleAttempts: 'broken' } }),
    ];

    corruptions.forEach((raw) => {
      localStorage.setItem(key, raw);
      expect(getUserProfile()).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 0 });
      expect(localStorage.getItem(key)).toBe(raw);
    });
    expect(warn).toHaveBeenCalledTimes(3);

    localStorage.setItem(key, durableRaw);
    const restored = getUserProfile();
    expect(localStorage.getItem(key)).toBe(durableRaw);
    expect(restored.persistence.puzzleAttempts[0].events).toHaveLength(3);
  });

  test('keeps the prior durable bytes on quota and validation failures', () => {
    const durable = getUserProfile();
    const durableRaw = localStorage.getItem(key);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const volatile = updateExerciseResult({ exerciseId: 'volatile', isCorrect: true, tags: ['fork'] });
    expect(volatile.revision).toBe(durable.revision + 1);
    setItem.mockRestore();
    expect(localStorage.getItem(key)).toBe(durableRaw);
    expect(getUserProfile()).toEqual(durable);

    expect(() => saveUserProfile({
      ...durable,
      persistence: { ...durable.persistence, puzzleAttempts: 'broken' },
    })).toThrow(/puzzleAttempts/);
    expect(localStorage.getItem(key)).toBe(durableRaw);
  });
});
