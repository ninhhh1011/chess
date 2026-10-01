import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Chess } from 'chess.js';
import { generateDailyTrainingPlan } from '../../../../../src/services/recommendationService';
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

function fact(): AnalysisFactV1 {
  const game = new Chess();
  const move = game.move('e4');
  return {
    schemaVersion: 'analysis.v1', gameId: 'plan-game', ply: 1, turn: 'w',
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
  };
}

const exercise = (profile: ReturnType<typeof getUserProfile>) =>
  profile.dailyTrainingPlan.tasks.find((task: { type: string }) => task.type === 'exercise');

describe('independent P3-T05 adversarial acceptance', () => {
  beforeEach(() => localStorage.clear());

  test('zero-data plan is canonical, nonempty, uniquely persisted, and reload-stable', () => {
    const profile = getUserProfile();
    expect(profile.dailyTrainingPlan).toMatchObject({ schemaVersion: 'training.v1' });
    expect(profile.dailyTrainingPlan.planId).toMatch(/^plan:/);
    expect(new Date(profile.dailyTrainingPlan.generatedAt).toISOString()).toBe(profile.dailyTrainingPlan.generatedAt);
    expect(profile.dailyTrainingPlan.updatedAt).toBe(profile.dailyTrainingPlan.generatedAt);
    expect(profile.dailyTrainingPlan.tasks.length).toBeGreaterThan(0);
    expect(profile.dailyTrainingPlan.tasks.some((task: { type: string }) => task.type === 'exercise')).toBe(true);
    expect(profile.persistence.trainingPlans.filter((plan) => plan.planId === profile.dailyTrainingPlan.planId)).toHaveLength(1);
    const raw = localStorage.getItem(storageKey);
    expect(getUserProfile().dailyTrainingPlan.planId).toBe(profile.dailyTrainingPlan.planId);
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });

  test('tie ordering is deterministic and review mutation regenerates the exact evidence-backed priority', () => {
    vi.spyOn(String.prototype, 'localeCompare');
    const tied = {
      currentLevel: 'noob',
      persistence: { skillStates: [
        { skillId: 'zeta', score: -2, evidenceIds: ['z'] },
        { skillId: 'alpha', score: -2, evidenceIds: ['a'] },
      ] },
    };
    expect(generateDailyTrainingPlan(tied).tasks.find((task) => task.type === 'exercise')).toMatchObject({
      id: 'skill:alpha', skillTag: 'alpha', evidenceIds: ['a'],
    });
    expect(generateDailyTrainingPlan({ ...tied, persistence: { skillStates: [...tied.persistence.skillStates].reverse() } })
      .tasks.find((task) => task.type === 'exercise')).toMatchObject({ id: 'skill:alpha' });

    const initial = getUserProfile();
    const reviewed = recordGameReview({ reviewId: 'review-plan', gameId: 'plan-game', facts: [fact()] });
    expect(reviewed.dailyTrainingPlan.planId).not.toBe(initial.dailyTrainingPlan.planId);
    expect(exercise(reviewed)).toMatchObject({
      id: 'skill:opening_principle', skillTag: 'opening_principle', evidenceIds: ['plan-game:ply:1'],
    });
    const raw = localStorage.getItem(storageKey);
    const revision = reviewed.revision;
    const replay = recordGameReview({ reviewId: 'review-plan', gameId: 'plan-game', facts: [fact()] });
    expect(replay.revision).toBe(revision);
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });

  test('wrong/solved regenerate while retry/intermediate and exact event replay preserve the plan', () => {
    const identity = { attemptId: 'plan-attempt', puzzleId: 'lichess-00008', sourcePuzzleId: '00008' };
    const skillTags = ['crushing', 'hangingPiece', 'long', 'middlegame'];
    const initial = getUserProfile();
    const wrong = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'plan:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at: t0 });
    expect(wrong.dailyTrainingPlan.planId).not.toBe(initial.dailyTrainingPlan.planId);
    expect(exercise(wrong)).toMatchObject({ id: 'skill:crushing', skillTag: 'crushing', evidenceIds: ['plan:wrong'] });
    const retry = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'plan:retry', type: 'retry', moveUci: null, solved: false, at: t1 });
    const intermediate = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'plan:middle', type: 'correct', moveUci: 'e6e7', solved: false, at: t2 });
    expect(retry.dailyTrainingPlan.planId).toBe(wrong.dailyTrainingPlan.planId);
    expect(intermediate.dailyTrainingPlan.planId).toBe(wrong.dailyTrainingPlan.planId);
    const solved = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'plan:solved', type: 'correct', moveUci: 'b3c1', solved: true, at: t3 });
    expect(solved.dailyTrainingPlan.planId).not.toBe(wrong.dailyTrainingPlan.planId);
    expect(exercise(solved)).toMatchObject({ evidenceIds: ['plan:wrong', 'plan:solved'] });
    expect(new Set(solved.persistence.trainingPlans.map((plan) => plan.planId)).size).toBe(solved.persistence.trainingPlans.length);
    expect(solved.persistence.trainingPlans.filter((plan) => plan.planId === solved.dailyTrainingPlan.planId)).toHaveLength(1);
    const raw = localStorage.getItem(storageKey);
    const revision = solved.revision;
    const replay = recordPuzzleAttemptEvent({ ...identity, skillTags, eventId: 'plan:solved', type: 'correct', moveUci: 'b3c1', solved: true, at: t3 });
    expect(replay.revision).toBe(revision);
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });

  test('rejects malformed, dangling, duplicate, and mismatched plan traces without storage mutation', () => {
    const identity = { attemptId: 'plan-attempt', puzzleId: 'lichess-00008', sourcePuzzleId: '00008' };
    const valid = recordPuzzleAttemptEvent({ ...identity, skillTags: ['crushing'], eventId: 'plan:wrong', type: 'wrong', moveUci: 'e6f6', solved: false, at: t0 });
    const raw = localStorage.getItem(storageKey);
    const plan = structuredClone(valid.dailyTrainingPlan);
    const taskIndex = plan.tasks.findIndex((task: { type: string }) => task.type === 'exercise');
    const candidates = [
      { ...plan, tasks: plan.tasks.map((task: object, index: number) => index === taskIndex ? { ...task, type: 'invalid' } : task) },
      { ...plan, generatedAt: t1, updatedAt: t0 },
      { ...plan, tasks: plan.tasks.map((task: object, index: number) => index === taskIndex ? { ...task, evidenceIds: ['missing'] } : task) },
      { ...plan, tasks: plan.tasks.map((task: object, index: number) => index === taskIndex ? { ...task, evidenceIds: ['plan:wrong', 'plan:wrong'] } : task) },
      { ...plan, tasks: plan.tasks.map((task: object, index: number) => index === taskIndex ? { ...task, skillTag: 'other' } : task) },
    ];
    for (const badPlan of candidates) {
      const bad = structuredClone(valid);
      bad.dailyTrainingPlan = badPlan;
      bad.persistence.trainingPlans = bad.persistence.trainingPlans.map((item) => item.planId === plan.planId ? badPlan : item);
      expect(() => saveUserProfile(bad, { preserveTimestamps: true })).toThrow(/trainingPlans/);
      expect(localStorage.getItem(storageKey)).toBe(raw);
    }
    const duplicate = structuredClone(valid);
    duplicate.persistence.trainingPlans.push(structuredClone(plan));
    expect(() => saveUserProfile(duplicate, { preserveTimestamps: true })).toThrow(/trainingPlans duplicate ID/);
    expect(localStorage.getItem(storageKey)).toBe(raw);
  });
});
