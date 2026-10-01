import { LEVEL_ORDER, getLevelConfig } from '../data/levelConfig';
import { openings } from '../data/openings';
import { TRAINING_RULES, getRuleByMistake } from '../data/trainingRules';

const BASIC_LESSONS = [
  { id: 'board', title: 'Bàn cờ và tọa độ', reason: 'Nền tảng để đọc nước đi và hiểu bàn cờ.' },
  { id: 'king', title: 'Quân vua', reason: 'Hiểu quân quan trọng nhất và luật an toàn vua.' },
  { id: 'queen', title: 'Quân hậu', reason: 'Học quân mạnh nhất và cách phối hợp tấn công.' },
  { id: 'rook', title: 'Quân xe', reason: 'Nắm cách đi theo hàng/cột và chiếu hết cơ bản.' },
  { id: 'bishop', title: 'Quân tượng', reason: 'Luyện đường chéo và phối hợp quân nhẹ.' },
  { id: 'knight', title: 'Quân mã', reason: 'Luyện nước đi chữ L và motif fork.' },
  { id: 'pawn', title: 'Quân tốt', reason: 'Hiểu tốt đi, ăn, phong cấp và cấu trúc tốt.' },
];

const INTERMEDIATE_TACTICS = [
  { id: 'fork', title: 'Fork - đòn đôi', tags: ['fork', 'double_attack'] },
  { id: 'pin', title: 'Pin - ghim quân', tags: ['pin'] },
  { id: 'skewer', title: 'Skewer - xiên quân', tags: ['skewer'] },
  { id: 'discovered_attack', title: 'Discovered attack - tấn công mở', tags: ['discovered_attack'] },
  { id: 'double_attack', title: 'Double attack - tấn công kép', tags: ['double_attack'] },
];

const ADVANCED_TOPICS = [
  { id: 'positional_play', title: 'Positional play', tags: ['positional'] },
  { id: 'pawn_structure', title: 'Pawn structure', tags: ['pawn_structure'] },
  { id: 'endgame', title: 'Endgame', tags: ['endgame'] },
  { id: 'calculation', title: 'Calculation', tags: ['calculation'] },
  { id: 'opening_repertoire', title: 'Opening repertoire', tags: ['opening'] },
];

const TRAINING_PLAN_SCHEMA_VERSION = 'training.v1';
const TRAINING_TASK_TYPES = new Set(['lesson', 'exercise', 'opening', 'challenge']);

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeProfile(profile) {
  if (!profile) profile = {};
  return {
    profileId: typeof profile.profileId === 'string' ? profile.profileId : 'anonymous',
    currentLevel: profile.currentLevel || 'noob',
    gamesPlayed: Number(profile.gamesPlayed) || 0,
    lessonsCompleted: Array.isArray(profile.lessonsCompleted) ? profile.lessonsCompleted : [],
    exercisesCompleted: Array.isArray(profile.exercisesCompleted) ? profile.exercisesCompleted : [],
    exerciseStats: {
      total: Number(profile.exerciseStats?.total) || 0,
      correct: Number(profile.exerciseStats?.correct) || 0,
      wrong: Number(profile.exerciseStats?.wrong) || 0,
      accuracy: Number(profile.exerciseStats?.accuracy) || 0,
    },
    commonMistakes: Array.isArray(profile.commonMistakes) ? profile.commonMistakes : [],
    strengths: Array.isArray(profile.strengths) ? profile.strengths : [],
    weaknesses: Array.isArray(profile.weaknesses) ? profile.weaknesses : [],
    skillStates: Array.isArray(profile.skillStates)
      ? profile.skillStates
      : Array.isArray(profile.persistence?.skillStates) ? profile.persistence.skillStates : [],
    openingStats: {
      totalAttempts: Number(profile.openingStats?.totalAttempts) || 0,
      completedOpenings: Array.isArray(profile.openingStats?.completedOpenings) ? profile.openingStats.completedOpenings : [],
      practicedOpenings: Array.isArray(profile.openingStats?.practicedOpenings) ? profile.openingStats.practicedOpenings : [],
      weakOpenings: Array.isArray(profile.openingStats?.weakOpenings) ? profile.openingStats.weakOpenings : [],
      favoriteOpenings: Array.isArray(profile.openingStats?.favoriteOpenings) ? profile.openingStats.favoriteOpenings : [],
    },
  };
}

function normalizeTrainingTask(task) {
  if (!task || typeof task !== 'object' || !TRAINING_TASK_TYPES.has(task.type)) return null;
  if (![task.id, task.title, task.reason].every((value) => typeof value === 'string' && value.trim())) return null;
  return { ...task };
}

function legacyTask(type, value, index = 0) {
  if (type === 'challenge' && typeof value === 'string' && value.trim()) {
    return { type, id: 'daily_challenge', title: 'Ván cờ thực hành', reason: value };
  }
  if (!value || typeof value !== 'object') return null;
  return normalizeTrainingTask({
    type,
    id: value.id || `${type}-${index + 1}`,
    title: value.title || value.reason,
    reason: value.reason || value.title,
    ...(value.skillTag || value.tag ? { skillTag: value.skillTag || value.tag } : {}),
  });
}

export function normalizeDailyTrainingPlan(plan) {
  if (!plan || typeof plan !== 'object') return null;

  const tasks = Array.isArray(plan.tasks)
    ? plan.tasks.map(normalizeTrainingTask).filter(Boolean)
    : [
        legacyTask('lesson', plan.lesson),
        ...(Array.isArray(plan.exercises) ? plan.exercises.map((item, index) => legacyTask('exercise', item, index)) : []),
        legacyTask('opening', plan.opening),
        legacyTask('challenge', plan.challenge),
      ].filter(Boolean);

  if (!tasks.length) return null;
  const generatedAt = typeof plan.generatedAt === 'string' && !Number.isNaN(Date.parse(plan.generatedAt))
    ? new Date(plan.generatedAt).toISOString()
    : new Date().toISOString();
  return {
    schemaVersion: TRAINING_PLAN_SCHEMA_VERSION,
    planId: typeof plan.planId === 'string' && plan.planId.trim() ? plan.planId : `plan:${generatedAt}`,
    generatedAt,
    updatedAt: typeof plan.updatedAt === 'string' && !Number.isNaN(Date.parse(plan.updatedAt))
      ? new Date(plan.updatedAt).toISOString()
      : generatedAt,
    tasks,
  };
}

export function getRecommendedOpenings(profile) {
  const p = safeProfile(profile);
  const weak = p.openingStats.weakOpenings
    .map((id) => openings.find((opening) => opening.id === id))
    .filter(Boolean)
    .map((opening) => ({ ...opening, reason: 'Bạn từng sai nhiều ở khai cuộc này, nên luyện lại để tăng mastery.' }));

  if (weak.length) return weak.slice(0, 3);
  if (p.currentLevel === 'beginner' && !p.openingStats.practicedOpenings.length) {
    return openings.filter((o) => ['italian-game', 'london-system'].includes(o.id)).map((o) => ({ ...o, reason: 'Dễ hiểu, giúp phát triển quân nhanh và nhập thành sớm.' }));
  }
  if (p.commonMistakes.includes('weak_opening')) {
    return openings.filter((o) => ['italian-game', 'london-system', 'caro-kann-defense'].includes(o.id)).map((o) => ({ ...o, reason: 'Phù hợp để sửa lỗi khai cuộc yếu.' }));
  }
  if (p.currentLevel === 'advanced') {
    return openings.filter((o) => ['ruy-lopez', 'sicilian-defense', 'kings-indian-defense'].includes(o.id)).map((o) => ({ ...o, reason: 'Khai cuộc giàu ý tưởng cho người chơi nâng cao.' }));
  }
  return openings.filter((o) => o.level === 'beginner').slice(0, 3).map((o) => ({ ...o, reason: 'Phù hợp để xây nền khai cuộc.' }));
}

export function getWeaknesses(profile) {
  const p = safeProfile(profile);
  const fromMistakes = p.commonMistakes.map((tag) => getRuleByMistake(tag)?.label || tag);
  return [...new Set([...p.weaknesses, ...fromMistakes])];
}

export function getStrengths(profile) {
  const p = safeProfile(profile);
  if (p.strengths.length) return [...new Set(p.strengths)];
  if (p.exerciseStats.total >= 5 && p.exerciseStats.accuracy >= 75) return ['Giải bài tập ổn định'];
  return [];
}

export function getRecommendedLessons(profile) {
  const p = safeProfile(profile);
  const completed = new Set(p.lessonsCompleted);
  const lessons = [];

  if (p.currentLevel === 'noob') {
    lessons.push(...BASIC_LESSONS.filter((lesson) => !completed.has(lesson.id)));
    if (p.lessonsCompleted.length >= 4 && p.exerciseStats.accuracy < 60) {
      lessons.push({ id: 'luat-di-quan', title: 'Ôn luật đi quân', reason: 'Độ chính xác còn thấp, nên củng cố luật cơ bản.' });
    }
  }

  if (p.currentLevel === 'beginner') {
    p.commonMistakes.forEach((tag) => {
      const rule = getRuleByMistake(tag);
      if (rule) lessons.push({ id: rule.recommendedLessonId, title: rule.recommendedLesson, reason: rule.message });
    });
    if (p.gamesPlayed < 3) lessons.push({ id: 'practice-game', title: 'Chơi thêm ván thực hành', reason: 'Bạn cần thêm dữ liệu ván thật để coach cá nhân hóa.' });
  }

  if (p.currentLevel === 'intermediate') {
    lessons.push(...INTERMEDIATE_TACTICS.map((topic) => ({ ...topic, reason: 'Tactic là nền tảng để lên trung-cao cấp.' })));
    if (p.exerciseStats.accuracy < 65) lessons.unshift({ id: 'basic-tactics-review', title: 'Ôn tactic cơ bản', reason: 'Accuracy tactic chưa ổn định.' });
  }

  if (p.currentLevel === 'advanced') {
    lessons.push(...ADVANCED_TOPICS.map((topic) => ({ ...topic, reason: 'Chủ đề nâng cao để chuẩn bị phân tích sâu với engine/AI.' })));
  }

  return uniqueById(lessons).slice(0, 6);
}

export function getRecommendedExercises(profile) {
  const p = safeProfile(profile);
  const exercises = [];

  const weakestSkill = [...p.skillStates]
    .filter((state) => typeof state?.skillId === 'string' && Number.isFinite(state.score)
      && Array.isArray(state.evidenceIds) && state.evidenceIds.length)
    .sort((a, b) => a.score - b.score || a.skillId.localeCompare(b.skillId))[0];
  if (weakestSkill) {
    exercises.push({
      id: `skill:${weakestSkill.skillId}`,
      title: `Bài tập: ${weakestSkill.skillId}`,
      tag: weakestSkill.skillId,
      reason: `Ưu tiên kỹ năng có điểm thấp nhất từ ${weakestSkill.evidenceIds.length} bằng chứng đã lưu.`,
      evidenceIds: [...weakestSkill.evidenceIds],
    });
  }

  p.commonMistakes.forEach((tag) => {
    const rule = getRuleByMistake(tag);
    if (rule) {
      rule.recommendedExerciseTags.forEach((exerciseTag) => {
        exercises.push({ id: exerciseTag, title: `Bài tập: ${exerciseTag}`, tag: exerciseTag, reason: rule.message });
      });
    }
  });

  if (p.currentLevel === 'noob') exercises.push({ id: 'piece_movement', title: 'Bài tập luật đi quân', tag: 'piece_movement', reason: 'Củng cố cách đi từng quân.' });
  if (p.currentLevel === 'beginner') exercises.push({ id: 'board_vision', title: 'Bài tập nhìn quân bị tấn công', tag: 'board_vision', reason: 'Giảm lỗi treo quân.' });
  if (p.currentLevel === 'intermediate') exercises.push(...INTERMEDIATE_TACTICS.map((topic) => ({ id: topic.id, title: `Bài tập ${topic.title}`, tag: topic.tags[0], reason: 'Luyện motif tactic.' })));
  if (p.currentLevel === 'advanced') exercises.push(...ADVANCED_TOPICS.map((topic) => ({ id: topic.id, title: `Bài tập ${topic.title}`, tag: topic.tags[0], reason: 'Luyện chủ đề nâng cao.' })));

  return uniqueById(exercises).slice(0, 5);
}

export function calculateNextLevel(profile) {
  const p = safeProfile(profile);
  const index = LEVEL_ORDER.indexOf(p.currentLevel);
  if (index < 0 || index >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[index + 1];
}

export function shouldLevelUp(profile) {
  const p = safeProfile(profile);
  const { total, accuracy } = p.exerciseStats;

  if (p.currentLevel === 'noob') return p.lessonsCompleted.length >= 6 && accuracy >= 70 && total >= 10;
  if (p.currentLevel === 'beginner') return p.gamesPlayed >= 5 && accuracy >= 75 && total >= 20;
  if (p.currentLevel === 'intermediate') return p.gamesPlayed >= 10 && accuracy >= 80 && total >= 40;
  return false;
}

/**
 * Generate daily training plan with canonical tasks format
 *
 * @typedef {Object} TrainingTask
 * @property {'lesson'|'exercise'|'opening'|'challenge'} type
 * @property {string} id
 * @property {string} title
 * @property {string} reason
 * @property {string} [skillTag]
 *
 * @typedef {Object} DailyTrainingPlan
 * @property {'training.v1'} schemaVersion
 * @property {string} planId
 * @property {string} generatedAt
 * @property {string} updatedAt
 * @property {TrainingTask[]} tasks
 */
export function generateDailyTrainingPlan(profile) {
  const p = safeProfile(profile);
  const tasks = [];

  // 1. Lesson
  const lesson = getRecommendedLessons(p)[0] || { id: 'review', title: 'Ôn lại kiến thức đã học', reason: 'Duy trì nhịp luyện tập.' };
  tasks.push({
    type: 'lesson',
    id: lesson.id,
    title: lesson.title,
    reason: lesson.reason || 'Nền tảng cờ vua.',
  });

  // 2. Exercises (at least 1)
  const exercises = getRecommendedExercises(p).slice(0, 5);
  if (exercises.length > 0) {
    exercises.forEach(ex => {
      tasks.push({
        type: 'exercise',
        id: ex.id,
        title: ex.title,
        reason: ex.reason || 'Luyện kỹ năng.',
        skillTag: ex.tag,
        ...(ex.evidenceIds?.length ? { evidenceIds: ex.evidenceIds } : {}),
      });
    });
  } else {
    // Fallback: at least one exercise
    tasks.push({
      type: 'exercise',
      id: 'mixed_basic',
      title: '3 bài tập cơ bản tổng hợp',
      reason: 'Chưa đủ dữ liệu nên luyện tổng hợp.',
      skillTag: 'mixed',
    });
  }

  // 3. Opening (optional)
  const opening = getRecommendedOpenings(p)[0];
  if (opening) {
    tasks.push({
      type: 'opening',
      id: opening.id,
      title: opening.vietnameseName || opening.title,
      reason: opening.reason || 'Luyện khai cuộc.',
    });
  }

  // 4. Challenge (always present)
  const challengeText = p.gamesPlayed < 3
    ? 'Chơi 1 ván và tập không mất quân miễn phí.'
    : 'Chơi 1 ván, sau đó vào Phòng mổ ván cờ với Ninh Lốp Trưởng.';
  tasks.push({
    type: 'challenge',
    id: 'daily_challenge',
    title: 'Ván cờ thực hành',
    reason: challengeText,
  });

  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: TRAINING_PLAN_SCHEMA_VERSION,
    planId: `plan:${globalThis.crypto.randomUUID()}`,
    generatedAt,
    updatedAt: generatedAt,
    tasks,
  };
}

export function getTrainingMessage(profile) {
  const p = safeProfile(profile);
  const levelConfig = getLevelConfig(p.currentLevel);

  if (p.exerciseStats.total < 3 && p.gamesPlayed < 1) {
    return 'Mình chưa có đủ dữ liệu từ ván chơi và bài tập. Bạn hãy hoàn thành ít nhất 3 bài tập và chơi 1 ván để mình cá nhân hóa tốt hơn.';
  }

  if (p.currentLevel === 'advanced') {
    return 'Bạn đã ở mức nâng cao. Để luyện chuyên sâu cần engine và Quân sư Ninh thật chắc tay hơn.';
  }

  if (shouldLevelUp(p)) {
    const next = getLevelConfig(calculateNextLevel(p));
    return `Bạn có vẻ đã sẵn sàng lên cấp ${next.label}. Hãy vào trang Huấn luyện để nâng cấp level.`;
  }

  const weakness = getWeaknesses(p)[0];
  if (weakness) return `Bạn đang ở mức ${levelConfig.label}. Dữ liệu hiện tại cho thấy nên ưu tiên luyện: ${weakness}.`;

  return `Bạn đang ở mức ${levelConfig.label}. Hôm nay hãy theo lộ trình đề xuất để tiến bộ ổn định.`;
}
