import { beforeEach, describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import { assertPersistenceState, createPersistenceState } from '../../../../../src/services/persistenceContract';
import {
  getUserProfile,
  recordGameReview,
  recordPuzzleAttemptEvent,
  saveUserProfile,
} from '../../../../../src/services/userProfileService';
import type { AnalysisFactV1 } from '../../../../../src/types/analysis';

const storageKey = 'vuaCoUserTrainingProfile';
const t0 = '2026-09-06T06:00:00.000Z';
const t1 = '2026-09-06T06:01:00.000Z';
const t2 = '2026-09-06T06:02:00.000Z';
const t3 = '2026-09-06T06:03:00.000Z';

function fact(overrides: Partial<AnalysisFactV1> = {}): AnalysisFactV1 {
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
    skillTags: ['opening_principle', 'tactical_oversight'],
    engine: { source: 'stockfish_wasm', version: '18', depth: 8, movetimeMs: 500, multiPv: 1 },
    analyzedAt: t0,
    ...overrides,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe('independent P3-T04 adversarial acceptance', () => {
  beforeEach(() => localStorage.clear());

  test('review mistake creates exact fact-backed skill traces and exact replay is byte/revision stable', () => {
    const input = fact();
    const first = recordGameReview({ reviewId: 'review-verify', gameId: input.gameId, facts: [input] });
    const firstRaw = localStorage.getItem(storageKey);
    const evidenceId = 'verify-game:ply:1';

    expect(first.persistence.skillStates).toEqual(input.skillTags.map((skillId) => expect.objectContaining({
      schemaVersion: 'skillState.v1', skillId, score: -1, evidenceIds: [evidenceId],
    })));
    for (const state of first.persistence.skillStates) {
      const matchingFacts = first.persistence.analysisFacts.filter((item) =>
        `${item.gameId}:ply:${item.ply}` === state.evidenceIds[0] && item.skillTags.includes(state.skillId));
      expect(matchingFacts).toHaveLength(1);
    }

    const second = recordGameReview({ reviewId: 'review-verify', gameId: input.gameId, facts: [input] });
    expect(second.revision).toBe(first.revision);
    expect(localStorage.getItem(storageKey)).toBe(firstRaw);
  });

  test('wrong/final affect every tag once while retry/intermediate correct do not inflate skill trace', () => {
    const identity = { attemptId: 'verify-attempt', puzzleId: 'lichess-00008', sourcePuzzleId: '00008' };
    const skillTags = ['crushing', 'hangingPiece', 'long', 'middlegame'];
    recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'verify:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at: t0 });
    const afterWrong = clone(getUserProfile().persistence.skillStates);
    expect(afterWrong).toEqual(skillTags.map((skillId) => expect.objectContaining({
      skillId, score: -1, evidenceIds: ['verify:wrong'], createdAt: t0, updatedAt: t0,
    })));

    recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'verify:retry', type: 'retry', moveUci: null, solved: false, at: t1 });
    expect(getUserProfile().persistence.skillStates).toEqual(afterWrong);
    recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'verify:correct-1', type: 'correct', moveUci: 'e6e7', solved: false, at: t2 });
    expect(getUserProfile().persistence.skillStates).toEqual(afterWrong);
    const final = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'verify:solved', type: 'correct', moveUci: 'b3c1', solved: true, at: t3 });

    expect(final.persistence.skillStates).toEqual(skillTags.map((skillId) => expect.objectContaining({
      skillId, score: 0, evidenceIds: ['verify:wrong', 'verify:solved'], createdAt: t0, updatedAt: t3,
    })));
    const attempt = final.persistence.puzzleAttempts[0];
    for (const state of final.persistence.skillStates) {
      for (const evidenceId of state.evidenceIds) {
        expect(attempt.events.filter((event) => event.eventId === evidenceId)).toHaveLength(1);
        expect(attempt.skillTags).toContain(state.skillId);
      }
    }

    const raw = localStorage.getItem(storageKey);
    const revision = final.revision;
    const repeated = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'verify:solved', type: 'correct', moveUci: 'b3c1', solved: true, at: t3 });
    expect(repeated.revision).toBe(revision);
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });

  test('rejects malformed/ambiguous traces and invalid score/tags/timestamps without stored-byte mutation', () => {
    const identity = { attemptId: 'verify-attempt', puzzleId: 'lichess-00008', sourcePuzzleId: '00008' };
    const valid = recordPuzzleAttemptEvent({ ...identity, skillTags: ['advantage'], eventId: 'event:one', type: 'wrong', moveUci: 'e6f6', solved: false, at: t0 });
    const raw = localStorage.getItem(storageKey);
    const badStates = [
      { ...clone(valid), persistence: { ...clone(valid.persistence), skillStates: [{ ...clone(valid.persistence.skillStates[0]), evidenceIds: ['missing'] }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), skillStates: [{ ...clone(valid.persistence.skillStates[0]), evidenceIds: ['event:one', 'event:one'] }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), skillStates: [{ ...clone(valid.persistence.skillStates[0]), skillId: 'wrong-tag' }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), skillStates: [{ ...clone(valid.persistence.skillStates[0]), score: Number.POSITIVE_INFINITY }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), skillStates: [{ ...clone(valid.persistence.skillStates[0]), updatedAt: 'September 6, 2026' }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), skillStates: [{ ...clone(valid.persistence.skillStates[0]), createdAt: t1, updatedAt: t0 }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), puzzleAttempts: [{ ...clone(valid.persistence.puzzleAttempts[0]), skillTags: ['advantage', 'advantage'] }] } },
      { ...clone(valid), persistence: { ...clone(valid.persistence), puzzleAttempts: [{ ...clone(valid.persistence.puzzleAttempts[0]), skillTags: [''] }] } },
    ];
    for (const candidate of badStates) {
      expect(() => saveUserProfile(candidate, { preserveTimestamps: true })).toThrow();
      expect(localStorage.getItem(storageKey)).toBe(raw);
    }

    const withoutSkills = { ...clone(valid.persistence), skillStates: [] };
    expect(() => assertPersistenceState({
      ...withoutSkills,
      puzzleAttempts: [
        withoutSkills.puzzleAttempts[0],
        { ...clone(withoutSkills.puzzleAttempts[0]), attemptId: 'attempt-two' },
      ],
    })).toThrow(/events duplicate ID/);

    expect(() => assertPersistenceState({
      ...withoutSkills,
      puzzleAttempts: [{
        ...clone(withoutSkills.puzzleAttempts[0]),
        events: [{ ...clone(withoutSkills.puzzleAttempts[0].events[0]), eventId: 'verify-game:ply:1' }],
      }],
      analysisFacts: [fact()],
    })).toThrow(/evidence duplicate ID/);
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });

  test('normalizes legacy attempts with omitted events and skill tags', () => {
    const state = createPersistenceState('profile:legacy', t0);
    const normalized = assertPersistenceState({
      ...state,
      puzzleAttempts: [{
        schemaVersion: 'puzzleAttempt.v1', attemptId: 'legacy-attempt', puzzleId: 'lichess-00008',
        sourcePuzzleId: '00008', status: 'in_progress', createdAt: t0, updatedAt: t0,
      }],
    });
    expect(normalized.puzzleAttempts[0]).toMatchObject({ events: [], skillTags: [] });
  });
});
