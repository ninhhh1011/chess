import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getUserProfile,
  recordPuzzleAttemptEvent,
  updateExerciseResult,
} from '../services/userProfileService';

const key = 'vuaCoUserTrainingProfile';
const identity = { attemptId: 'attempt:local', puzzleId: 'lichess-00008', sourcePuzzleId: '00008', skillTags: ['crushing'] };

describe('local learning persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('round-trips a complete puzzle learning trace without changing stored bytes', () => {
    getUserProfile();
    recordPuzzleAttemptEvent({ ...identity, eventId: 'event:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at: '2026-09-06T07:00:00.000Z' });
    recordPuzzleAttemptEvent({ ...identity, eventId: 'event:retry', type: 'retry', moveUci: null, solved: false, at: '2026-09-06T07:01:00.000Z' });
    recordPuzzleAttemptEvent({ ...identity, eventId: 'event:solved', type: 'correct', moveUci: 'e6e7', solved: true, at: '2026-09-06T07:02:00.000Z' });

    const raw = localStorage.getItem(key);
    const reloaded = getUserProfile();

    expect(localStorage.getItem(key)).toBe(raw);
    expect(reloaded.persistence.puzzleAttempts[0]).toMatchObject({ attemptId: identity.attemptId, status: 'solved' });
    expect(reloaded.persistence.skillStates[0]).toMatchObject({ skillId: 'crushing', score: 0, evidenceIds: ['event:wrong', 'event:solved'] });
    expect(reloaded.persistence.trainingPlans).toContainEqual(reloaded.dailyTrainingPlan);
    expect(reloaded.persistence.sync.revision).toBe(reloaded.revision);
  });

  test('keeps truncated JSON recoverable instead of replacing its exact bytes', () => {
    const raw = '{"schemaVersion":"profile.v2","profileId":';
    localStorage.setItem(key, raw);

    expect(getUserProfile()).toMatchObject({ schemaVersion: 'profile.v2', gamesPlayed: 0 });
    expect(localStorage.getItem(key)).toBe(raw);
  });

  test('preserves the previous durable snapshot when a write fails', () => {
    const before = getUserProfile();
    const raw = localStorage.getItem(key);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const volatile = updateExerciseResult({ exerciseId: 'not-durable', isCorrect: true, tags: ['fork'] });
    vi.restoreAllMocks();

    expect(volatile.revision).toBe(before.revision + 1);
    expect(localStorage.getItem(key)).toBe(raw);
    expect(getUserProfile()).toEqual(before);
  });
});
