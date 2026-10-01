/**
 * PGN Parser and Game Replay
 *
 * Supports:
 * - Standard PGN format
 * - Comments (curly braces)
 * - NAGs (Numeric Annotation Glyphs)
 * - Variations (parentheses)
 * - Castling (O-O, O-O-O)
 * - En passant
 * - Promotion
 * - Check/Checkmate notation
 */

import { Chess } from 'chess.js';
import type { PgnImportResult } from '../../types/analysis';

export interface ParsedMove {
  san: string;
  uci: string;
  fenBefore: string;
  fen: string;
  ply: number;
  comment?: string;
  nag?: string;
}

export interface ParsedGame {
  headers: Record<string, string>;
  moves: ParsedMove[];
  result?: string;
  finalFen: string;
}

/**
 * Parse PGN string into structured data
 */
export function parsePgn(pgn: string): PgnImportResult {
  // Handle empty or whitespace-only input
  const trimmed = pgn.trim();
  if (trimmed === '') {
    return {
      success: false,
      pgn: '',
      headers: {},
      moves: [],
      error: 'Empty PGN',
    };
  }

  try {
    const game = new Chess();
    game.loadPgn(pgn);

    const headers: Record<string, string> = {};
    const pgnHeaders = game.header();
    for (const [key, value] of Object.entries(pgnHeaders)) {
      if (value) headers[key] = value;
    }

    // Extract moves from PGN
    const moves: string[] = [];
    const history = game.history({ verbose: false });

    return {
      success: true,
      pgn: pgn.trim(),
      headers,
      moves: history,
      result: headers['Result'] || '*',
    };
  } catch (error) {
    return {
      success: false,
      pgn: pgn.trim(),
      headers: {},
      moves: [],
      error: error instanceof Error ? error.message : 'Invalid PGN',
    };
  }
}

/**
 * Replay PGN and return each position
 */
export function replayPgn(pgn: string): ParsedGame | null {
  try {
    const game = new Chess();
    game.loadPgn(pgn);

    const headers: Record<string, string> = {};
    const pgnHeaders = game.header();
    for (const [key, value] of Object.entries(pgnHeaders)) {
      if (value) headers[key] = value;
    }

    const comments = new Map(game.getComments().map(({ fen, comment }) => [fen, comment]));
    const moves: ParsedMove[] = game.history({ verbose: true }).map((move, index) => ({
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion || ''}`,
      fenBefore: move.before,
      fen: move.after,
      ply: index + 1,
      ...(comments.has(move.after) ? { comment: comments.get(move.after) } : {}),
    }));

    return {
      headers,
      moves,
      result: headers['Result'] || '*',
      finalFen: game.fen(),
    };
  } catch {
    return null;
  }
}

/**
 * Validate PGN corpus
 */
export function validatePgnCorpus(pgns: string[]): {
  valid: string[];
  invalid: Array<{ pgn: string; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ pgn: string; error: string }> = [];

  for (const pgn of pgns) {
    const result = parsePgn(pgn);
    if (result.success) {
      valid.push(pgn);
    } else {
      invalid.push({ pgn, error: result.error || 'Unknown error' });
    }
  }

  return { valid, invalid };
}

/**
 * Generate a simple PGN from moves
 */
export function generatePgn(
  moves: string[],
  headers?: Record<string, string>
): string {
  let pgn = '';

  // Add headers
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      pgn += `[${key} "${value}"]\n`;
    }
    pgn += '\n';
  }

  // Add moves with move numbers
  let moveNum = 1;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (i % 2 === 0) {
      pgn += `${moveNum}. ${move} `;
    } else {
      pgn += `${move} `;
      moveNum++;
    }
  }

  return pgn.trim();
}

/**
 * Test PGN fixtures - now imported from pgnFixtures.ts
 * For backward compatibility
 */
export { PGN_CORPUS_VALID, PGN_CORPUS_INVALID, PGN_WITH_FEN } from './pgnFixtures';
import type { PgnFixture } from './pgnFixtures';

export type { PgnFixture } from './pgnFixtures';
