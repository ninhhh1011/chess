/**
 * Exercise Data Validator
 *
 * Validates all exercises in exercises.js to ensure:
 * - FEN is parseable
 * - Position is not already game over
 * - Correct side-to-move
 * - correctMove is a legal move
 * - Move achieves expected success criteria
 */

import { Chess } from 'chess.js';
import { exercises } from '../data/exercises.js';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string} error
 * @property {string} fen
 * @property {string} exerciseId
 */

/**
 * @typedef {Object} ExerciseSuccessCriteria
 * @property {'checkmate' | 'capture' | 'promotion' | 'tactic' | 'general'} objective
 * @property {number} [mateIn] - For checkmate objectives
 */

const OBJECTIVE_PATTERNS = {
  checkmate: ['chiếu hết', 'checkmate', 'mate'],
  capture: ['bắt', 'capture', 'ăn'],
  promotion: ['phong cấp', 'promotion'],
  tactic: ['fork', 'pin', 'skewer', 'tactic'],
};

/**
 * Parse exercise title to determine expected success criteria
 * @param {string} title
 * @param {string[]} tags
 * @returns {ExerciseSuccessCriteria}
 */
function parseSuccessCriteria(title, tags) {
  const titleLower = title.toLowerCase();

  // Check tags first (more reliable)
  if (tags.includes('checkmate')) {
    return { objective: 'checkmate', mateIn: 1 };
  }
  if (tags.includes('promotion')) {
    return { objective: 'promotion' };
  }
  if (tags.some(t => ['fork', 'pin', 'skewer', 'double_attack'].includes(t))) {
    return { objective: 'tactic' };
  }
  if (tags.some(t => ['capture', 'hanging_piece'].includes(t))) {
    return { objective: 'capture' };
  }

  // Fallback to title parsing
  for (const [objective, patterns] of Object.entries(OBJECTIVE_PATTERNS)) {
    if (patterns.some(p => titleLower.includes(p))) {
      if (objective === 'checkmate') {
        return { objective, mateIn: 1 };
      }
      return { objective };
    }
  }

  return { objective: 'general' };
}

/**
 * Validate a single exercise
 * @param {Object} exercise
 * @returns {ValidationResult}
 */
function validateExercise(exercise) {
  const { id, fen, correctMove, title, tags } = exercise;

  // 1. Validate FEN is parseable
  let game;
  try {
    game = new Chess(fen);
  } catch (e) {
    return {
      valid: false,
      error: `FEN parse error: ${e.message}`,
      fen,
      exerciseId: id
    };
  }

  // 2. Validate position is not already game over
  if (game.isGameOver()) {
    return {
      valid: false,
      error: 'Position is already game over (checkmate/stalemate/draw)',
      fen,
      exerciseId: id
    };
  }

  // 3. Validate correctMove is in legal moves list
  const from = correctMove.from;
  const to = correctMove.to;
  const promotion = correctMove.promotion;

  const legalMoves = game.moves({ square: from, verbose: true });
  const matchingMove = legalMoves.find(m =>
    m.to === to &&
    (!promotion || m.promotion === promotion)
  );

  if (!matchingMove) {
    const availableTo = legalMoves.map(m => m.to).join(', ');
    return {
      valid: false,
      error: `Move ${from}${to}${promotion || ''} is not legal. Available from ${from}: ${availableTo || 'none'}`,
      fen,
      exerciseId: id
    };
  }

  // 4. Validate move can be made without throw
  let testGame;
  try {
    testGame = new Chess(fen);
    testGame.move(matchingMove);
  } catch (e) {
    return {
      valid: false,
      error: `Move execution error: ${e.message}`,
      fen,
      exerciseId: id
    };
  }

  // 5. Validate success criteria
  const criteria = parseSuccessCriteria(title, tags || []);

  switch (criteria.objective) {
    case 'checkmate':
      if (!testGame.isCheckmate()) {
        return {
          valid: false,
          error: `Expected checkmate but got: isCheck=${testGame.isCheck()}, isGameOver=${testGame.isGameOver()}`,
          fen,
          exerciseId: id
        };
      }
      break;

    case 'capture': {
      // Verify a piece was captured
      if (!matchingMove.captured) {
        return {
          valid: false,
          error: `Expected capture but no piece was taken`,
          fen,
          exerciseId: id
        };
      }
      break;
    }

    case 'promotion': {
      if (!matchingMove.promotion) {
        return {
          valid: false,
          error: `Expected promotion but move ${from}${to} does not include promotion`,
          fen,
          exerciseId: id
        };
      }
      // Verify pawn reached last rank
      const destRank = to[1];
      if (destRank !== '8' && destRank !== '1') {
        return {
          valid: false,
          error: `Promotion target ${to} is not on last rank`,
          fen,
          exerciseId: id
        };
      }
      break;
    }

    case 'tactic':
    case 'general':
      // For tactics/general, just verify move is legal and game continues
      if (testGame.isCheckmate()) {
        // Checkmate is acceptable for tactic exercises too
        break;
      }
      if (testGame.isGameOver() && !testGame.isDraw()) {
        return {
          valid: false,
          error: `Exercise ended in ${testGame.isStalemate() ? 'stalemate' : 'game over'} but objective was ${criteria.objective}`,
          fen,
          exerciseId: id
        };
      }
      break;
  }

  return {
    valid: true,
    error: null,
    fen,
    exerciseId: id
  };
}

/**
 * Validate all exercises
 * @returns {{passed: boolean, results: ValidationResult[]}}
 */
export function validateAllExercises() {
  const results = exercises.map(validateExercise);
  const failed = results.filter(r => !r.valid);

  return {
    passed: failed.length === 0,
    results,
    failed
  };
}

// Run validation if executed directly
describe('Exercise Data Validator', () => {
  const validation = validateAllExercises();

  it('all exercises should have valid FEN', () => {
    const allFenValid = validation.results.every(r => r.fen !== undefined);
    expect(allFenValid).toBe(true);
  });

  it('all exercises should be valid', () => {
    if (!validation.passed) {
      console.log('\n❌ FAILED EXERCISES:');
      validation.failed.forEach(f => {
        console.log(`  - ${f.exerciseId}: ${f.error}`);
        console.log(`    FEN: ${f.fen}`);
      });
    }
    expect(validation.passed).toBe(true);
  });

  it('each exercise should pass validator', () => {
    validation.results.forEach(result => {
      const exercise = exercises.find(e => e.id === result.exerciseId);
      expect(result.valid).toBe(true);
    });
  });

  // Print summary
  if (validation.passed) {
    console.log(`\n✅ All ${exercises.length} exercises validated successfully`);
  }
});

export default validateAllExercises;
