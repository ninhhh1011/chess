import {
  calculateNextLevel,
  generateDailyTrainingPlan,
  getRecommendedExercises,
  getRecommendedLessons,
  shouldLevelUp,
} from './recommendationService';
import { syncOnAction } from './syncService';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'vuaCoUserTrainingProfile';
const VALID_LEVELS = ['noob', 'beginner', 'intermediate', 'advanced'];

function nowIso() {
  return new Date().toISOString();
}

function uniqueList(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function createDefaultProfile() {
  const now = nowIso();
  return {
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
  };
}

function normalizeProfile(profile) {
  const fallback = createDefaultProfile();
  const stats = profile?.exerciseStats || {};
  const total = Number(stats.total) || 0;
  const correct = Number(stats.correct) || 0;
  const wrong = Number(stats.wrong) || 0;
  const level = VALID_LEVELS.includes(profile?.currentLevel) ? profile.currentLevel : fallback.currentLevel;

  return {
    ...fallback,
    ...profile,
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
    dailyTrainingPlan: profile?.dailyTrainingPlan || fallback.dailyTrainingPlan,
    openingStats: {
      totalAttempts: Number(profile?.openingStats?.totalAttempts) || 0,
      completedOpenings: Array.isArray(profile?.openingStats?.completedOpenings) ? uniqueList(profile.openingStats.completedOpenings) : [],
      practicedOpenings: Array.isArray(profile?.openingStats?.practicedOpenings) ? uniqueList(profile.openingStats.practicedOpenings) : [],
      weakOpenings: Array.isArray(profile?.openingStats?.weakOpenings) ? uniqueList(profile.openingStats.weakOpenings) : [],
      favoriteOpenings: Array.isArray(profile?.openingStats?.favoriteOpenings) ? uniqueList(profile.openingStats.favoriteOpenings) : [],
    },
    createdAt: profile?.createdAt || fallback.createdAt,
    updatedAt: profile?.updatedAt || fallback.updatedAt,
  };
}

function withRecommendations(profile) {
  const normalized = normalizeProfile(profile);
  return {
    ...normalized,
    recommendedLessons: getRecommendedLessons(normalized),
    recommendedExercises: getRecommendedExercises(normalized),
    dailyTrainingPlan: normalized.dailyTrainingPlan || generateDailyTrainingPlan(normalized),
  };
}

function readStoredProfile() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function calculateLevel(profile) {
  return normalizeProfile(profile).currentLevel;
}

export function saveUserProfile(profile) {
  const normalized = withRecommendations({ ...profile, updatedAt: nowIso() });

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch (error) {
    console.warn('[profile] Cannot save user profile to localStorage:', error);
  }

  // Sync to cloud in background (non-blocking)
  try {
    const { user } = useAuth();
    if (user?.id) {
      syncOnAction(user.id, 'save_profile').catch(err => {
        console.warn('[profile] Cannot sync to cloud:', err);
      });
    }
  } catch (error) {
    console.warn('[profile] Cannot sync to cloud:', error);
  }

  return normalized;
}

export function getUserProfile() {
  try {
    const stored = readStoredProfile();
    if (!stored) return saveUserProfile(createDefaultProfile());
    return saveUserProfile(normalizeProfile(stored));
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

export function updateExerciseResult({ exerciseId, isCorrect, tags = [] }) {
  const profile = getUserProfile();
  const total = profile.exerciseStats.total + 1;
  const correct = profile.exerciseStats.correct + (isCorrect ? 1 : 0);
  const wrong = profile.exerciseStats.wrong + (isCorrect ? 0 : 1);
  const nextTags = Array.isArray(tags) ? tags : [];

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

export function updateAfterGame({ result = 'unknown', movesCount = 0, mistakes = [] }) {
  const profile = getUserProfile();
  const mockMistakes = movesCount < 12 ? ['poor_development', 'weak_opening'] : [];

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
