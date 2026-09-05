/**
 * =====================================================================
 * PROTOTYPE_ONLY FIXTURE DATA — OPTION C
 * =====================================================================
 * CẢNH BÁO QUAN TRỌNG:
 * File này CHỈ DÙNG CHO MỤC ĐÍCH PROTOTYPE UI trong thư mục ui-lab/.
 * TUYỆT ĐỐI KHÔNG import vào ứng dụng production.
 * TUYỆT ĐỐI KHÔNG sử dụng các khóa production localStorage.
 * KHÔNG gọi prototype data này là dữ liệu thật.
 * =====================================================================
 */

export interface MoveItem {
  number: number;
  white: string;
  black?: string;
  isCurrent?: boolean;
  whiteClassification?: 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  blackClassification?: 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

export interface MistakeReviewItem {
  id: string;
  moveNumber: number;
  turn: 'w' | 'b';
  playedSan: string;
  bestSan: string;
  classification: 'mistake' | 'blunder' | 'inaccuracy';
  evalLoss: number;
  reason: string;
  skillTag: string;
  fenBefore: string;
}

export interface DailyTaskItem {
  id: string;
  type: 'lesson' | 'puzzle' | 'challenge';
  title: string;
  durationOrDiff: string;
  reason: string;
  skillTag: string;
  completed: boolean;
  actionLabel: string;
}

export interface SkillProgressItem {
  id: string;
  name: string;
  score: number;
  progressText: string;
  status: 'Cần chú ý' | 'Đang tiến bộ' | 'Vững vàng' | 'Tốt';
  trend: 'up' | 'down' | 'steady';
}

// 12 Nước cờ mô phỏng ván cờ Italian Game phát triển Hậu sớm
export const PROTOTYPE_MOVES: MoveItem[] = [
  { number: 1, white: 'e4', black: 'e5', whiteClassification: 'best', blackClassification: 'best' },
  { number: 2, white: 'Nf3', black: 'Nc6', whiteClassification: 'best', blackClassification: 'best' },
  { number: 3, white: 'Bc4', black: 'Bc5', whiteClassification: 'best', blackClassification: 'best' },
  { number: 4, white: 'c3', black: 'Nf6', whiteClassification: 'good', blackClassification: 'best' },
  { number: 5, white: 'd4', black: 'exd4', whiteClassification: 'best', blackClassification: 'best' },
  { number: 6, white: 'cxd4', black: 'Bb4+', whiteClassification: 'best', blackClassification: 'best' },
  { number: 7, white: 'Bd2', black: 'Bxd2+', whiteClassification: 'good', blackClassification: 'good' },
  { number: 8, white: 'Nbxd2', black: 'd5', whiteClassification: 'best', blackClassification: 'best' },
  { number: 9, white: 'exd5', black: 'Nxd5', whiteClassification: 'good', blackClassification: 'best' },
  { number: 10, white: 'Qb3', black: 'Nce7', whiteClassification: 'good', blackClassification: 'good' },
  { number: 11, white: 'O-O', black: 'O-O', whiteClassification: 'best', blackClassification: 'best' },
  { number: 12, white: 'Qh5?', black: 'Nf4', whiteClassification: 'mistake', blackClassification: 'best', isCurrent: true },
];

// 3 Lỗi quan trọng nhất của ván cờ (Screen 4 Review)
export const PROTOTYPE_MISTAKES: MistakeReviewItem[] = [
  {
    id: 'mst-1',
    moveNumber: 12,
    turn: 'w',
    playedSan: 'Qh5',
    bestSan: 'Nf3',
    classification: 'mistake',
    evalLoss: 1.8,
    reason: 'Hậu đi sớm và làm chậm phát triển quân, tạo điều kiện cho Đen phản kích.',
    skillTag: 'Phát triển quân',
    fenBefore: 'r1bq1rk1/ppp1nppp/8/3n4/3P4/1Q3N2/PP1N1PPP/R4RK1 w - - 4 12',
  },
  {
    id: 'mst-2',
    moveNumber: 15,
    turn: 'w',
    playedSan: 'Bxf7+',
    bestSan: 'Rad1',
    classification: 'blunder',
    evalLoss: 3.4,
    reason: 'Hy sinh quân Tượng vội vã khi chưa có quân yểm trợ, mất trắng chất.',
    skillTag: 'Quân bị treo',
    fenBefore: 'r1bq1rk1/ppp2ppp/8/3n4/1b1P1n2/1Q3N2/PP1N1PPP/R4RK1 w - - 0 15',
  },
  {
    id: 'mst-3',
    moveNumber: 8,
    turn: 'w',
    playedSan: 'Nbxd2',
    bestSan: 'Qxd2',
    classification: 'inaccuracy',
    evalLoss: 0.7,
    reason: 'Cản trở cột d của Xe sau khi nhập thành, khiến Đen dễ mở cờ.',
    skillTag: 'Khai cuộc & Cột mở',
    fenBefore: 'r1bqk2r/pppp1ppp/2n5/4p3/2BP4/5N2/PP1b1PPP/RNBQK2R w KQkq - 0 8',
  },
];

// Đúng 5 nhiệm vụ ngày theo đặc tả Section 13: 1 lesson, 3 puzzles, 1 challenge
export const PROTOTYPE_DAILY_TASKS: DailyTaskItem[] = [
  {
    id: 'task-lesson-1',
    type: 'lesson',
    title: 'Bài học: Nguyên tắc an toàn cho Hậu đầu ván',
    durationOrDiff: '5 phút lý thuyết',
    reason: 'Được đề xuất vì bạn xuất Hậu quá sớm ở nước 12 trong ván cờ gần nhất.',
    skillTag: 'Phát triển quân',
    completed: true,
    actionLabel: 'Ôn lại bài học',
  },
  {
    id: 'task-puzzle-1',
    type: 'puzzle',
    title: 'Puzzle: Quân bị treo',
    durationOrDiff: 'Cơ bản · 3 câu',
    reason: 'Được chọn vì bạn đã bỏ quân không được bảo vệ trong ván gần nhất.',
    skillTag: 'Quân bị treo',
    completed: false,
    actionLabel: 'Giải bài tập',
  },
  {
    id: 'task-puzzle-2',
    type: 'puzzle',
    title: 'Puzzle: Phát hiện Mã phản kích',
    durationOrDiff: 'Vừa · 3 câu',
    reason: 'Rèn luyện khả năng quan sát các ô vuông đe dọa từ Mã của đối phương.',
    skillTag: 'Nhận diện đe dọa',
    completed: false,
    actionLabel: 'Giải bài tập',
  },
  {
    id: 'task-puzzle-3',
    type: 'puzzle',
    title: 'Puzzle: Tận dụng cột d mở',
    durationOrDiff: 'Vừa · 3 câu',
    reason: 'Khắc phục việc xếp quân cản trở Xe kiểm soát trung tâm ở nước 8.',
    skillTag: 'Cột mở trung tâm',
    completed: false,
    actionLabel: 'Giải bài tập',
  },
  {
    id: 'task-challenge-1',
    type: 'challenge',
    title: 'Thử thách: Ván đấu không mắc Blunder',
    durationOrDiff: '1 ván đấu với máy',
    reason: 'Mục tiêu áp dụng nguyên tắc kiểm tra an toàn quân cờ ở cấp độ Vừa.',
    skillTag: 'Thực chiến có kiểm soát',
    completed: false,
    actionLabel: 'Bắt đầu ván',
  },
];

// Danh mục kỹ năng (Section 13)
export const PROTOTYPE_SKILLS: SkillProgressItem[] = [
  {
    id: 'skill-development',
    name: 'Phát triển quân & Khai cuộc',
    score: 68,
    progressText: '+6% tuần này',
    status: 'Cần chú ý',
    trend: 'up',
  },
  {
    id: 'skill-undefended',
    name: 'Nhận diện quân bị treo',
    score: 74,
    progressText: '+12% tuần này',
    status: 'Đang tiến bộ',
    trend: 'up',
  },
  {
    id: 'skill-tactics',
    name: 'Chiến thuật cơ bản (Tactics)',
    score: 82,
    progressText: '+4% tuần này',
    status: 'Tốt',
    trend: 'up',
  },
  {
    id: 'skill-endgame',
    name: 'Tàn cuộc Vua & Tốt',
    score: 58,
    progressText: '-2% gần đây',
    status: 'Cần chú ý',
    trend: 'down',
  },
];
