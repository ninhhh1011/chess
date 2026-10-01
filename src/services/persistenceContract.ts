import type { AnalysisFactV1 } from '../types/analysis';
import { assertAnalysisFactV1, getAnalysisFactEvidenceId } from './analysis/analysisFact';

export const PERSISTENCE_SCHEMA_VERSION = 'learningPersistence.v1' as const;
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

type Timestamped = { createdAt: string; updatedAt: string };
type GameReviewRecord = Timestamped & {
  schemaVersion: 'gameReview.v1'; reviewId: string; gameId: string; factIds: string[];
};
type PuzzleAttemptRecord = Timestamped & {
  schemaVersion: 'puzzleAttempt.v1'; attemptId: string; puzzleId: string; sourcePuzzleId: string;
  status: 'in_progress' | 'solved' | 'abandoned'; skillTags: string[];
  events: Array<{
    eventId: string; type: 'wrong' | 'retry' | 'correct'; moveUci: string | null; solved: boolean; at: string;
  }>;
};
type SkillStateRecord = Timestamped & {
  schemaVersion: 'skillState.v1'; skillId: string; score: number; evidenceIds: string[];
};
type TrainingPlanRecord = {
  schemaVersion: 'training.v1'; planId: string; generatedAt: string; updatedAt: string;
  tasks: Array<{ type: string; id: string; title: string; reason: string; skillTag?: string; evidenceIds?: string[] }>;
};

export interface LearningPersistenceV1 {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  profileId: string;
  gameReviews: GameReviewRecord[];
  analysisFacts: AnalysisFactV1[];
  puzzleAttempts: PuzzleAttemptRecord[];
  skillStates: SkillStateRecord[];
  trainingPlans: TrainingPlanRecord[];
  sync: {
    schemaVersion: 'sync.v1'; syncId: string; revision: number; updatedAt: string; lastSyncedAt: string | null;
  };
}

function fail(field: string): never {
  throw new Error(`Invalid learningPersistence.v1 ${field}`);
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field);
  return value as Record<string, unknown>;
}

function id(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(field);
  return value;
}

function iso(value: unknown, field: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) fail(field);
  return value;
}

function ids(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim())) fail(field);
  return value;
}

function unique(items: unknown[], key: (item: unknown) => string, field: string): void {
  const values = items.map(key);
  if (new Set(values).size !== values.length) fail(`${field} duplicate ID`);
}

export function createPersistenceState(profileId: string, now = new Date().toISOString()): LearningPersistenceV1 {
  id(profileId, 'profileId');
  iso(now, 'sync.updatedAt');
  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    profileId,
    gameReviews: [],
    analysisFacts: [],
    puzzleAttempts: [],
    skillStates: [],
    trainingPlans: [],
    sync: { schemaVersion: 'sync.v1', syncId: `sync:${profileId}`, revision: 0, updatedAt: now, lastSyncedAt: null },
  };
}

export function assertPersistenceState(value: unknown): LearningPersistenceV1 {
  const state = object(value, '$');
  if (state.schemaVersion !== PERSISTENCE_SCHEMA_VERSION) fail('schemaVersion');
  const profileId = id(state.profileId, 'profileId');
  for (const field of ['gameReviews', 'analysisFacts', 'puzzleAttempts', 'skillStates', 'trainingPlans']) {
    if (!Array.isArray(state[field])) fail(field);
  }

  const facts = (state.analysisFacts as unknown[]).map((fact, index) => {
    try { return assertAnalysisFactV1(fact); } catch { return fail(`analysisFacts[${index}]`); }
  });
  unique(facts, (fact) => getAnalysisFactEvidenceId(fact as AnalysisFactV1), 'analysisFacts');
  const factsByEvidenceId = new Map(facts.map((fact) => [getAnalysisFactEvidenceId(fact), fact]));

  const reviews = (state.gameReviews as unknown[]).map((value, index) => {
    const item = object(value, `gameReviews[${index}]`);
    if (item.schemaVersion !== 'gameReview.v1') fail(`gameReviews[${index}].schemaVersion`);
    const factIds = ids(item.factIds, `gameReviews[${index}].factIds`);
    if (!factIds.length) fail(`gameReviews[${index}].factIds`);
    id(item.reviewId, `gameReviews[${index}].reviewId`);
    const gameId = id(item.gameId, `gameReviews[${index}].gameId`);
    factIds.forEach((factId) => {
      if (factsByEvidenceId.get(factId)?.gameId !== gameId) fail(`gameReviews[${index}].factIds`);
    });
    iso(item.createdAt, `gameReviews[${index}].createdAt`);
    iso(item.updatedAt, `gameReviews[${index}].updatedAt`);
    return item as unknown as GameReviewRecord;
  });
  unique(reviews, (item) => (item as GameReviewRecord).reviewId, 'gameReviews');

  const attempts = (state.puzzleAttempts as unknown[]).map((value, index) => {
    const item = object(value, `puzzleAttempts[${index}]`);
    if (item.schemaVersion !== 'puzzleAttempt.v1' || !['in_progress', 'solved', 'abandoned'].includes(String(item.status))) {
      fail(`puzzleAttempts[${index}].schemaVersion/status`);
    }
    id(item.attemptId, `puzzleAttempts[${index}].attemptId`);
    const puzzleId = id(item.puzzleId, `puzzleAttempts[${index}].puzzleId`);
    const sourcePuzzleId = id(item.sourcePuzzleId, `puzzleAttempts[${index}].sourcePuzzleId`);
    if (puzzleId !== `lichess-${sourcePuzzleId}`) fail(`puzzleAttempts[${index}].sourcePuzzleId`);
    const skillTags = item.skillTags === undefined ? [] : ids(item.skillTags, `puzzleAttempts[${index}].skillTags`);
    if (new Set(skillTags).size !== skillTags.length) fail(`puzzleAttempts[${index}].skillTags duplicate`);
    const createdAt = iso(item.createdAt, `puzzleAttempts[${index}].createdAt`);
    const updatedAt = iso(item.updatedAt, `puzzleAttempts[${index}].updatedAt`);
    if (Date.parse(createdAt) > Date.parse(updatedAt)) fail(`puzzleAttempts[${index}].timestamps`);
    const eventValues = item.events === undefined ? [] : item.events;
    if (!Array.isArray(eventValues)) fail(`puzzleAttempts[${index}].events`);
    const events = eventValues.map((value, eventIndex) => {
      const event = object(value, `puzzleAttempts[${index}].events[${eventIndex}]`);
      id(event.eventId, `puzzleAttempts[${index}].events[${eventIndex}].eventId`);
      if (!['wrong', 'retry', 'correct'].includes(String(event.type))) {
        fail(`puzzleAttempts[${index}].events[${eventIndex}].type`);
      }
      const at = iso(event.at, `puzzleAttempts[${index}].events[${eventIndex}].at`);
      if (Date.parse(at) < Date.parse(createdAt) || Date.parse(at) > Date.parse(updatedAt)) {
        fail(`puzzleAttempts[${index}].events[${eventIndex}].at`);
      }
      if (event.type === 'retry' ? event.moveUci !== null : typeof event.moveUci !== 'string' || !UCI_MOVE.test(event.moveUci)) {
        fail(`puzzleAttempts[${index}].events[${eventIndex}].moveUci`);
      }
      const solved = event.solved === undefined ? false : event.solved;
      if (typeof solved !== 'boolean' || (event.type !== 'correct' && solved)) {
        fail(`puzzleAttempts[${index}].events[${eventIndex}].solved`);
      }
      return { ...event, solved } as unknown as PuzzleAttemptRecord['events'][number];
    });
    unique(events, (event) => (event as PuzzleAttemptRecord['events'][number]).eventId,
      `puzzleAttempts[${index}].events duplicate event ID`);
    if (events.some((event, eventIndex) => eventIndex > 0
      && Date.parse(event.at) < Date.parse(events[eventIndex - 1].at))) fail(`puzzleAttempts[${index}].events order`);
    const solvedEvents = events.filter((event) => event.solved);
    if (solvedEvents.length > 1 || (solvedEvents.length === 1 && !events.at(-1)?.solved)) {
      fail(`puzzleAttempts[${index}].events solved`);
    }
    if ((item.status === 'solved' && events.length && !solvedEvents.length)
      || (item.status !== 'solved' && solvedEvents.length)) fail(`puzzleAttempts[${index}].status`);
    return { ...item, events, skillTags } as unknown as PuzzleAttemptRecord;
  });
  unique(attempts, (item) => (item as PuzzleAttemptRecord).attemptId, 'puzzleAttempts');
  const eventEvidence = attempts.flatMap((attempt) => attempt.events.map((event) => ({
    evidenceId: event.eventId,
    skillTags: attempt.skillTags,
  })));
  unique(eventEvidence, (item) => (item as { evidenceId: string }).evidenceId, 'puzzleAttempts events');
  const evidenceEntries = [
    ...facts.map((fact) => [getAnalysisFactEvidenceId(fact), new Set(fact.skillTags)] as const),
    ...eventEvidence.map((item) => [item.evidenceId, new Set(item.skillTags)] as const),
  ];
  unique(evidenceEntries, (item) => (item as readonly [string, Set<string>])[0], 'evidence');
  const evidenceSkills = new Map(evidenceEntries);

  const skills = (state.skillStates as unknown[]).map((value, index) => {
    const item = object(value, `skillStates[${index}]`);
    if (item.schemaVersion !== 'skillState.v1' || typeof item.score !== 'number' || !Number.isFinite(item.score)) {
      fail(`skillStates[${index}].schemaVersion/score`);
    }
    const skillId = id(item.skillId, `skillStates[${index}].skillId`);
    const evidenceIds = ids(item.evidenceIds, `skillStates[${index}].evidenceIds`);
    if (!evidenceIds.length || new Set(evidenceIds).size !== evidenceIds.length
      || evidenceIds.some((evidenceId) => !evidenceSkills.get(evidenceId)?.has(skillId))) {
      fail(`skillStates[${index}].evidenceIds`);
    }
    const createdAt = iso(item.createdAt, `skillStates[${index}].createdAt`);
    const updatedAt = iso(item.updatedAt, `skillStates[${index}].updatedAt`);
    if (Date.parse(createdAt) > Date.parse(updatedAt)) fail(`skillStates[${index}].timestamps`);
    return { ...item, evidenceIds } as unknown as SkillStateRecord;
  });
  unique(skills, (item) => (item as SkillStateRecord).skillId, 'skillStates');

  const plans = (state.trainingPlans as unknown[]).map((value, index) => {
    const item = object(value, `trainingPlans[${index}]`);
    if (item.schemaVersion !== 'training.v1' || !Array.isArray(item.tasks) || !item.tasks.length) {
      fail(`trainingPlans[${index}].schemaVersion/tasks`);
    }
    id(item.planId, `trainingPlans[${index}].planId`);
    const generatedAt = iso(item.generatedAt, `trainingPlans[${index}].generatedAt`);
    const updatedAt = iso(item.updatedAt, `trainingPlans[${index}].updatedAt`);
    if (Date.parse(generatedAt) > Date.parse(updatedAt)) fail(`trainingPlans[${index}].timestamps`);
    item.tasks.forEach((value, taskIndex) => {
      const task = object(value, `trainingPlans[${index}].tasks[${taskIndex}]`);
      ['type', 'id', 'title', 'reason'].forEach((field) => id(task[field], `trainingPlans[${index}].tasks[${taskIndex}].${field}`));
      if (!['lesson', 'exercise', 'opening', 'challenge'].includes(String(task.type))) {
        fail(`trainingPlans[${index}].tasks[${taskIndex}].type`);
      }
      if (task.evidenceIds !== undefined) {
        const taskEvidenceIds = ids(task.evidenceIds, `trainingPlans[${index}].tasks[${taskIndex}].evidenceIds`);
        const skillTag = id(task.skillTag, `trainingPlans[${index}].tasks[${taskIndex}].skillTag`);
        const skill = skills.find((state) => state.skillId === skillTag);
        if (!taskEvidenceIds.length || new Set(taskEvidenceIds).size !== taskEvidenceIds.length
          || !skill || taskEvidenceIds.some((evidenceId) => !skill.evidenceIds.includes(evidenceId))) {
          fail(`trainingPlans[${index}].tasks[${taskIndex}].evidenceIds`);
        }
      }
    });
    return item as unknown as TrainingPlanRecord;
  });
  unique(plans, (item) => (item as TrainingPlanRecord).planId, 'trainingPlans');

const sync = object(state.sync, 'sync');
  if (sync.schemaVersion !== 'sync.v1' || sync.syncId !== `sync:${profileId}`
    || !Number.isInteger(sync.revision) || Number(sync.revision) < 0) fail('sync');
  iso(sync.updatedAt, 'sync.updatedAt');
  if (sync.lastSyncedAt !== null) iso(sync.lastSyncedAt, 'sync.lastSyncedAt');

  return { ...state, puzzleAttempts: attempts, skillStates: skills } as unknown as LearningPersistenceV1;
}
