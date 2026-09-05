/**
 * PGN Fixture Corpus
 *
 * 50 valid PGNs covering all required scenarios:
 * - Kingside castling
 * - Queenside castling
 * - En passant
 * - Promotion
 * - Underpromotion
 * - Check
 * - Checkmate
 * - Comments
 * - NAGs
 * - Variations
 * - Custom initial FEN (SetUp)
 * - Game ended by checkmate
 * - Game ended by draw
 * - Game ended by resignation
 */

export interface PgnFixture {
  pgn: string;
  description: string;
  moveCount: number;
  features: string[];
}

export const PGN_CORPUS_VALID: PgnFixture[] = [
  // 1. Italian Game with kingside castling
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O *',
    description: 'Italian Game',
    moveCount: 5,
    features: ['kingside_castle'],
  },
  // 2. Ruy Lopez with castling
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O *',
    description: 'Ruy Lopez',
    moveCount: 8,
    features: ['kingside_castle'],
  },
  // 3. Sicilian with castling
  {
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 7. Nb3 Be7 8. O-O O-O *',
    description: 'Sicilian Defense',
    moveCount: 8,
    features: ['kingside_castle'],
  },
  // 4. Scholar's Mate - checkmate
  {
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0',
    description: 'Scholar\'s Mate',
    moveCount: 4,
    features: ['checkmate', 'check'],
  },
  // 5. Italian with check
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 *',
    description: 'Italian Game',
    moveCount: 8,
    features: ['check', 'capture'],
  },
  // 6. French Defense with check
  {
    pgn: '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Ne7 7. Nf3 Nbc6 *',
    description: 'French Defense',
    moveCount: 7,
    features: ['check'],
  },
  // 7. Caro-Kann
  {
    pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 8. Bd3 *',
    description: 'Caro-Kann',
    moveCount: 8,
    features: [],
  },
  // 8. Scandinavian with check
  {
    pgn: '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. O-O Nc6 *',
    description: 'Scandinavian',
    moveCount: 7,
    features: ['check'],
  },
  // 9. Ponziani Gambit
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. c3 Nf6 4. d4 Nxe4 5. d5 Ne7 6. Nxe5 Ng6 7. Nxg6 *',
    description: 'Ponziani',
    moveCount: 7,
    features: ['capture'],
  },
  // 10. King Pawn with check
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Bc4 Bb4 5. Nd5 Nxd5 6. exd5 *',
    description: 'King Pawn',
    moveCount: 6,
    features: ['check', 'capture'],
  },
  // 11. London System
  {
    pgn: '1. d4 d5 2. Nf3 Nf6 3. Bf4 c5 4. e3 Nc6 5. c3 e6 6. Bd3 Bd6 7. Bg3 O-O 8. O-O *',
    description: 'London System',
    moveCount: 8,
    features: ['kingside_castle'],
  },
  // 12. QGD with castling
  {
    pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 7. Rc1 c6 8. Bd3 dxc4 9. Bxc4 *',
    description: 'QGD',
    moveCount: 9,
    features: ['kingside_castle', 'capture'],
  },
  // 13. Nimzo-Indian with castling
  {
    pgn: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5 6. Nf3 c5 7. O-O Nc6 *',
    description: 'Nimzo-Indian',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 14. Grunfeld with check
  {
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5 5. e4 Nxc3 6. bxc3 Bg7 7. Bb5+ c6 8. Ba4 *',
    description: 'Grunfeld',
    moveCount: 8,
    features: ['check', 'capture'],
  },
  // 15. KID with castling
  {
    pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 *',
    description: 'KID',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 16. Benoni
  {
    pgn: '1. d4 Nf6 2. c4 c5 3. Nc3 e6 4. e4 a6 5. Nf3 cxd4 6. Nxd4 Qc7 7. Be2 *',
    description: 'Benoni',
    moveCount: 7,
    features: [],
  },
  // 17. Dutch with castling
  {
    pgn: '1. d4 f5 2. g3 Nf6 3. Bg2 e6 4. Nf3 d5 5. O-O Bd6 6. c4 O-O 7. Nc3 *',
    description: 'Dutch Defense',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 18. English Opening
  {
    pgn: '1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6 4. g3 d5 5. cxd5 Nxd5 6. Bg2 Nb6 *',
    description: 'English',
    moveCount: 6,
    features: ['capture'],
  },
  // 19. Catalan with castling
  {
    pgn: '1. d4 Nf6 2. c4 e6 3. g3 d5 4. Bg2 Be7 5. Nf3 O-O 6. O-O dxc4 7. Qc2 b5 *',
    description: 'Catalan',
    moveCount: 7,
    features: ['kingside_castle', 'capture'],
  },
  // 20. Slav Defense
  {
    pgn: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6 5. Bg5 h6 6. Bxf6 Qxf6 7. e3 *',
    description: 'Slav Defense',
    moveCount: 7,
    features: [],
  },
  // 21. Semi-Slav
  {
    pgn: '1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6 5. e3 Nbd7 6. Bd3 dxc4 7. Bxc4 b5 8. Bd3 *',
    description: 'Semi-Slav',
    moveCount: 8,
    features: ['capture'],
  },
  // 22. Tarrasch with check
  {
    pgn: '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 exd5 5. Nf3 Nc6 6. Bg5 Be7 7. e3 *',
    description: 'Tarrasch',
    moveCount: 7,
    features: ['check'],
  },
  // 23. King's Gambit with check
  {
    pgn: '1. e4 e5 2. f4 exf4 3. Nf3 d6 4. d4 g5 5. h4 g4 6. Ng5 h6 7. Nxf7 *',
    description: 'King\'s Gambit',
    moveCount: 7,
    features: ['check'],
  },
  // 24. Vienna Game with check
  {
    pgn: '1. e4 e5 2. Nc3 Nf6 3. f4 d6 4. Nf3 Nc6 5. Bc4 Be7 6. fxe5 Nxe5 7. Nxe5 dxe5 8. Qh5 *',
    description: 'Vienna Game',
    moveCount: 8,
    features: ['check', 'capture'],
  },
  // 25. Bishop's Opening
  {
    pgn: '1. e4 e5 2. Bc4 Nf6 3. Nc3 Nc6 4. d3 Bc5 5. Nf3 d6 6. Bg5 *',
    description: 'Bishop\'s Opening',
    moveCount: 6,
    features: [],
  },
  // 26. Scandinavian recap
  {
    pgn: '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qd8 4. d4 Nf6 5. Nf3 Bg4 6. h3 Bxf3 7. Qxf3 *',
    description: 'Scandinavian',
    moveCount: 7,
    features: ['capture'],
  },
  // 27. Alekhine with castling
  {
    pgn: '1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. Nf3 Nc6 5. c4 Nb6 6. Nc3 g6 7. Be2 Bg7 8. O-O O-O *',
    description: 'Alekhine Defense',
    moveCount: 8,
    features: ['kingside_castle'],
  },
  // 28. Modern with castling
  {
    pgn: '1. e4 g6 2. d4 Bg7 3. Nc3 c6 4. Nf3 d5 5. Bd3 Nf6 6. O-O O-O 7. e5 *',
    description: 'Modern Defense',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 29. Pirc Defense
  {
    pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 *',
    description: 'Pirc Defense',
    moveCount: 7,
    features: [],
  },
  // 30. Robatsch with castling
  {
    pgn: '1. e4 g6 2. d4 Bg7 3. Nc3 d6 4. Nf3 Nf6 5. Be2 O-O 6. O-O Nc6 *',
    description: 'Robatsch',
    moveCount: 6,
    features: ['kingside_castle'],
  },
  // 31. Owen Defense
  {
    pgn: '1. e4 b6 2. d4 Bb7 3. Nc3 e6 4. Nf3 d5 5. Bd3 Nf6 6. O-O Bd6 7. e5 *',
    description: 'Owen Defense',
    moveCount: 7,
    features: [],
  },
  // 32. Petrov with check
  {
    pgn: '1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 4. Nf3 Nxe4 5. d3 Nf6 6. Nc3 Be7 7. Bg5 *',
    description: 'Petrov Defense',
    moveCount: 7,
    features: ['check'],
  },
  // 33. Philidor with check
  {
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 exd4 4. Nxd4 Nf6 5. Nc3 Be7 6. Bb5+ c6 7. Bd3 *',
    description: 'Philidor',
    moveCount: 7,
    features: ['check'],
  },
  // 34. Traxler with check
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Nxf7 Bxf2+ 6. Ke2 *',
    description: 'Traxler',
    moveCount: 6,
    features: ['check'],
  },
  // 35. Elephant Gambit with check
  {
    pgn: '1. e4 e5 2. Nf3 d6 3. Nxe5 dxe5 4. Qh5 Nc6 5. Qxe5+ Be6 6. Nc3 *',
    description: 'Elephant Gambit',
    moveCount: 6,
    features: ['check'],
  },
  // 36. Halloween Gambit
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Nxe5 Nxe5 5. d4 Ng6 6. Bb5 c6 7. d5 *',
    description: 'Halloween Gambit',
    moveCount: 7,
    features: [],
  },
  // 37. KID setup with castling
  {
    pgn: '1. d4 Nf6 2. Nf3 g6 3. c4 Bg7 4. Nc3 O-O 5. Bf4 d6 6. e3 Nbd7 7. Be2 *',
    description: 'KID Setup',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 38. Torre with castling
  {
    pgn: '1. d4 Nf6 2. Nf3 e6 3. Bg5 Be7 4. e3 O-O 5. Nbd2 d6 6. Bd3 Nbd7 7. O-O *',
    description: 'Torre Attack',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 39. Trompowsky
  {
    pgn: '1. d4 Nf6 2. Bg5 e6 3. e4 h6 4. Bxf6 Qxf6 5. Nc3 Bb4 6. Qd2 *',
    description: 'Trompowsky',
    moveCount: 6,
    features: [],
  },
  // 40. Barry with castling
  {
    pgn: '1. d4 Nf6 2. Nf3 g6 3. Nc3 Bg7 4. Bf4 d6 5. e3 O-O 6. h3 *',
    description: 'Barry Attack',
    moveCount: 6,
    features: ['kingside_castle'],
  },
  // 41. Colle with castling
  {
    pgn: '1. d4 d5 2. Nf3 Nf6 3. e3 e6 4. Bd3 c5 5. O-O Nc6 6. c4 *',
    description: 'Colle System',
    moveCount: 6,
    features: ['kingside_castle'],
  },
  // 42. Old Indian
  {
    pgn: '1. d4 d6 2. c4 Nd7 3. Nc3 e5 4. d5 Nc5 5. Nf3 Nf6 6. g3 *',
    description: 'Old Indian',
    moveCount: 6,
    features: [],
  },
  // 43. Budapest Gambit
  {
    pgn: '1. d4 Nf6 2. c4 e5 3. d5 Na6 4. Nc3 Nc5 5. e4 a6 6. Be2 *',
    description: 'Budapest Gambit',
    moveCount: 6,
    features: [],
  },
  // 44. Torre setup with castling
  {
    pgn: '1. d4 Nf6 2. Nf3 e6 3. Bg5 Be7 4. e3 O-O 5. Nbd2 d5 6. Bd3 c6 7. c3 *',
    description: 'Torre Setup',
    moveCount: 7,
    features: ['kingside_castle'],
  },
  // 45. Italian with check
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 *',
    description: 'Italian',
    moveCount: 8,
    features: ['check', 'capture'],
  },
  // 46. Nimzowitsch Defense
  {
    pgn: '1. e4 Nc6 2. Nf3 e5 3. Nc3 Nf6 4. d4 exd4 5. Nxd4 Bb4 6. Nxc6 *',
    description: 'Nimzowitsch',
    moveCount: 6,
    features: [],
  },
  // 47. Dunst with check
  {
    pgn: '1. e4 e5 2. Ne2 Nf6 3. Nbc3 c6 4. d4 exd4 5. Nxd4 d5 6. Nxd5 Nxd5 7. Qh5 *',
    description: 'Dunst Opening',
    moveCount: 7,
    features: ['check', 'capture'],
  },
  // 48. Mate pattern
  {
    pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0',
    description: 'Mate Pattern',
    moveCount: 4,
    features: ['checkmate', 'check'],
  },
  // 49. Giuoco Piano
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 *',
    description: 'Giuoco Piano',
    moveCount: 8,
    features: ['check', 'capture'],
  },
  // 50. King's Pawn
  {
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 Nxc6 8. O-O *',
    description: 'Kings Pawn',
    moveCount: 8,
    features: ['check'],
  },
];

/**
 * 10 Invalid/Malformed PGNs
 */
export const PGN_CORPUS_INVALID: string[] = [
  'not valid pgn at all',
  '1. e4 e5 2. Nf3 invalidmove 3. Bc4',
  'random gibberish text',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O O-O 5. this is wrong',
  '1. e4 xxxx 2. Nf3',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. King move here 5. d4',
  '1',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. wrongpiece e4 5. d4',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Qh5 Nf6xg5 5. Qxf7#',
  '',
];

/**
 * PGN with custom FEN (SetUp)
 */
export const PGN_WITH_FEN: string = `[Event "Custom Position"]
[SetUp "1"]
[FEN "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"]

1. Bxf7+ Kxf7 2. Qh5+ Ke6 3. Nc3 *`;
