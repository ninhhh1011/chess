import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { getGameOutcome, getPlayerResult } from './gameOutcome';

describe('canonical game outcome', () => {
  it('has no result for an unfinished position', () => {
    expect(getGameOutcome(new Chess())).toBeNull();
    expect(getPlayerResult(null, 'w')).toBeNull();
  });

  it.each(['w', 'b'] as const)('maps %s winners relative to either player color', (winner) => {
    for (const reason of ['checkmate', 'resignation'] as const) {
      const outcome = { reason, winner };
      expect(getPlayerResult(outcome, winner)).toBe('win');
      expect(getPlayerResult(outcome, winner === 'w' ? 'b' : 'w')).toBe('lose');
    }
  });

  it.each([
    ['7k/6Q1/5K2/8/8/8/8/8 b - - 0 1', 'w'],
    ['8/8/8/8/8/5k2/6q1/7K w - - 0 1', 'b'],
  ] as const)('derives the checkmate winner from %s', (fen, winner) => {
    expect(getGameOutcome(new Chess(fen))).toEqual({ reason: 'checkmate', winner });
  });

  it.each([
    ['stalemate', '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'],
    ['insufficient material', '7k/8/5K2/8/8/8/8/8 w - - 0 1'],
    ['fifty move rule', '7k/8/5K2/8/8/8/8/R7 w - - 100 51'],
  ])('uses chess.js %s adjudication', (_, fen) => {
    const outcome = getGameOutcome(new Chess(fen));
    expect(outcome).toEqual({ reason: 'draw', winner: null });
    expect(getPlayerResult(outcome, 'w')).toBe('draw');
    expect(getPlayerResult(outcome, 'b')).toBe('draw');
  });

  it('uses chess.js threefold repetition adjudication', () => {
    const game = new Chess();
    for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) game.move(san);
    expect(game.isThreefoldRepetition()).toBe(true);
    expect(getGameOutcome(game)).toEqual({ reason: 'draw', winner: null });
  });
});
