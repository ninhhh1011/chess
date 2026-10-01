import { beforeEach, describe, expect, test } from 'vitest';
import { assertPersistenceState, createPersistenceState } from '../../../../../src/services/persistenceContract';
import { getUserProfile, recordPuzzleAttemptEvent } from '../../../../../src/services/userProfileService';

const identity = { attemptId: 'attempt:verify-one', puzzleId: 'lichess-00008', sourcePuzzleId: '00008' };
const tags = ['crushing'];
const times = [
  '2026-09-06T07:00:00.000Z',
  '2026-09-06T07:01:00.000Z',
  '2026-09-06T07:02:00.000Z',
  '2026-09-06T07:03:00.000Z',
  '2026-09-06T07:04:00.000Z',
];

function record(eventId: string, type: 'wrong' | 'retry' | 'correct', moveUci: string | null, solved: boolean, at: string) {
  return recordPuzzleAttemptEvent({ ...identity, skillTags: tags, eventId, type, moveUci, solved, at });
}

describe('P3-T06 independent retry workflow', () => {
  beforeEach(() => localStorage.clear());

  test('keeps one ordered attempt and makes retry/intermediate correct plan-stable and non-scoring', () => {
    const initialPlan = getUserProfile().dailyTrainingPlan.planId;
    const wrong = record('event:wrong', 'wrong', 'e6f6', false, times[0]);
    const retry = record('event:retry', 'retry', null, false, times[1]);
    const correctOne = record('event:correct-1', 'correct', 'e6e7', false, times[2]);
    const correctTwo = record('event:correct-2', 'correct', 'b3c1', false, times[3]);
    const solved = record('event:solved', 'correct', 'h6c1', true, times[4]);

    expect(wrong.dailyTrainingPlan.planId).not.toBe(initialPlan);
    expect(retry.dailyTrainingPlan.planId).toBe(wrong.dailyTrainingPlan.planId);
    expect(correctOne.dailyTrainingPlan.planId).toBe(wrong.dailyTrainingPlan.planId);
    expect(correctTwo.dailyTrainingPlan.planId).toBe(wrong.dailyTrainingPlan.planId);
    expect(solved.dailyTrainingPlan.planId).not.toBe(wrong.dailyTrainingPlan.planId);
    expect(retry.persistence.skillStates[0]).toMatchObject({ score: -1, evidenceIds: ['event:wrong'] });
    expect(correctTwo.persistence.skillStates[0]).toMatchObject({ score: -1, evidenceIds: ['event:wrong'] });
    expect(solved.persistence.skillStates[0]).toMatchObject({ score: 0, evidenceIds: ['event:wrong', 'event:solved'] });

    const attempt = solved.persistence.puzzleAttempts[0];
    expect(attempt.attemptId).toBe(identity.attemptId);
    expect(attempt.events.map(({ eventId, type, solved: eventSolved }) => ({ eventId, type, solved: eventSolved }))).toEqual([
      { eventId: 'event:wrong', type: 'wrong', solved: false },
      { eventId: 'event:retry', type: 'retry', solved: false },
      { eventId: 'event:correct-1', type: 'correct', solved: false },
      { eventId: 'event:correct-2', type: 'correct', solved: false },
      { eventId: 'event:solved', type: 'correct', solved: true },
    ]);
    expect(new Set(attempt.events.map(({ eventId }) => eventId)).size).toBe(5);
  });

  test('makes exact solved replay byte-idempotent and rejects every append to the solved attempt', () => {
    record('event:wrong', 'wrong', 'e6f6', false, times[0]);
    record('event:solved', 'correct', 'e6e7', true, times[1]);
    const before = localStorage.getItem('vuaCoUserTrainingProfile');
    const revision = getUserProfile().revision;

    record('event:solved', 'correct', 'e6e7', true, times[1]);
    expect(getUserProfile().revision).toBe(revision);
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(before);

    expect(() => record('event:after-solved', 'retry', null, false, times[2])).toThrow(/already solved/i);
    expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(before);
  });

  test('rejects conflicting identity, provenance, event payload, tags, and event time without mutation', () => {
    record('event:wrong', 'wrong', 'e6f6', false, times[1]);
    const before = localStorage.getItem('vuaCoUserTrainingProfile');
    const invalidCalls = [
      () => recordPuzzleAttemptEvent({ ...identity, puzzleId: 'lichess-0000D', skillTags: tags, eventId: 'event:identity', type: 'retry', moveUci: null, solved: false, at: times[2] }),
      () => recordPuzzleAttemptEvent({ ...identity, sourcePuzzleId: '0000D', skillTags: tags, eventId: 'event:provenance', type: 'retry', moveUci: null, solved: false, at: times[2] }),
      () => recordPuzzleAttemptEvent({ ...identity, skillTags: ['advantage'], eventId: 'event:tags', type: 'retry', moveUci: null, solved: false, at: times[2] }),
      () => record('event:wrong', 'retry', null, false, times[1]),
      () => record('event:earlier', 'retry', null, false, times[0]),
    ];
    invalidCalls.forEach((call) => {
      expect(call).toThrow();
      expect(localStorage.getItem('vuaCoUserTrainingProfile')).toBe(before);
    });
  });

  test('rejects malformed persisted event ordering and solved boundaries', () => {
    const state = createPersistenceState('profile:verify', times[0]);
    const base = {
      schemaVersion: 'puzzleAttempt.v1', ...identity, skillTags: tags,
      createdAt: times[0], updatedAt: times[2],
    };
    const invalidAttempts = [
      { ...base, status: 'in_progress', events: [
        { eventId: 'event:later', type: 'wrong', moveUci: 'e6f6', solved: false, at: times[1] },
        { eventId: 'event:earlier', type: 'retry', moveUci: null, solved: false, at: times[0] },
      ] },
      { ...base, status: 'solved', events: [
        { eventId: 'event:solved', type: 'correct', moveUci: 'e6e7', solved: true, at: times[1] },
        { eventId: 'event:after', type: 'retry', moveUci: null, solved: false, at: times[2] },
      ] },
      { ...base, status: 'solved', puzzleId: 'lichess-other', events: [
        { eventId: 'event:solved', type: 'correct', moveUci: 'e6e7', solved: true, at: times[1] },
      ] },
      { ...base, status: 'in_progress', events: [
        { eventId: 'event:duplicate', type: 'wrong', moveUci: 'e6f6', solved: false, at: times[0] },
        { eventId: 'event:duplicate', type: 'retry', moveUci: null, solved: false, at: times[1] },
      ] },
    ];
    invalidAttempts.forEach((attempt) => expect(() => assertPersistenceState({ ...state, puzzleAttempts: [attempt] })).toThrow(/puzzleAttempts/));
  });
});
