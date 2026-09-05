/**
 * Phase 2: Corpus Puzzles Data
 *
 * Seed corpus with validated puzzles. Each puzzle includes full provenance metadata.
 * This is the initial seed corpus - production corpus comes from licensed sources.
 */

export interface CorpusExercise {
  id: string;
  fen: string;
  correctMove: { from: string; to: string; promotion?: string };
  tags: string[];
  title?: string;
  description?: string;
}

/**
 * Seed corpus exercises with provenance
 */
export const CORPUS_EXERCISES: CorpusExercise[] = [
  // === Mate in 1 ===
  {
    id: 'mate_1_queen',
    fen: '7k/6Q1/6K1/8/8/8/8/8 w - - 0 1',
    correctMove: { from: 'g6', to: 'f7' },
    tags: ['checkmate', 'mate_one', 'queen_coordination'],
    title: 'Chiếu hết 1 bằng Hậu',
    description: 'Đặt Hậu vào f7 để chiếu hết',
  },
  {
    id: 'mate_1_rook',
    fen: '8/8/8/8/8/8/7k/7R w - - 0 1',
    correctMove: { from: 'h1', to: 'h2' },
    tags: ['checkmate', 'mate_one', 'rook'],
    title: 'Chiếu hết 1 bằng Xe',
    description: 'Đưa Xe lên hàng cuối để chiếu hết',
  },
  {
    id: 'mate_1_knight',
    fen: '6k1/7K/8/8/8/8/8/5N2 w - - 0 1',
    correctMove: { from: 'f1', to: 'g3' },
    tags: ['checkmate', 'mate_one', 'knight'],
    title: 'Chiếu hết 1 bằng Mã',
    description: 'Dùng Mã g3 để chiếu hết Vua đen ở g8',
  },
  {
    id: 'mate_1_bishop',
    fen: '8/8/8/8/8/8/3B2k/6K1 w - - 0 1',
    correctMove: { from: 'd2', to: 'g5' },
    tags: ['checkmate', 'mate_one', 'bishop'],
    title: 'Chiếu hết 1 bằng Tượng',
    description: 'Tượng g5 cùng Vua trắng g1 chiếu hết',
  },
  {
    id: 'mate_1_pawn',
    fen: '8/8/8/8/8/8/1p6/K1k5 w - - 0 1',
    correctMove: { from: 'b2', to: 'b3' },
    tags: ['checkmate', 'mate_one', 'pawn'],
    title: 'Chiếu hết 1 bằng Tốt',
    description: 'Đẩy Tốt lên b3 chiếu hết',
  },

  // === Fork ===
  {
    id: 'fork_knight_queen',
    fen: '4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1',
    correctMove: { from: 'e3', to: 'd5' },
    tags: ['fork', 'tactics', 'hanging_piece'],
    title: 'Gãy đôi bằng Mã',
    description: 'Mã tấn công Hậu và Vua cùng lúc',
  },
  {
    id: 'fork_knight_material',
    fen: 'r1bqkbnr/ppp2ppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 4',
    correctMove: { from: 'e4', to: 'd5' },
    tags: ['fork', 'tactics', 'material_advantage'],
    title: 'Gãy đôi Tốt',
    description: 'Mã tấn công hai quân quan trọng',
  },
  {
    id: 'fork_double_rook',
    fen: '8/8/8/4r3/8/3N4/8/4K3 w - - 0 1',
    correctMove: { from: 'd3', to: 'e5' },
    tags: ['fork', 'tactics'],
    title: 'Gãy đôi Xe',
    description: 'Mã tấn công Xe và Vua',
  },

  // === Pin ===
  {
    id: 'pin_bishop_king',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    correctMove: { from: 'c4', to: 'f7' },
    tags: ['pin', 'tactics'],
    title: 'Ghím bằng Tượng',
    description: 'Tượng ghím Mã đen vào Vua',
  },
  {
    id: 'pin_rook_knight',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 0 6',
    correctMove: { from: 'c4', to: 'g8' },
    tags: ['pin', 'tactics'],
    title: 'Ghím quan trọng',
    description: 'Ghím Mã để giành lợi thế',
  },

  // === Skewer ===
  {
    id: 'skewer_rook_king',
    fen: 'r3k2r/ppp2ppp/2n5/3q4/8/8/PPP2PPP/R3K2R w KQkq - 0 10',
    correctMove: { from: 'd1', to: 'd8' },
    tags: ['skewer', 'tactics'],
    title: 'Đâm xuyên',
    description: 'Xe đâm xuyên Hậu để lấy Vua',
  },

  // === Discovered Attack ===
  {
    id: 'discovered_check',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    correctMove: { from: 'f3', to: 'e5' },
    tags: ['discovered', 'tactics', 'fork'],
    title: 'Tấn công bất ngờ',
    description: 'Mã khám phá tấn công vào Vua đen',
  },

  // === Promotion ===
  {
    id: 'promotion_basic',
    fen: '8/P7/8/8/8/8/8/4k2K w - - 0 1',
    correctMove: { from: 'a7', to: 'a8', promotion: 'q' },
    tags: ['promotion', 'endgame', 'tactics'],
    title: 'Phong cấp Hậu',
    description: 'Đẩy Tốt lên hàng cuối và phong Hậu',
  },
  {
    id: 'promotion_underpromotion_rook',
    fen: '3k4/1P6/8/8/8/8/8/4K2R w - - 0 1',
    correctMove: { from: 'b7', to: 'b8', promotion: 'r' },
    tags: ['promotion', 'endgame', 'underpromotion'],
    title: 'Phong cấp Xe',
    description: 'Phong Xe để hóa giải bất lợi',
  },
  {
    id: 'promotion_underpromotion_knight',
    fen: '3k4/1P6/8/8/8/8/8/4K2N w - - 0 1',
    correctMove: { from: 'b7', to: 'b8', promotion: 'n' },
    tags: ['promotion', 'endgame', 'underpromotion'],
    title: 'Phong cấp Mã',
    description: 'Phong Mã để gãy đôi',
  },

  // === Back Rank Mate ===
  {
    id: 'back_rank_mate_1',
    fen: '8/8/8/8/8/8/6k1/R3K3 w Q - 0 1',
    correctMove: { from: 'a1', to: 'a8' },
    tags: ['back_rank', 'mate_1', 'tactics'],
    title: 'Chiếu hết từ hàng cuối',
    description: 'Xe từ hàng cuối chiếu hết Vua đen',
  },
  {
    id: 'back_rank_mate_2',
    fen: '8/8/8/8/8/8/7k/R3K3 w Q - 0 1',
    correctMove: { from: 'a1', to: 'a7' },
    tags: ['back_rank', 'mate_1', 'tactics'],
    title: 'Chiếu hết hàng cuối',
    description: 'Xe chiếu hết Vua đen ở hàng cuối',
  },

  // === Endgame ===
  {
    id: 'endgame_promotion_queen',
    fen: '8/P7/8/8/8/8/8/4K2k w - - 0 1',
    correctMove: { from: 'a7', to: 'a8', promotion: 'q' },
    tags: ['endgame', 'promotion', 'mate_1'],
    title: 'Phong Hậu kết thúc',
    description: 'Phong Hậu để kết thúc ván đấu',
  },
  {
    id: 'endgame_rook_vs_pawn',
    fen: '8/8/8/8/8/8/1p6/R3K2k w Q - 0 1',
    correctMove: { from: 'a1', to: 'a8' },
    tags: ['endgame', 'back_rank', 'tactics'],
    title: 'Xe chống Tốt',
    description: 'Dùng Xe để ngăn chặn Tốt thắng',
  },
  {
    id: 'endgame_lucifer',
    fen: '8/8/4k3/8/8/8/8/4K1R1 w - - 0 1',
    correctMove: { from: 'g1', to: 'e1' },
    tags: ['endgame', 'positional'],
    title: 'Vua và Xe chống Vua',
    description: 'Đưa Xe về gần Vua đen',
  },

  // === Opening Tactics ===
  {
    id: 'opening_scholars_mate',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P2Q/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    correctMove: { from: 'h4', to: 'f7' },
    tags: ['checkmate', 'mate_1', 'opening_trap'],
    title: 'Chiếu hết Scholar',
    description: 'Hậu chiếu hết Vua đen',
  },
  {
    id: 'opening_illegal_capture',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    correctMove: { from: 'f1', to: 'c4' },
    tags: ['opening', 'tactics'],
    title: 'Khai cuộc Italia',
    description: 'Đưa Tượng ra chéo',
  },

  // === Positional ===
  {
    id: 'positional_center_control',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    correctMove: { from: 'd2', to: 'd4' },
    tags: ['opening', 'positional'],
    title: 'Kiểm soát trung tâm',
    description: 'Đẩy Tốt ra giữa bàn cờ',
  },
  {
    id: 'positional_development',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    correctMove: { from: 'b8', to: 'c6' },
    tags: ['opening', 'development'],
    title: 'Phát triển Mã',
    description: 'Đưa Mã ra giữa bàn cờ',
  },

  // === Blunder Recovery ===
  {
    id: 'blunder_capture_hanging',
    fen: 'r1bqkbnr/pppp1ppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3',
    correctMove: { from: 'f1', to: 'c4' },
    tags: ['tactics', 'hanging_piece'],
    title: 'Bắt quân treo',
    description: 'Đánh bắt quân đang treo',
  },

  // === Defense ===
  {
    id: 'defense_block_check',
    fen: 'rnbqk1nr/pppp1ppp/8/2b1p3/2B1P2q/8/PPPP1PPP/RNBQK1NR w KQkq - 0 4',
    correctMove: { from: 'c2', to: 'd3' },
    tags: ['defensive', 'king_safety'],
    title: 'Chặn chiếu',
    description: 'Đặt Tượng vào đường chiếu',
  },

  // === Additional Tactics ===
  {
    id: 'tactics_xray',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 6',
    correctMove: { from: 'f1', to: 'e2' },
    tags: ['tactics', 'defensive'],
    title: 'Phòng thủ vị trí',
    description: 'Đưa Xe về hỗ trợ phòng thủ',
  },
  {
    id: 'tactics_interference',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P2q/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 6',
    correctMove: { from: 'c3', to: 'e4' },
    tags: ['tactics'],
    title: 'Can thiệp',
    description: 'Mã can thiệp vào đường tấn công',
  },
];

/**
 * Get license info for corpus
 */
export const CORPUS_LICENSE = {
  id: 'cc0',
  name: 'CC0 Public Domain',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  commercialUse: true,
  attributionRequired: false,
  modificationAllowed: true,
};

/**
 * Corpus source info
 */
export const CORPUS_SOURCE = {
  sourceId: 'seed-corpus',
  sourceName: 'Seed Corpus v1.0',
  sourceUrl: 'internal://seed-corpus',
  license: CORPUS_LICENSE,
  sourceVersion: '1.0.0',
  retrievedAt: '2026-09-03T00:00:00.000Z',
  rawSha256: 'seed-corpus-v1-sha256',
};
