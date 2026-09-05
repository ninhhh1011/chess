/**
 * Evaluation Orientation System
 *
 * All evaluations are normalized to: WHITE's perspective
 *
 * This means:
 * - Positive score = White is better
 * - Negative score = Black is better
 * - Mate scores preserve sign (mate in N for white = +N)
 *
 * Before computing centipawn loss, both evaluations MUST be normalized
 * to the same perspective (the side about to move).
 */

/**
 * Normalize evaluation to white's perspective
 * @param eval_ - Raw evaluation from engine
 * @param sideToMove - Side that generated this evaluation ('w' or 'b')
 * @returns Evaluation normalized to white's perspective
 */
export function normalizeEvalToWhite(
  eval_: { type: 'cp' | 'mate'; value: number; depth?: number },
  sideToMove: 'w' | 'b'
): { type: 'cp' | 'mate'; value: number; depth?: number } {
  if (sideToMove === 'w') {
    return eval_; // Already from white's perspective
  }

  // Flip for black's perspective
  if (eval_.type === 'cp') {
    return { ...eval_, value: -eval_.value };
  }

  // For mate, flipping side also flips the sign
  // mate: 3 means "mate in 3 for side to move"
  // If black to move says mate: 3, white is losing, so it's -3
  return { ...eval_, value: -eval_.value };
}

/**
 * Convert UCI move score to centipawn loss
 * @param playedEval - Evaluation after played move (normalized to white)
 * @param bestEval - Evaluation after best move (normalized to white)
 * @returns Centipawn loss (positive = worse, 0 = best move)
 */
export function calculateCPL(
  playedEval: { type: 'cp' | 'mate'; value: number; depth?: number },
  bestEval: { type: 'cp' | 'mate'; value: number; depth?: number }
): number | null {
  // If either is mate, we can't compute simple CPL
  if (playedEval.type === 'mate' || bestEval.type === 'mate') {
    // Special case: mate found vs mate missed
    if (playedEval.type === 'mate' && bestEval.type === 'mate') {
      // Both find mate, but different distances
      return Math.abs(playedEval.value - bestEval.value) * 100;
    }
    // One found mate, other didn't - big difference
    if (playedEval.type === 'mate') return 0; // Best move missed mate
    if (bestEval.type === 'mate') return 900; // Played move missed mate
    return null;
  }

  // Simple case: both centipawn
  return Math.round(bestEval.value - playedEval.value);
}

/**
 * Classify a move based on centipawn loss
 * @param cpl - Centipawn loss (positive = worse)
 * @param evalBefore - Evaluation before the move (normalized to white)
 * @returns Move classification
 */
export function classifyMove(
  cpl: number | null,
  evalBefore: { type: 'cp' | 'mate'; value: number }
): 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'forced' | 'unclassified' {
  if (cpl === null) return 'unclassified';
  if (cpl === 0) return 'best';

  // In pawns (100 centipawns = 1 pawn)
  const pawnLoss = cpl / 100;

  if (pawnLoss <= 0.1) return 'excellent';
  if (pawnLoss <= 0.3) return 'good';
  if (pawnLoss <= 0.8) return 'inaccuracy';
  if (pawnLoss <= 2.0) return 'mistake';
  return 'blunder';
}

/**
 * Determine skill tags based on move characteristics
 */
export function determineSkillTags(
  move: {
    san: string;
    piece: string;
    isCapture: boolean;
    isCheck: boolean;
    isMate: boolean;
  },
  evalDelta: number,
  position: {
    isBackRank: boolean;
    isHanging: boolean;
    isOpening: boolean;
    isEndgame: boolean;
  }
): string[] {
  const tags: string[] = [];

  // Tactical oversights
  if (move.isCapture && !position.isHanging) {
    // Missed a capture
  }

  if (move.isCheck && !move.isCapture) {
    // Missed tactical check
  }

  // Piece-specific
  if (move.piece === 'p') {
    // Pawn move
    if (position.isOpening) {
      tags.push('opening_principle');
    }
  }

  // Position-specific
  if (position.isBackRank) {
    tags.push('back_rank');
  }

  if (position.isEndgame && evalDelta < -100) {
    tags.push('endgame_conversion');
  }

  if (position.isHanging) {
    tags.push('hung_piece');
  }

  if (evalDelta < -150 && !move.isCapture) {
    tags.push('tactical_oversight');
  }

  return tags.length > 0 ? tags : ['unclassified'];
}

/**
 * Convert engine evaluation to our format
 * Engine typically returns: cp X or mate Y (always from engine's perspective)
 */
export function parseEngineEval(
  engineOutput: string
): { type: 'cp' | 'mate'; value: number } | null {
  // Format: "cp 35" or "mate 3"
  const cpMatch = engineOutput.match(/cp\s+(-?\d+)/);
  if (cpMatch) {
    return { type: 'cp', value: parseInt(cpMatch[1], 10) };
  }

  const mateMatch = engineOutput.match(/mate\s+(-?\d+)/);
  if (mateMatch) {
    return { type: 'mate', value: parseInt(mateMatch[1], 10) };
  }

  return null;
}

/**
 * Test helpers
 */
export const TEST_Fixtures = {
  // White plays a blunder
  whiteBlunder: {
    fenBefore: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    played: 'Bxf7+', // Blunder - should not take
    best: 'Nc3',    // Development
    evalBefore: { type: 'cp' as const, value: 30, depth: 10 },
    evalAfterPlayed: { type: 'cp' as const, value: -150, depth: 10 },
    evalAfterBest: { type: 'cp' as const, value: 50, depth: 10 },
  },
  // Black misses mate
  blackMissedMate: {
    fenBefore: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1',
    played: 'a6', // Misses Qxf2#
    best: 'Qxf2#',
    evalBefore: { type: 'cp' as const, value: 500, depth: 10 },
    evalAfterPlayed: { type: 'cp' as const, value: 500, depth: 10 },
    evalAfterBest: { type: 'mate' as const, value: 1, depth: 10 },
  },
  // Equal position - best move
  equalBestMove: {
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    played: 'e4',
    best: 'e4',
    evalBefore: { type: 'cp' as const, value: 0, depth: 10 },
    evalAfterPlayed: { type: 'cp' as const, value: 30, depth: 10 },
    evalAfterBest: { type: 'cp' as const, value: 30, depth: 10 },
  },
};
