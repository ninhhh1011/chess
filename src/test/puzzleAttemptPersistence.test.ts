import { beforeEach, describe, expect, test } from 'vitest';
import { assertPersistenceState, createPersistenceState } from '../services/persistenceContract';
import { getUserProfile, recordPuzzleAttemptEvent } from '../services/userProfileService';

const startedAt = '2026-09-06T06:00:00.000Z';
const retriedAt = '2026-09-06T06:01:00.000Z';
const continuedAt = '2026-09-06T06:01:30.000Z';
const solvedAt = '2026-09-06T06:02:00.000Z';
const identity = { attemptId: 'attempt:one', puzzleId: 'lichess-00008', sourcePuzzleId: '00008' };

describe('puzzle attempt persistence', () => {
  beforeEach(() => localStorage.clear());

  test('records wrong, retry, and correct moves once under one provenance-backed attempt', () => {
    const skillTags = ['advantage'];
    const initialPlanId = getUserProfile().dailyTrainingPlan.planId;
    const afterWrong = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'event:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at: startedAt });
    const afterRetry = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'event:retry', type: 'retry', moveUci: null, solved: false, at: retriedAt });
    const afterIntermediate = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'event:correct-1', type: 'correct', moveUci: 'e6e7', solved: false, at: continuedAt });
    const afterSolved = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'event:correct-2', type: 'correct', moveUci: 'b3c1', solved: true, at: solvedAt });
    expect(afterWrong.dailyTrainingPlan.planId).not.toBe(initialPlanId);
    expect(afterWrong.dailyTrainingPlan.tasks.find((task: { type: string }) => task.type === 'exercise')).toMatchObject({
      skillTag: 'advantage', evidenceIds: ['event:wrong'],
    });
    expect(afterRetry.dailyTrainingPlan.planId).toBe(afterWrong.dailyTrainingPlan.planId);
    expect(afterIntermediate.dailyTrainingPlan.planId).toBe(afterWrong.dailyTrainingPlan.planId);
    expect(afterSolved.dailyTrainingPlan.planId).not.toBe(afterWrong.dailyTrainingPlan.planId);
    const beforeRepeat = localStorage.getItem('vuaCoUserTrainingProfile');
    const revision = getUserProfile().revision;

    recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'event:correct-2', type: 'correct', moveUci: 'b3c1', solved: true, at: solvedAt });
    const profile = getUserProfile();

    expect(profile.revision).toBe(revision);
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(beforeRepeat);
    expect(profile.persistence.puzzleAttempts).toEqual([expect.objectContaining({
      schemaVersion: 'puzzleAttempt.v1', ...identity, status: 'solved',
      createdAt: startedAt, updatedAt: solvedAt,
      events: [
        { eventId: 'event:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at: startedAt },
        { eventId: 'event:retry', type: 'retry', moveUci: null, solved: false, at: retriedAt },
        { eventId: 'event:correct-1', type: 'correct', moveUci: 'e6e7', solved: false, at: continuedAt },
        { eventId: 'event:correct-2', type: 'correct', moveUci: 'b3c1', solved: true, at: solvedAt },
      ],
    })]);
    expect(profile.persistence.skillStates).toEqual([expect.objectContaining({
      schemaVersion: 'skillState.v1', skillId: 'advantage', score: 0,
      evidenceIds: ['event:wrong', 'event:correct-2'], createdAt: startedAt, updatedAt: solvedAt,
    })]);
    expect(profile.persistence.trainingPlans.map(({ planId }: { planId: string }) => planId)).toContain(profile.dailyTrainingPlan.planId);
  });

  test('rejects invalid provenance and moves without changing stored bytes', () => {
    const before = localStorage.getItem('vuaCoUserTrainingProfile');
    expect(() => recordPuzzleAttemptEvent({
      ...identity, sourcePuzzleId: 'other', eventId: 'event:bad', type: 'wrong', moveUci: 'bad', solved: false, at: startedAt,
    })).toThrow(/puzzleAttempts|puzzle attempt/i);
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(before);
    expect(() => recordPuzzleAttemptEvent({
      ...identity, skillTags: [''], eventId: 'event:bad-tag', type: 'wrong', moveUci: 'e6f6', solved: false, at: startedAt,
    })).toThrow(/skill/i);
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(before);
  });

  test('migrates old empty-event records and rejects duplicate event identities', () => {
    const state = createPersistenceState('profile-1', startedAt);
    const legacy = assertPersistenceState({
      ...state,
      puzzleAttempts: [{
        schemaVersion: 'puzzleAttempt.v1', ...identity, status: 'in_progress',
        createdAt: startedAt, updatedAt: startedAt,
      }],
    });
    expect(legacy.puzzleAttempts[0].events).toEqual([]);

    expect(() => assertPersistenceState({
      ...state,
      puzzleAttempts: [{
        schemaVersion: 'puzzleAttempt.v1', ...identity, status: 'in_progress',
        createdAt: startedAt, updatedAt: retriedAt,
        events: [
          { eventId: 'event:one', type: 'wrong', moveUci: 'e6f6', solved: false, at: startedAt },
          { eventId: 'event:one', type: 'retry', moveUci: null, solved: false, at: retriedAt },
        ],
      }],
    })).toThrow(/duplicate event ID/);
  });

  test.each([
    ['a solved event that is not final', {
      status: 'solved', createdAt: startedAt, updatedAt: retriedAt,
      events: [
        { eventId: 'event:solved', type: 'correct', moveUci: 'e6e7', solved: true, at: startedAt },
        { eventId: 'event:after', type: 'retry', moveUci: null, solved: false, at: retriedAt },
      ],
    }],
    ['non-monotonic event timestamps', {
      status: 'in_progress', createdAt: startedAt, updatedAt: solvedAt,
      events: [
        { eventId: 'event:later', type: 'wrong', moveUci: 'e6f6', solved: false, at: retriedAt },
        { eventId: 'event:earlier', type: 'retry', moveUci: null, solved: false, at: startedAt },
      ],
    }],
    ['multiple solved events', {
      status: 'solved', createdAt: startedAt, updatedAt: solvedAt,
      events: [
        { eventId: 'event:solved-1', type: 'correct', moveUci: 'e6e7', solved: true, at: startedAt },
        { eventId: 'event:solved-2', type: 'correct', moveUci: 'b3c1', solved: true, at: solvedAt },
      ],
    }],
    ['an inverted empty legacy time range', {
      status: 'in_progress', createdAt: retriedAt, updatedAt: startedAt, events: [],
    }],
  ])('rejects %s', (_name, attempt) => {
    const state = createPersistenceState('profile-1', startedAt);
    expect(() => assertPersistenceState({
      ...state,
      puzzleAttempts: [{ schemaVersion: 'puzzleAttempt.v1', ...identity, ...attempt }],
    })).toThrow(/puzzleAttempts/);
  });
});
