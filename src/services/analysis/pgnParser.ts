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

    // Reset and replay move by move
    game.reset();
    const moves: ParsedMove[] = [];

    // Load just the moves part
    const movesText = extractMovesFromPgn(pgn);
    const moveTokens = tokenizeMoves(movesText);

    for (let i = 0; i < moveTokens.length; i++) {
      const token = moveTokens[i];
      if (isMoveToken(token)) {
        const move = game.move(token);
        if (move) {
          moves.push({
            san: move.san,
            fen: game.fen(),
            ply: i + 1,
          });
        }
      }
    }

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
 * Extract moves text from PGN (strip headers and comments)
 */
function extractMovesFromPgn(pgn: string): string {
  const lines = pgn.split('\n');
  const moveLines: string[] = [];
  let inHeaders = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (inHeaders) {
      if (trimmed.startsWith('[')) continue;
      inHeaders = false;
    }

    if (!trimmed.startsWith('[')) {
      moveLines.push(trimmed);
    }
  }

  return moveLines.join(' ').replace(/\{[^}]*\}/g, ''); // Remove comments
}

/**
 * Tokenize PGN moves
 */
function tokenizeMoves(text: string): string[] {
  // Remove result at end
  const clean = text
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
    .trim();

  // Split by whitespace and parentheses markers
  const tokens = clean.split(/\s+/);

  return tokens.filter(token => {
    if (token === '' || token === '(' || token === ')') return false;
    if (token.startsWith('(') || token.endsWith(')')) return false;
    return true;
  });
}

/**
 * Check if token is a move
 */
function isMoveToken(token: string): boolean {
  if (!token) return false;
  // Skip result markers
  if (['1-0', '0-1', '1/2-1/2', '*'].includes(token)) return false;
  // Skip move numbers
  if (/^\d+\.+$/.test(token)) return false;
  // Skip variations
  if (token === '(' || token === ')') return false;
  // Must be a chess move
  return /^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?$|^O-O(-O)?[+#]?$/.test(token);
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
