import { evaluationForReview, moverEvaluationDelta } from '../../domain/engine/evaluation';

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
 * Stored and displayed engine evaluations remain in White's perspective.
 * Mover-relative deltas apply the mover's sign only while measuring loss.
 */

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
  return Math.max(0, Math.round(evaluationForReview(bestEval) - evaluationForReview(playedEval)));
}

export function calculateMoverCPL(
  evalBefore: { type: 'cp' | 'mate'; value: number; depth?: number },
  evalAfter: { type: 'cp' | 'mate'; value: number; depth?: number },
  mover: 'w' | 'b'
): number | null {
  return Math.max(0, Math.round(-moverEvaluationDelta(evalBefore, evalAfter, mover)));
}

/**
 * Classify a move based on centipawn loss
 * @param cpl - Centipawn loss (positive = worse)
 * @returns Move classification
 */
export function classifyMove(cpl: number | null): 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'forced' | 'unclassified' {
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
  centipawnLoss: number,
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

  if (position.isEndgame && centipawnLoss > 100) {
    tags.push('endgame_conversion');
  }

  if (position.isHanging) {
    tags.push('hung_piece');
  }

  if (centipawnLoss > 150 && !move.isCapture) {
    tags.push('tactical_oversight');
  }

  return tags.length > 0 ? tags : ['unclassified'];
}

/**
 * Convert engine evaluation to our format
 * Raw UCI score token, before the Stockfish service normalizes to White POV.
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
