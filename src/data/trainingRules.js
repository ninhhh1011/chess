export const TRAINING_RULES = [
  {
    mistakeTag: 'hanging_piece',
    label: 'Hay treo quân',
    recommendedLesson: 'Không treo quân',
    recommendedLessonId: 'khong-treo-quan',
    recommendedExerciseTags: ['hanging_piece', 'board_vision'],
    message: 'Bạn nên luyện thói quen kiểm tra quân đang bị tấn công trước khi đi.',
  },
  {
    mistakeTag: 'missed_mate',
    label: 'Bỏ lỡ chiếu hết',
    recommendedLesson: 'Chiếu hết trong 1 nước',
    recommendedLessonId: 'chieu-het-1-nuoc',
    recommendedExerciseTags: ['checkmate', 'mate_in_one'],
    message: 'Hãy ưu tiên tìm nước chiếu và thế chiếu hết trước khi chọn nước yên lặng.',
  },
  {
    mistakeTag: 'king_safety',
    label: 'Vua thiếu an toàn',
    recommendedLesson: 'An toàn vua và nhập thành',
    recommendedLessonId: 'an-toan-vua',
    recommendedExerciseTags: ['king_safety', 'castling'],
    message: 'Bạn nên nhập thành sớm và tránh mở quá nhiều đường gần vua.',
  },
  {
    mistakeTag: 'early_queen',
    label: 'Đưa hậu ra quá sớm',
    recommendedLesson: 'Phát triển quân trước khi tấn công',
    recommendedLessonId: 'phat-trien-quan',
    recommendedExerciseTags: ['development', 'opening'],
    message: 'Đừng đưa hậu ra quá sớm nếu chưa có tactic rõ ràng.',
  },
  {
    mistakeTag: 'poor_development',
    label: 'Phát triển quân chậm',
    recommendedLesson: 'Nguyên tắc khai cuộc',
    recommendedLessonId: 'nguyen-tac-khai-cuoc',
    recommendedExerciseTags: ['development', 'opening'],
    message: 'Hãy đưa mã/tượng ra, kiểm soát trung tâm và nhập thành.',
  },
  {
    mistakeTag: 'weak_opening',
    label: 'Khai cuộc yếu',
    recommendedLesson: 'Khai cuộc cơ bản',
    recommendedLessonId: 'khai-cuoc-co-ban',
    recommendedExerciseTags: ['opening', 'center_control'],
    message: 'Bạn nên học nguyên tắc kiểm soát trung tâm và phát triển quân.',
  },
  {
    mistakeTag: 'missed_tactic',
    label: 'Bỏ lỡ tactic',
    recommendedLesson: 'Nhận diện tactic cơ bản',
    recommendedLessonId: 'tactic-co-ban',
    recommendedExerciseTags: ['fork', 'pin', 'double_attack'],
    message: 'Mỗi lượt hãy kiểm tra chiếu, ăn quân và đe dọa trước.',
  },
  {
    mistakeTag: 'endgame_basic',
    label: 'Endgame cơ bản yếu',
    recommendedLesson: 'Tàn cuộc cơ bản',
    recommendedLessonId: 'tan-cuoc-co-ban',
    recommendedExerciseTags: ['endgame', 'promotion'],
    message: 'Hãy luyện phong cấp tốt, vua hỗ trợ tốt và chiếu hết cơ bản.',
  },
];

export function getRuleByMistake(tag) {
  return TRAINING_RULES.find((rule) => rule.mistakeTag === tag);
}
