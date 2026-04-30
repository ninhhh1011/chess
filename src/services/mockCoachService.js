import { getLevelConfig } from '../data/levelConfig';
import { openings } from '../data/openings';
import { calculateNextLevel, getRecommendedExercises, getRecommendedLessons, getRecommendedOpenings, getTrainingMessage, getWeaknesses, shouldLevelUp } from './recommendationService';
import { getUserProfile } from './userProfileService';

const LEVEL_GUIDES = {
  noob: {
    label: 'noob',
    tone: 'Mình sẽ nói thật đơn giản: ưu tiên giữ vua an toàn, không để mất quân miễn phí và phát triển quân nhẹ trước.',
  },
  beginner: {
    label: 'beginner',
    tone: 'Tập trung vào nguyên tắc cơ bản: kiểm soát trung tâm, phát triển mã/tượng, nhập thành và kiểm tra quân bị tấn công.',
  },
  intermediate: {
    label: 'intermediate',
    tone: 'Bạn có thể bắt đầu tìm candidate moves, tactic như fork/pin và đánh giá cấu trúc tốt.',
  },
  advanced: {
    label: 'advanced',
    tone: 'Hãy phân tích sâu hơn về điểm yếu, pawn structure, king safety, initiative và kế hoạch nhiều nước.',
  },
};

function normalizeLevel(level) {
  return LEVEL_GUIDES[level] ? level : 'beginner';
}

function getMoveSummary(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return 'Ván cờ chưa có nước đi nào, nên hãy bắt đầu bằng các nước phát triển quân và kiểm soát trung tâm.';
  }

  const recentMoves = history.slice(-6).join(' ');
  return `Các nước gần đây: ${recentMoves}. Hãy kiểm tra xem nước cuối có tạo đe dọa, chiếu, bắt quân hoặc làm yếu vua không.`;
}

function getFenSummary(fen) {
  if (!fen) {
    return 'Mình chưa nhận được FEN, nên chỉ đưa lời khuyên theo nguyên tắc chung.';
  }

  const [placement, sideToMove, castling] = fen.split(' ');
  const sideLabel = sideToMove === 'w' ? 'Trắng' : sideToMove === 'b' ? 'Đen' : 'không rõ';
  const castlingLabel = castling && castling !== '-' ? `Quyền nhập thành còn: ${castling}.` : 'Có vẻ không còn quyền nhập thành hoặc FEN không ghi quyền nhập thành.';

  return `FEN hiện tại cho biết lượt đi là ${sideLabel}. ${castlingLabel} Mình dùng thông tin này để đưa coaching cơ bản, chưa phải phân tích engine.`;
}

function baseDisclaimer() {
  return 'Lưu ý: Đây là bản huấn luyện cơ bản dạng mock, chưa có engine/AI thật. Để đánh giá nước đi chính xác tuyệt đối cần tích hợp Stockfish hoặc AI provider sau này.';
}

function getProfileCoaching(profile = getUserProfile()) {
  const tips = [];
  const safeProfile = profile || {};
  const stats = safeProfile.exerciseStats || {};

  tips.push(`Profile của bạn: level ${safeProfile.currentLevel || 'noob'}, đã chơi ${safeProfile.gamesPlayed || 0} ván, độ chính xác bài tập ${stats.accuracy || 0}%.`);

  if (!safeProfile.gamesPlayed) tips.push('Bạn chưa lưu ván nào, hãy chơi ván đầu tiên để coach có dữ liệu cá nhân hóa tốt hơn.');
  if ((stats.total || 0) > 0 && (stats.accuracy || 0) < 50) tips.push('Độ chính xác bài tập còn thấp, nên luyện bài dễ hơn và đọc kỹ ý đồ đối thủ trước khi đi.');
  if (safeProfile.commonMistakes?.includes('hanging_piece')) tips.push('Bạn hay gặp lỗi hanging_piece: trước mỗi nước hãy kiểm tra quân nào đang bị treo hoặc không được bảo vệ.');
  if (safeProfile.commonMistakes?.includes('poor_development') || safeProfile.commonMistakes?.includes('weak_opening')) tips.push('Bạn cần chú ý phát triển quân khai cuộc: đưa mã/tượng ra, nhập thành sớm, hạn chế đi tốt quá nhiều.');
  if (safeProfile.weaknesses?.length) tips.push(`Điểm cần luyện thêm: ${safeProfile.weaknesses.slice(0, 4).join(', ')}.`);
  if (safeProfile.strengths?.length) tips.push(`Điểm mạnh đang có: ${safeProfile.strengths.slice(0, 4).join(', ')}.`);

  return tips.map((tip) => `- ${tip}`).join('\n');
}

function getRecommendationAnswer() {
  const profile = getUserProfile();
  const level = getLevelConfig(profile.currentLevel);
  const lessons = getRecommendedLessons(profile);
  const exercises = getRecommendedExercises(profile);
  const weaknesses = getWeaknesses(profile);
  const plan = profile.dailyTrainingPlan;
  const nextLevel = calculateNextLevel(profile);

  if (profile.exerciseStats.total < 3 && profile.gamesPlayed < 1) {
    return `${baseDisclaimer()}\n\nMình chưa có đủ dữ liệu từ ván chơi và bài tập. Bạn hãy hoàn thành ít nhất 3 bài tập và chơi 1 ván để mình cá nhân hóa tốt hơn.\n\nHiện tại bạn đang ở mức **${level.label}**. Gợi ý an toàn nhất là học luật đi quân cơ bản và làm vài bài tập dễ.`;
  }

  return `${baseDisclaimer()}

**Lộ trình cá nhân hóa của bạn**
- Level hiện tại: ${level.label}
- Nhận xét: ${getTrainingMessage(profile)}
- Điểm yếu ưu tiên: ${weaknesses.length ? weaknesses.slice(0, 3).join(', ') : 'chưa đủ dữ liệu'}

**Bạn nên học gì tiếp theo**
${lessons.slice(0, 3).map((lesson, index) => `${index + 1}. ${lesson.title} — ${lesson.reason}`).join('\n') || 'Chưa có bài học đề xuất.'}

**Hôm nay luyện gì**
1. Học: ${plan?.lesson?.title || lessons[0]?.title || 'Ôn kiến thức cơ bản'}
2. Làm: ${(plan?.exercises || exercises).slice(0, 5).map((item) => item.title).join(', ') || '3 bài tập cơ bản'}
3. Chơi: ${plan?.challenge || '1 ván và cố gắng không mất quân miễn phí'}

**Lên level**
${shouldLevelUp(profile) && nextLevel ? `Bạn có vẻ đã sẵn sàng lên cấp ${getLevelConfig(nextLevel).label}. Hãy vào trang Huấn luyện và bấm “Nâng cấp level”.` : 'Chưa cần vội lên level. Hãy hoàn thành thêm mục tiêu trong lộ trình hôm nay.'}`;
}

function getOpeningAnswer(question = '') {
  const profile = getUserProfile();
  const recommended = getRecommendedOpenings(profile);
  const weakIds = profile.openingStats?.weakOpenings || [];
  const weakOpenings = weakIds.map((id) => openings.find((opening) => opening.id === id)).filter(Boolean);
  const lower = question.toLowerCase();
  const mentioned = openings.find((opening) => lower.includes(opening.id) || lower.includes(opening.name.toLowerCase()) || lower.includes(opening.vietnameseName.toLowerCase()));

  if (mentioned) {
    return `${baseDisclaimer()}\n\n**${mentioned.vietnameseName} (${mentioned.name})**\n${mentioned.description}\n\nÝ tưởng chính:\n${mentioned.mainIdeas.map((idea) => `- ${idea}`).join('\n')}\n\nLỗi thường gặp:\n${mentioned.commonMistakes.map((mistake) => `- ${mistake}`).join('\n')}\n\nBạn có thể vào /openings/${mentioned.id} để học từng nước và luyện Practice Mode.`;
  }

  if (weakOpenings.length) {
    return `${baseDisclaimer()}\n\nBạn đang sai nhiều trong: ${weakOpenings.map((o) => o.vietnameseName).join(', ')}. Hãy luyện lại 3-5 nước đầu, tập trung hiểu ý tưởng thay vì học vẹt. Ưu tiên hôm nay: ${weakOpenings[0].vietnameseName}.`;
  }

  return `${baseDisclaimer()}\n\nBạn nên bắt đầu với: ${recommended.slice(0, 3).map((opening) => opening.vietnameseName).join(', ')}.\n\n${profile.currentLevel === 'beginner' || profile.currentLevel === 'noob' ? 'Beginner nên học Italian Game hoặc London System vì dễ hiểu, phát triển quân nhanh và nhập thành sớm.' : 'Nếu đã khá hơn, hãy thử Ruy Lopez, Sicilian Defense hoặc King\'s Indian Defense để hiểu các cấu trúc phong phú hơn.'}\n\nNếu muốn luyện cho Trắng: chọn Italian Game/London. Nếu muốn luyện cho Đen: chọn Caro-Kann hoặc French trước khi học Sicilian.`;
}

export function getMockHint({ fen, history = [], level = 'beginner' }) {
  const currentLevel = normalizeLevel(level);
  const guide = LEVEL_GUIDES[currentLevel];

  return `${baseDisclaimer()}

**Gợi ý nước đi**
- ${getFenSummary(fen)}
- ${getMoveSummary(history)}
- Với level ${guide.label}: ${guide.tone}

**Cách tự chọn nước đi tốt:**
1. Tìm nước chiếu, nước ăn quân, hoặc nước tạo đe dọa trực tiếp.
2. Nếu không có tactic rõ ràng, hãy phát triển quân chưa hoạt động hoặc cải thiện an toàn vua.
3. Trước khi đi, hỏi: “Sau nước này, đối thủ có bắt được quân nào miễn phí không?”

**Cá nhân hóa theo tiến độ của bạn**
${getProfileCoaching()}

Mình chưa khẳng định đây là best move vì mock mode không tính toán như engine.`;
}

export function explainMockPosition({ fen, history = [], level = 'beginner' }) {
  const currentLevel = normalizeLevel(level);
  const guide = LEVEL_GUIDES[currentLevel];

  return `${baseDisclaimer()}

**Giải thích thế cờ**
- ${getFenSummary(fen)}
- ${getMoveSummary(history)}
- Mức phân tích: ${guide.label}. ${guide.tone}

**Bạn nên quan sát 4 điểm:**
1. **An toàn vua:** vua đã nhập thành chưa, có đường mở gần vua không?
2. **Quân phát triển:** mã/tượng/xe nào còn đứng thụ động?
3. **Trung tâm:** bên nào kiểm soát các ô trung tâm như e4, d4, e5, d5?
4. **Tactic:** có fork, pin, chiếu đôi hoặc quân nào đang bị treo không?

**Cá nhân hóa theo tiến độ của bạn**
${getProfileCoaching()}

Kết luận mock: hãy ưu tiên nước vừa cải thiện quân, vừa không tạo điểm yếu mới.`;
}

export function reviewMockGame({ history = [], level = 'beginner' }) {
  const currentLevel = normalizeLevel(level);
  const guide = LEVEL_GUIDES[currentLevel];

  if (!Array.isArray(history) || history.length === 0) {
    return `${baseDisclaimer()}

**Review ván**
Ván cờ chưa có nước đi để review. Với level ${guide.label}, mục tiêu đầu ván là:
- Kiểm soát trung tâm.
- Phát triển mã và tượng.
- Nhập thành sớm.
- Không đi một quân quá nhiều lần nếu chưa có lý do tactic.

**Cá nhân hóa theo tiến độ của bạn**
${getProfileCoaching()}`;
  }

  const opening = history.slice(0, 6).join(' ');
  const recent = history.slice(-8).join(' ');

  return `${baseDisclaimer()}

**Review ván cơ bản**
- Khai cuộc / giai đoạn đầu: ${opening}
- Các nước gần đây: ${recent}
- Level ${guide.label}: ${guide.tone}

**Bài học chính:**
1. Kiểm tra nước nào làm mất tempo hoặc để quân bị tấn công.
2. Sau mỗi nước của đối thủ, tìm ý đồ của họ trước khi nghĩ nước của mình.
3. Nếu bạn bị ép phòng thủ, hãy tìm nước đổi quân hoặc phản công bằng chiếu/bắt quân.

**Cá nhân hóa theo tiến độ của bạn**
${getProfileCoaching()}

Mock mode chỉ review theo nguyên tắc; chưa phát hiện blunder chính xác như engine.`;
}

export function askMockCoach({ question = '', fen, history = [], level = 'beginner' }) {
  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes('khai cuộc') ||
    lowerQuestion.includes('opening') ||
    lowerQuestion.includes('trắng hay đen') ||
    openings.some((opening) => lowerQuestion.includes(opening.name.toLowerCase()) || lowerQuestion.includes(opening.vietnameseName.toLowerCase()))
  ) {
    return getOpeningAnswer(question);
  }

  if (
    lowerQuestion.includes('nên học gì') ||
    lowerQuestion.includes('yếu ở đâu') ||
    lowerQuestion.includes('hôm nay') ||
    lowerQuestion.includes('luyện gì') ||
    lowerQuestion.includes('lên level') ||
    lowerQuestion.includes('lộ trình')
  ) {
    return getRecommendationAnswer();
  }

  if (lowerQuestion.includes('gợi ý') || lowerQuestion.includes('nước đi') || lowerQuestion.includes('move')) {
    return getMockHint({ fen, history, level });
  }

  if (lowerQuestion.includes('giải thích') || lowerQuestion.includes('thế cờ') || lowerQuestion.includes('position')) {
    return explainMockPosition({ fen, history, level });
  }

  if (lowerQuestion.includes('review') || lowerQuestion.includes('phân tích ván') || lowerQuestion.includes('ván')) {
    return reviewMockGame({ history, level });
  }

  const currentLevel = normalizeLevel(level);
  const guide = LEVEL_GUIDES[currentLevel];

  return `${baseDisclaimer()}

**Coach trả lời câu hỏi của bạn**
Câu hỏi: “${question || 'Bạn chưa nhập câu hỏi cụ thể.'}”

- ${getFenSummary(fen)}
- ${getMoveSummary(history)}
- Với level ${guide.label}: ${guide.tone}

**Cá nhân hóa theo tiến độ của bạn**
${getProfileCoaching()}

Lời khuyên nhanh: hãy kiểm tra forcing moves trước gồm chiếu, ăn quân và tạo đe dọa. Nếu không có tactic rõ, chọn nước cải thiện quân kém hoạt động nhất và giữ vua an toàn.`;
}
