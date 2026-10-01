import {
  calculateNextLevel,
  generateDailyTrainingPlan,
  getRecommendedExercises,
  getRecommendedLessons,
  normalizeDailyTrainingPlan,
  shouldLevelUp,
} from './recommendationService';
import { syncOnAction } from './syncService';
import { assertAnalysisFactV1, getAnalysisFactEvidenceId } from './analysis/analysisFact';
import { assertPersistenceState, createPersistenceState } from './persistenceContract';

const STORAGE_KEY = 'vuaCoUserTrainingProfile';
const PROFILE_SCHEMA_VERSION = 'profile.v2';
const LEGACY_PROFILE_SCHEMA_VERSION = 'profile.v1';
const VALID_LEVELS = ['noob', 'beginner', 'intermediate', 'advanced'];

function nowIso() {
  return new Date().toISOString();
}

function uniqueList(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function learningTags(facts) {
  return facts
    .filter((fact) => ['inaccuracy', 'mistake', 'blunder'].includes(fact.classification))
    .flatMap((fact) => fact.skillTags)
    .filter((tag) => tag !== 'unclassified');
}

function applySkillEvidence(skillStates, observations) {
  return observations.reduce((states, { skillId, evidenceId, delta, at }) => {
    const existing = states.find((state) => state.skillId === skillId);
    if (existing?.evidenceIds.includes(evidenceId)) return states;
    const next = existing ? {
      ...existing,
      score: existing.score + delta,
      evidenceIds: [...existing.evidenceIds, evidenceId],
      updatedAt: at,
    } : {
      schemaVersion: 'skillState.v1', skillId, score: delta,
      evidenceIds: [evidenceId], createdAt: at, updatedAt: at,
    };
    return existing
      ? states.map((state) => state.skillId === skillId ? next : state)
      : [...states, next];
  }, skillStates);
}

function validIso(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function createDefaultProfile() {
  const now = nowIso();
  const profileId = `profile:${globalThis.crypto.randomUUID()}`;
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    profileId,
    revision: 0,
    currentLevel: 'noob',
    gamesPlayed: 0,
    lessonsCompleted: [],
    exercisesCompleted: [],
    exerciseStats: {
      total: 0,
      correct: 0,
      wrong: 0,
      accuracy: 0,
    },
    commonMistakes: [],
    strengths: [],
    weaknesses: [],
    recommendedLessons: [],
    recommendedExercises: [],
    dailyTrainingPlan: null,
    openingStats: {
      totalAttempts: 0,
      completedOpenings: [],
      practicedOpenings: [],
      weakOpenings: [],
      favoriteOpenings: [],
    },
    lastTrainingDate: null,
    createdAt: now,
    updatedAt: now,
    persistence: createPersistenceState(profileId, now),
  };
}

function normalizeProfile(profile) {
  if (profile?.schemaVersion && ![LEGACY_PROFILE_SCHEMA_VERSION, PROFILE_SCHEMA_VERSION].includes(profile.schemaVersion)) {
    throw new Error(`Unsupported profile schema: ${profile.schemaVersion}`);
  }
  const fallback = createDefaultProfile();
  const profileId = typeof profile?.profileId === 'string' && profile.profileId.trim()
    ? profile.profileId
    : fallback.profileId;
  const stats = profile?.exerciseStats || {};
  const total = Number(stats.total) || 0;
  const correct = Number(stats.correct) || 0;
  const wrong = Number(stats.wrong) || 0;
  const level = VALID_LEVELS.includes(profile?.currentLevel) ? profile.currentLevel : fallback.currentLevel;
  const createdAt = validIso(profile?.createdAt) ? new Date(profile.createdAt).toISOString() : fallback.createdAt;
  const updatedAt = validIso(profile?.updatedAt) ? new Date(profile.updatedAt).toISOString() : createdAt;
  const persistence = profile?.schemaVersion === PROFILE_SCHEMA_VERSION && profile?.persistence !== undefined
    ? assertPersistenceState(profile.persistence)
    : createPersistenceState(profileId, updatedAt);
  if (persistence.profileId !== profileId) throw new Error('Profile and persistence IDs do not match');

  return {
    ...fallback,
    ...profile,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    profileId,
    revision: Number.isInteger(profile?.revision) && profile.revision >= 0 ? profile.revision : 0,
    currentLevel: level,
    gamesPlayed: Number(profile?.gamesPlayed) || 0,
    lessonsCompleted: Array.isArray(profile?.lessonsCompleted) ? uniqueList(profile.lessonsCompleted) : [],
    exercisesCompleted: Array.isArray(profile?.exercisesCompleted) ? uniqueList(profile.exercisesCompleted) : [],
    exerciseStats: {
      total,
      correct,
      wrong,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    },
    commonMistakes: Array.isArray(profile?.commonMistakes) ? uniqueList(profile.commonMistakes) : [],
    strengths: Array.isArray(profile?.strengths) ? uniqueList(profile.strengths) : [],
    weaknesses: Array.isArray(profile?.weaknesses) ? uniqueList(profile.weaknesses) : [],
    recommendedLessons: Array.isArray(profile?.recommendedLessons) ? profile.recommendedLessons : [],
    recommendedExercises: Array.isArray(profile?.recommendedExercises) ? profile.recommendedExercises : [],
    dailyTrainingPlan: normalizeDailyTrainingPlan(profile?.dailyTrainingPlan),
    openingStats: {
      totalAttempts: Number(profile?.openingStats?.totalAttempts) || 0,
      completedOpenings: Array.isArray(profile?.openingStats?.completedOpenings) ? uniqueList(profile.openingStats.completedOpenings) : [],
      practicedOpenings: Array.isArray(profile?.openingStats?.practicedOpenings) ? uniqueList(profile.openingStats.practicedOpenings) : [],
      weakOpenings: Array.isArray(profile?.openingStats?.weakOpenings) ? uniqueList(profile.openingStats.weakOpenings) : [],
      favoriteOpenings: Array.isArray(profile?.openingStats?.favoriteOpenings) ? uniqueList(profile.openingStats.favoriteOpenings) : [],
    },
    createdAt,
    updatedAt,
    persistence,
  };
}

function withRecommendations(profile) {
  const normalized = normalizeProfile(profile);
  const dailyTrainingPlan = normalized.dailyTrainingPlan || generateDailyTrainingPlan(normalized);
  const trainingPlans = dailyTrainingPlan && !normalized.persistence.trainingPlans.some((plan) => plan.planId === dailyTrainingPlan.planId)
    ? [...normalized.persistence.trainingPlans, dailyTrainingPlan]
    : normalized.persistence.trainingPlans;
  return {
    ...normalized,
    persistence: assertPersistenceState({ ...normalized.persistence, trainingPlans }),
    recommendedLessons: getRecommendedLessons(normalized),
    recommendedExercises: getRecommendedExercises(normalized),
    dailyTrainingPlan,
    tasks: dailyTrainingPlan?.tasks || [],
  };
}

function readStoredProfile() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

function writeStoredProfile(profile) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }
}

export function migrateUserProfile(profile) {
  return withRecommendations(profile);
}

export function calculateLevel(profile) {
  return normalizeProfile(profile).currentLevel;
}

export function saveUserProfile(profile, options = {}) {
  const { userId = null, syncCloud = false, preserveTimestamps = false } = options;
  const current = normalizeProfile(profile);
  const updatedAt = preserveTimestamps ? current.updatedAt : nowIso();
  const revision = preserveTimestamps ? current.revision : current.revision + 1;
  const normalized = withRecommendations({
    ...current,
    revision,
    updatedAt,
    persistence: {
      ...current.persistence,
      sync: { ...current.persistence.sync, revision, updatedAt },
    },
  });

  try {
    writeStoredProfile(normalized);
  } catch (error) {
    console.warn('[profile] Cannot save user profile to localStorage:', error);
  }

  if (syncCloud && userId) {
    syncOnAction(userId, 'save_profile').catch((err) => {
      console.warn('[profile] Cannot sync to cloud:', err);
    });
  }

  return normalized;
}

export function getUserProfile() {
  try {
    const stored = readStoredProfile();
    if (!stored) return saveUserProfile(createDefaultProfile(), { preserveTimestamps: true });
    const normalized = migrateUserProfile(stored);
    if (JSON.stringify(stored) !== JSON.stringify(normalized)) writeStoredProfile(normalized);
    return normalized;
  } catch (error) {
    console.warn('[profile] Cannot read user profile:', error);
    return withRecommendations(createDefaultProfile());
  }
}

export function resetUserProfile() {
  return saveUserProfile(createDefaultProfile());
}

export function updateRecommendations() {
  const profile = getUserProfile();
  return saveUserProfile({
    ...profile,
    recommendedLessons: getRecommendedLessons(profile),
    recommendedExercises: getRecommendedExercises(profile),
  });
}

export function updateDailyTrainingPlan() {
  const profile = getUserProfile();
  return saveUserProfile({
    ...profile,
    dailyTrainingPlan: generateDailyTrainingPlan(profile),
    lastTrainingDate: nowIso(),
  });
}

export function levelUpIfEligible() {
  const profile = getUserProfile();
  if (!shouldLevelUp(profile)) return profile;
  const nextLevel = calculateNextLevel(profile);
  if (!nextLevel) return profile;
  return saveUserProfile({ ...profile, currentLevel: nextLevel, dailyTrainingPlan: null });
}

export function markLessonCompleted(lessonId) {
  const profile = getUserProfile();
  return saveUserProfile({
    ...profile,
    lessonsCompleted: uniqueList([...profile.lessonsCompleted, lessonId]),
    dailyTrainingPlan: null,
    lastTrainingDate: nowIso(),
  });
}

export function addMistake(mistakeTag) {
  const profile = getUserProfile();
  return saveUserProfile({
    ...profile,
    commonMistakes: uniqueList([...profile.commonMistakes, mistakeTag]),
    dailyTrainingPlan: null,
    lastTrainingDate: nowIso(),
  });
}

export function recordAnalysisFacts(facts = []) {
  const tags = learningTags(facts.map(assertAnalysisFactV1));
  const profile = getUserProfile();
  return saveUserProfile({
    ...profile,
    commonMistakes: uniqueList([...profile.commonMistakes, ...tags]),
    dailyTrainingPlan: null,
    lastTrainingDate: nowIso(),
  });
}

export function recordGameReview({
  reviewId,
  gameId,
  facts = /** @type {import('../types/analysis').AnalysisFactV1[]} */ ([]),
}) {
  if (typeof reviewId !== 'string' || !reviewId.trim() || typeof gameId !== 'string' || !gameId.trim()) {
    throw new Error('Invalid game review identity');
  }
  const validatedFacts = facts.map(assertAnalysisFactV1);
  if (!validatedFacts.length || validatedFacts.some((fact) => fact.gameId !== gameId)) {
    throw new Error('Invalid game review facts');
  }

  const profile = getUserProfile();
  const factIds = validatedFacts.map(getAnalysisFactEvidenceId);
  const storedFacts = new Map(profile.persistence.analysisFacts.map((fact) => [getAnalysisFactEvidenceId(fact), fact]));
  validatedFacts.forEach((fact) => {
    const stored = storedFacts.get(getAnalysisFactEvidenceId(fact));
    if (stored && JSON.stringify(stored) !== JSON.stringify(fact)) throw new Error('Conflicting analysis fact');
  });

  const existingReview = profile.persistence.gameReviews.find((review) => review.reviewId === reviewId);
  if (existingReview) {
    if (existingReview.gameId !== gameId || JSON.stringify(existingReview.factIds) !== JSON.stringify(factIds)) {
      throw new Error('Conflicting game review');
    }
    return profile;
  }

  const now = nowIso();
  const analysisFacts = [
    ...profile.persistence.analysisFacts,
    ...validatedFacts.filter((fact) => !storedFacts.has(getAnalysisFactEvidenceId(fact))),
  ];
  const skillStates = applySkillEvidence(profile.persistence.skillStates, validatedFacts.flatMap((fact) =>
    learningTags([fact]).map((skillId) => ({
      skillId, evidenceId: getAnalysisFactEvidenceId(fact), delta: -1, at: now,
    }))));
  const persistence = assertPersistenceState({
    ...profile.persistence,
    analysisFacts,
    skillStates,
    gameReviews: [...profile.persistence.gameReviews, {
      schemaVersion: 'gameReview.v1', reviewId, gameId, factIds, createdAt: now, updatedAt: now,
    }],
  });

  return saveUserProfile({
    ...profile,
    persistence,
    commonMistakes: uniqueList([...profile.commonMistakes, ...learningTags(validatedFacts)]),
    dailyTrainingPlan: null,
    lastTrainingDate: now,
  });
}

/**
 * @param {{
 *  attemptId: string, puzzleId: string, sourcePuzzleId: string, eventId: string,
 *  type: 'wrong' | 'retry' | 'correct', moveUci: string | null, solved: boolean, at: string,
 *  skillTags?: string[]
 * }} input
 */
export function recordPuzzleAttemptEvent(input) {
  const { attemptId, puzzleId, sourcePuzzleId, eventId, type, moveUci, solved, at, skillTags = [] } = input;
  if (!Array.isArray(skillTags) || !skillTags.every((tag) => typeof tag === 'string' && tag.trim())) {
    throw new Error('Invalid puzzle attempt skill tags');
  }
  const uniqueSkillTags = uniqueList(skillTags);
  const event = { eventId, type, moveUci, solved, at };
  const candidate = {
    schemaVersion: 'puzzleAttempt.v1', attemptId, puzzleId, sourcePuzzleId,
    status: type === 'correct' && solved ? 'solved' : 'in_progress',
    createdAt: at, updatedAt: at, events: [event], skillTags: uniqueSkillTags,
  };
  assertPersistenceState({
    ...createPersistenceState('profile:validation', at),
    puzzleAttempts: [candidate],
  });

  const profile = getUserProfile();
  const existing = profile.persistence.puzzleAttempts.find((attempt) => attempt.attemptId === attemptId);
  if (existing && (existing.puzzleId !== puzzleId || existing.sourcePuzzleId !== sourcePuzzleId)) {
    throw new Error('Conflicting puzzle attempt');
  }
  if (existing?.skillTags.length && uniqueSkillTags.length
    && JSON.stringify(existing.skillTags) !== JSON.stringify(uniqueSkillTags)) {
    throw new Error('Conflicting puzzle attempt skill tags');
  }
  const repeated = existing?.events.find((item) => item.eventId === eventId);
  if (repeated) {
    if (JSON.stringify(repeated) !== JSON.stringify(event)) throw new Error('Conflicting puzzle attempt event');
    return profile;
  }
  if (existing?.status === 'solved') throw new Error('Puzzle attempt is already solved');

  const attempt = existing ? {
    ...existing,
    skillTags: existing.skillTags.length ? existing.skillTags : uniqueSkillTags,
    status: type === 'correct' && solved ? 'solved' : existing.status,
    updatedAt: at,
    events: [...existing.events, event],
  } : candidate;
  const puzzleAttempts = existing
    ? profile.persistence.puzzleAttempts.map((item) => item.attemptId === attemptId ? attempt : item)
    : [...profile.persistence.puzzleAttempts, attempt];
  const observationDelta = type === 'wrong' ? -1 : type === 'correct' && solved ? 1 : null;
  const skillStates = observationDelta === null ? profile.persistence.skillStates : applySkillEvidence(
    profile.persistence.skillStates,
    attempt.skillTags.map((skillId) => ({ skillId, evidenceId: eventId, delta: observationDelta, at })),
  );
  const persistence = assertPersistenceState({ ...profile.persistence, puzzleAttempts, skillStates });
  return saveUserProfile({
    ...profile,
    persistence,
    ...(observationDelta !== null && attempt.skillTags.length ? { dailyTrainingPlan: null } : {}),
    lastTrainingDate: at,
  });
}

export function updateExerciseResult({ exerciseId, isCorrect, tags = /** @type {string[]} */ ([]) }) {
  const /** @type {string[]} */ nextTags = Array.isArray(tags) ? tags : [];
  const profile = getUserProfile();
  const total = profile.exerciseStats.total + 1;
  const correct = profile.exerciseStats.correct + (isCorrect ? 1 : 0);
  const wrong = profile.exerciseStats.wrong + (isCorrect ? 0 : 1);

  return saveUserProfile({
    ...profile,
    exercisesCompleted: isCorrect ? uniqueList([...profile.exercisesCompleted, exerciseId]) : profile.exercisesCompleted,
    exerciseStats: {
      total,
      correct,
      wrong,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    },
    strengths: isCorrect ? uniqueList([...profile.strengths, ...nextTags]) : profile.strengths,
    weaknesses: isCorrect ? profile.weaknesses : uniqueList([...profile.weaknesses, ...nextTags]),
    commonMistakes: isCorrect ? profile.commonMistakes : uniqueList([...profile.commonMistakes, ...nextTags]),
    dailyTrainingPlan: null,
    lastTrainingDate: nowIso(),
  });
}

export function updateAfterGame({ result = 'unknown', movesCount = 0, mistakes = /** @type {string[]} */ ([]) }) {
  const profile = getUserProfile();
  const /** @type {string[]} */ mockMistakes = movesCount < 12 ? ['poor_development', 'weak_opening'] : /** @type {string[]} */ ([]) ;

  return saveUserProfile({
    ...profile,
    gamesPlayed: profile.gamesPlayed + 1,
    commonMistakes: uniqueList([...profile.commonMistakes, ...mockMistakes, ...(Array.isArray(mistakes) ? mistakes : [])]),
    lastGameResult: result,
    lastGameMovesCount: movesCount,
    dailyTrainingPlan: null,
    lastTrainingDate: nowIso(),
  });
}

export function updateOpeningStats({ openingId, success = false, mistakeCount = 0 }) {
  const profile = getUserProfile();
  const stats = profile.openingStats;
  const attemptsForOpening = stats.practicedOpenings.filter((id) => id === openingId).length + 1;

  return saveUserProfile({
    ...profile,
    openingStats: {
      ...stats,
      totalAttempts: stats.totalAttempts + 1,
      practicedOpenings: uniqueList([...stats.practicedOpenings, openingId]),
      completedOpenings: success ? uniqueList([...stats.completedOpenings, openingId]) : stats.completedOpenings,
      weakOpenings: mistakeCount >= 2 ? uniqueList([...stats.weakOpenings, openingId]) : stats.weakOpenings,
      favoriteOpenings: attemptsForOpening >= 3 ? uniqueList([...stats.favoriteOpenings, openingId]) : stats.favoriteOpenings,
    },
    commonMistakes: mistakeCount ? uniqueList([...profile.commonMistakes, 'weak_opening']) : profile.commonMistakes,
    dailyTrainingPlan: null,
    lastTrainingDate: nowIso(),
  });
}
