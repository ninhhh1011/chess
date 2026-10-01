import { Chess } from 'chess.js';

export function validateExerciseRecord(exercise) {
  if (!exercise || typeof exercise !== 'object') return { valid: false, error: 'Exercise must be an object' };

  const { id, title, description, hint, fen, correctMove, tags } = exercise;
  if (![id, title, description, hint, fen].every((value) => typeof value === 'string' && value.trim())) {
    return { valid: false, exerciseId: id, fen, error: 'Required text field is missing' };
  }
  if (!Array.isArray(tags) || !tags.length || !correctMove || typeof correctMove.from !== 'string' || typeof correctMove.to !== 'string') {
    return { valid: false, exerciseId: id, fen, error: 'Tags or correctMove are invalid' };
  }

  try {
    const game = new Chess(fen);
    if (game.isGameOver()) return { valid: false, exerciseId: id, fen, error: 'Position is already game over' };

    const move = game.move(correctMove);
    if (!move) return { valid: false, exerciseId: id, fen, error: 'correctMove is illegal' };
    if (tags.includes('checkmate') && !game.isCheckmate()) {
      return { valid: false, exerciseId: id, fen, error: 'Move does not achieve checkmate' };
    }
    if (tags.includes('promotion') && (!move.promotion || move.promotion !== correctMove.promotion)) {
      return { valid: false, exerciseId: id, fen, error: 'Move does not achieve the declared promotion' };
    }
    if (tags.some((tag) => tag === 'capture' || tag === 'hanging_piece') && !move.captured) {
      return { valid: false, exerciseId: id, fen, error: 'Move does not achieve the declared capture' };
    }

    return { valid: true, exerciseId: id, fen, error: null };
  } catch (error) {
    return { valid: false, exerciseId: id, fen, error: error instanceof Error ? error.message : 'Invalid exercise' };
  }
}

export function validateExerciseRecords(records) {
  if (!Array.isArray(records)) return { passed: false, results: [], failed: [] };
  const results = records.map(validateExerciseRecord);
  const failed = results.filter((result) => !result.valid);
  return { passed: failed.length === 0, results, failed };
}
