import type { Chess, Color } from 'chess.js';

export type GameOutcome =
  | { reason: 'checkmate' | 'resignation' | 'timeout'; winner: Color }
  | { reason: 'draw'; winner: null };

export function getGameOutcome(game: Chess): GameOutcome | null {
  if (game.isCheckmate()) return { reason: 'checkmate', winner: game.turn() === 'w' ? 'b' : 'w' };
  return game.isDraw() ? { reason: 'draw', winner: null } : null;
}

export function getPlayerResult(outcome: GameOutcome | null, playerColor: Color): 'win' | 'lose' | 'draw' | null {
  if (!outcome) return null;
  if (outcome.reason === 'draw') return 'draw';
  return outcome.winner === playerColor ? 'win' : 'lose';
}
