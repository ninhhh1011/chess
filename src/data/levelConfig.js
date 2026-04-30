export const LEVEL_ORDER = ['noob', 'beginner', 'intermediate', 'advanced'];

export const LEVEL_CONFIG = {
  noob: {
    label: 'Mới bắt đầu',
    description: 'Làm quen bàn cờ, cách đi quân và các luật cơ bản.',
    badgeClass: 'bg-sky-400/15 text-sky-100 border-sky-300/30',
    mainGoal: 'Học cách đi quân và hoàn thành các bài tập cơ bản.',
  },
  beginner: {
    label: 'Sơ cấp',
    description: 'Tập không treo quân, chiếu hết đơn giản và an toàn vua.',
    badgeClass: 'bg-emerald-400/15 text-emerald-100 border-emerald-300/30',
    mainGoal: 'Giảm lỗi cơ bản và chơi thêm ván thực hành.',
  },
  intermediate: {
    label: 'Trung cấp',
    description: 'Luyện tactic, tính toán và nhận diện motif chiến thuật.',
    badgeClass: 'bg-amber-400/15 text-amber-100 border-amber-300/30',
    mainGoal: 'Luyện fork, pin, skewer, double attack và review ván.',
  },
  advanced: {
    label: 'Nâng cao',
    description: 'Tập kế hoạch dài hạn, cấu trúc tốt, endgame và khai cuộc.',
    badgeClass: 'bg-fuchsia-400/15 text-fuchsia-100 border-fuchsia-300/30',
    mainGoal: 'Chuẩn bị tích hợp Stockfish/AI Coach thật cho phân tích sâu.',
  },
};

export function getLevelConfig(level) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG.noob;
}
