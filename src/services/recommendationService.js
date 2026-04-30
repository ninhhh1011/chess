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

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeProfile(profile = {}) {
  return {
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
    openingStats: {
      totalAttempts: Number(profile.openingStats?.totalAttempts) || 0,
      completedOpenings: Array.isArray(profile.openingStats?.completedOpenings) ? profile.openingStats.completedOpenings : [],
      practicedOpenings: Array.isArray(profile.openingStats?.practicedOpenings) ? profile.openingStats.practicedOpenings : [],
      weakOpenings: Array.isArray(profile.openingStats?.weakOpenings) ? profile.openingStats.weakOpenings : [],
      favoriteOpenings: Array.isArray(profile.openingStats?.favoriteOpenings) ? profile.openingStats.favoriteOpenings : [],
    },
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

export function generateDailyTrainingPlan(profile) {
  const p = safeProfile(profile);
  const lesson = getRecommendedLessons(p)[0] || { id: 'review', title: 'Ôn lại kiến thức đã học', reason: 'Duy trì nhịp luyện tập.' };
  const exercises = getRecommendedExercises(p).slice(0, 5);
  const challenge = p.gamesPlayed < 3
    ? 'Chơi 1 ván và tập không mất quân miễn phí.'
    : 'Chơi 1 ván, sau đó bấm Review ván với ninh lốp trưởng.';

  return {
    generatedAt: new Date().toISOString(),
    lesson,
    exercises: exercises.length ? exercises : [{ id: 'mixed_basic', title: '3 bài tập cơ bản tổng hợp', tag: 'mixed', reason: 'Chưa đủ dữ liệu nên luyện tổng hợp.' }],
    opening: getRecommendedOpenings(p)[0] || null,
    challenge,
  };
}

export function getTrainingMessage(profile) {
  const p = safeProfile(profile);
  const levelConfig = getLevelConfig(p.currentLevel);

  if (p.exerciseStats.total < 3 && p.gamesPlayed < 1) {
    return 'Mình chưa có đủ dữ liệu từ ván chơi và bài tập. Bạn hãy hoàn thành ít nhất 3 bài tập và chơi 1 ván để mình cá nhân hóa tốt hơn.';
  }

  if (p.currentLevel === 'advanced') {
    return 'Bạn đã ở mức nâng cao. Để luyện chuyên sâu cần Stockfish và AI Coach thật trong các phase sau.';
  }

  if (shouldLevelUp(p)) {
    const next = getLevelConfig(calculateNextLevel(p));
    return `Bạn có vẻ đã sẵn sàng lên cấp ${next.label}. Hãy vào trang Huấn luyện để nâng cấp level.`;
  }

  const weakness = getWeaknesses(p)[0];
  if (weakness) return `Bạn đang ở mức ${levelConfig.label}. Dữ liệu hiện tại cho thấy nên ưu tiên luyện: ${weakness}.`;

  return `Bạn đang ở mức ${levelConfig.label}. Hôm nay hãy theo lộ trình đề xuất để tiến bộ ổn định.`;
}
