import { beforeEach, describe, expect, test } from 'vitest';
import { createPersistenceState, assertPersistenceState } from '../services/persistenceContract';
import { getUserProfile, updateExerciseResult } from '../services/userProfileService';
import { mergeLocalAndCloudProfile } from '../services/syncService';
import type { AnalysisFactV1 } from '../types/analysis';

const timestamp = '2026-09-06T04:00:00.000Z';

function fact(): AnalysisFactV1 {
  return {
    schemaVersion: 'analysis.v1', gameId: 'game-1', ply: 1, turn: 'w',
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    playedMove: { uci: 'e2e4', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' },
    bestMove: { uci: 'e2e4', san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' },
    evalBefore: { type: 'cp', value: 20, display: '+0.20' },
    evalAfter: { type: 'cp', value: 20, display: '+0.20' },
    centipawnLoss: null, classification: 'best',
    candidates: [{ uci: 'e2e4', san: 'e4', eval: { type: 'cp', value: 20, display: '+0.20' }, pv: ['e2e4'] }],
    skillTags: ['unclassified'],
    engine: { source: 'stockfish_wasm', version: '18', multiPv: 1 }, analyzedAt: timestamp,
  };
}

describe('learning persistence contract', () => {
  beforeEach(() => localStorage.clear());

  test('round-trips versioned review, fact, attempt, skill, plan, and sync entities', () => {
    const state = createPersistenceState('profile-1', timestamp);
    const populated = assertPersistenceState({
      ...state,
      gameReviews: [{
        schemaVersion: 'gameReview.v1', reviewId: 'review-1', gameId: 'game-1',
        factIds: ['game-1:ply:1'], createdAt: timestamp, updatedAt: timestamp,
      }],
      analysisFacts: [fact()],
      puzzleAttempts: [{
        schemaVersion: 'puzzleAttempt.v1', attemptId: 'attempt-1', puzzleId: 'lichess-00008',
        sourcePuzzleId: '00008', status: 'in_progress', createdAt: timestamp, updatedAt: timestamp,
      }],
      skillStates: [{
        schemaVersion: 'skillState.v1', skillId: 'unclassified', score: 0,
        evidenceIds: ['game-1:ply:1'], createdAt: timestamp, updatedAt: timestamp,
      }],
      trainingPlans: [{
        schemaVersion: 'training.v1', planId: 'plan-1', generatedAt: timestamp, updatedAt: timestamp,
        tasks: [{
          type: 'exercise', id: 'fork', title: 'Fork', reason: 'Evidence', skillTag: 'unclassified',
          evidenceIds: ['game-1:ply:1'],
        }],
      }],
    });

    expect(assertPersistenceState(JSON.parse(JSON.stringify(populated)))).toEqual(populated);
    expect(populated.sync).toMatchObject({ schemaVersion: 'sync.v1', syncId: 'sync:profile-1', revision: 0 });
  });

  test('migrates profile.v1 without losing progress or changing identity and timestamps on read', () => {
    localStorage.setItem('vuaCoUserTrainingProfile', JSON.stringify({
      schemaVersion: 'profile.v1', currentLevel: 'beginner', gamesPlayed: 7,
      lessonsCompleted: ['board'], exercisesCompleted: ['lichess-00008'],
      exerciseStats: { total: 2, correct: 1, wrong: 1, accuracy: 50 },
      commonMistakes: ['fork'], strengths: [], weaknesses: ['fork'],
      openingStats: {}, createdAt: timestamp, updatedAt: timestamp,
      dailyTrainingPlan: {
        schemaVersion: 'training.v1', generatedAt: timestamp,
        tasks: [{ type: 'challenge', id: 'daily', title: 'Play', reason: 'Practice' }],
      },
    }));

    const migrated = getUserProfile();
    const reloaded = getUserProfile();

    expect(migrated).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 7, createdAt: timestamp, updatedAt: timestamp });
    expect(migrated.lessonsCompleted).toEqual(['board']);
    expect(migrated.exercisesCompleted).toEqual(['lichess-00008']);
    expect(migrated.profileId).toBe(reloaded.profileId);
    expect(migrated.updatedAt).toBe(reloaded.updatedAt);
    expect(migrated.revision).toBe(reloaded.revision);
    expect(migrated.persistence.profileId).toBe(migrated.profileId);
    expect(migrated.dailyTrainingPlan.planId).toBe(reloaded.dailyTrainingPlan.planId);
    expect(JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')!).schemaVersion).toBe('profile.v2');
  });

  test('rejects an unsupported persisted schema without overwriting the original bytes', () => {
    const raw = JSON.stringify({ schemaVersion: 'profile.v999', gamesPlayed: 99 });
    localStorage.setItem('vuaCoUserTrainingProfile', raw);

    expect(getUserProfile()).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 0 });
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(raw);
  });

  test('rejects malformed entity state', () => {
    const state = createPersistenceState('profile-1', timestamp);
    expect(() => assertPersistenceState({
      ...state,
      puzzleAttempts: [{ schemaVersion: 'puzzleAttempt.v1', attemptId: '', createdAt: 'invalid' }],
    })).toThrow(/puzzleAttempts/);
  });

  test('rejects a game review that references evidence from another game', () => {
    const state = createPersistenceState('profile-1', timestamp);
    expect(() => assertPersistenceState({
      ...state,
      analysisFacts: [fact()],
      gameReviews: [{
        schemaVersion: 'gameReview.v1', reviewId: 'review-1', gameId: 'game-2',
        factIds: ['game-1:ply:1'], createdAt: timestamp, updatedAt: timestamp,
      }],
    })).toThrow(/gameReviews\[0\]\.factIds/);
  });

  test('rejects skill state without a unique persisted evidence trace or valid time range', () => {
    const state = createPersistenceState('profile-1', timestamp);
    for (const skillState of [
      {
        schemaVersion: 'skillState.v1', skillId: 'unclassified', score: -1,
        evidenceIds: ['missing:evidence'], createdAt: timestamp, updatedAt: timestamp,
      },
      {
        schemaVersion: 'skillState.v1', skillId: 'unclassified', score: -1,
        evidenceIds: ['game-1:ply:1', 'game-1:ply:1'], createdAt: timestamp, updatedAt: timestamp,
      },
      {
        schemaVersion: 'skillState.v1', skillId: 'unclassified', score: -1,
        evidenceIds: ['game-1:ply:1'], createdAt: '2026-09-06T05:00:00.000Z', updatedAt: timestamp,
      },
    ]) {
      expect(() => assertPersistenceState({ ...state, analysisFacts: [fact()], skillStates: [skillState] }))
        .toThrow(/skillStates/);
    }
  });

  test('rejects an evidence ID shared by analysis and puzzle events', () => {
    const state = createPersistenceState('profile-1', timestamp);
    expect(() => assertPersistenceState({
      ...state,
      analysisFacts: [fact()],
      puzzleAttempts: [{
        schemaVersion: 'puzzleAttempt.v1', attemptId: 'attempt-1', puzzleId: 'lichess-00008',
        sourcePuzzleId: '00008', status: 'in_progress', skillTags: ['unclassified'],
        createdAt: timestamp, updatedAt: timestamp,
        events: [{
          eventId: 'game-1:ply:1', type: 'wrong', moveUci: 'e6f6', solved: false, at: timestamp,
        }],
      }],
    })).toThrow(/evidence/i);
  });

  test('rejects training task evidence without a matching skill trace and inverted plan time', () => {
    const state = createPersistenceState('profile-1', timestamp);
    const base = {
      schemaVersion: 'training.v1', planId: 'plan-1', generatedAt: timestamp, updatedAt: timestamp,
    };
    for (const plan of [
      { ...base, tasks: [{
        type: 'exercise', id: 'task', title: 'Task', reason: 'Evidence',
        skillTag: 'unclassified', evidenceIds: ['missing:evidence'],
      }] },
      { ...base, updatedAt: '2026-09-06T03:00:00.000Z', tasks: [{
        type: 'challenge', id: 'task', title: 'Task', reason: 'Play',
      }] },
    ]) {
      expect(() => assertPersistenceState({
        ...state,
        analysisFacts: [fact()],
        skillStates: [{
          schemaVersion: 'skillState.v1', skillId: 'unclassified', score: -1,
          evidenceIds: ['game-1:ply:1'], createdAt: timestamp, updatedAt: timestamp,
        }],
        trainingPlans: [plan],
      })).toThrow(/trainingPlans/);
    }
  });

  test('keeps malformed profile.v2 bytes recoverable instead of overwriting them', () => {
    const raw = JSON.stringify({
      schemaVersion: 'profile.v2', profileId: 'profile-broken',
      persistence: { schemaVersion: 'learningPersistence.v1', puzzleAttempts: 'broken' },
    });
    localStorage.setItem('vuaCoUserTrainingProfile', raw);

    expect(getUserProfile()).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 0 });
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(raw);
  });

  test('increments the profile and sync revision exactly once for a mutation', () => {
    const before = getUserProfile();
    const after = updateExerciseResult({ exerciseId: 'fixture', isCorrect: true, tags: ['fork'] });

    expect(after.revision).toBe(before.revision + 1);
    expect(after.persistence.sync.revision).toBe(after.revision);
    expect(Date.parse(after.updatedAt)).toBeGreaterThanOrEqual(Date.parse(before.updatedAt));
    expect(getUserProfile().revision).toBe(after.revision);
  });

  test('migrates cloud and local profiles before resolving a sync conflict', () => {
    const legacy = {
      schemaVersion: 'profile.v1', currentLevel: 'noob', gamesPlayed: 1,
      lessonsCompleted: [], exercisesCompleted: [], exerciseStats: {},
      commonMistakes: [], strengths: [], weaknesses: [], openingStats: {},
      createdAt: '2026-09-06T01:00:00.000Z', updatedAt: '2026-09-06T02:00:00.000Z',
    };
    const merged = mergeLocalAndCloudProfile(legacy, {
      updated_at: '2026-09-06T03:00:00.000Z',
      profile_data: { ...legacy, gamesPlayed: 3, updatedAt: '2026-09-06T03:00:00.000Z' },
    });

    expect(merged).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 3 });
    expect(merged.persistence).toMatchObject({ schemaVersion: 'learningPersistence.v1' });
    expect(merged.persistence.sync.syncId).toBe(`sync:${merged.profileId}`);
  });
});
