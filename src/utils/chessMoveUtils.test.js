import { describe, it, expect } from 'vitest';
import { getSanFromUci, formatEvaluation } from './chessMoveUtils';

describe('chessMoveUtils', () => {
  describe('getSanFromUci', () => {
    it('converts UCI to SAN for pawn move', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(getSanFromUci(fen, 'e2e4')).toBe('e4');
    });

    it('converts UCI to SAN for knight move', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(getSanFromUci(fen, 'g1f3')).toBe('Nf3');
    });

    it('returns null for invalid UCI', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(getSanFromUci(fen, 'invalid')).toBe(null);
    });
  });

  describe('formatEvaluation', () => {
    it('formats positive evaluation (White advantage)', () => {
      expect(formatEvaluation({ type: 'cp', value: 150 })).toBe('+1.50');
    });

    it('formats negative evaluation (Black advantage)', () => {
      expect(formatEvaluation({ type: 'cp', value: -150 })).toBe('-1.50');
    });

    it('formats exactly zero', () => {
      expect(formatEvaluation({ type: 'cp', value: 0 })).toBe('+0.00');
    });

    it('formats mate for White', () => {
      expect(formatEvaluation({ type: 'mate', value: 3 })).toBe('Mate in 3');
    });

    it('formats mate for Black', () => {
      expect(formatEvaluation({ type: 'mate', value: -3 })).toBe('Mate in -3');
    });
  });
});
