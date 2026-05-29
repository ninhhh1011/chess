import { describe, it, expect, vi } from 'vitest';
import { getChessStatus, getTurnLabel, sameMove } from './chessStatus';

describe('chessStatus', () => {
  describe('getChessStatus', () => {
    it('returns checkmate status', () => {
      const mockGame = {
        isCheckmate: () => true,
        isDraw: () => false,
        isCheck: () => true,
      };
      expect(getChessStatus(mockGame)).toEqual({ label: 'Chiếu hết', tone: 'danger' });
    });

    it('returns draw status', () => {
      const mockGame = {
        isCheckmate: () => false,
        isDraw: () => true,
        isCheck: () => false,
      };
      expect(getChessStatus(mockGame)).toEqual({ label: 'Hòa', tone: 'muted' });
    });

    it('returns check status', () => {
      const mockGame = {
        isCheckmate: () => false,
        isDraw: () => false,
        isCheck: () => true,
      };
      expect(getChessStatus(mockGame)).toEqual({ label: 'Đang bị chiếu', tone: 'warning' });
    });

    it('returns playing status', () => {
      const mockGame = {
        isCheckmate: () => false,
        isDraw: () => false,
        isCheck: () => false,
      };
      expect(getChessStatus(mockGame)).toEqual({ label: 'Đang chơi', tone: 'success' });
    });
  });

  describe('getTurnLabel', () => {
    it('returns White turn label', () => {
      expect(getTurnLabel({ turn: () => 'w' })).toBe('Trắng đi');
    });

    it('returns Black turn label', () => {
      expect(getTurnLabel({ turn: () => 'b' })).toBe('Đen đi');
    });
  });

  describe('sameMove', () => {
    it('returns true for same moves without promotion', () => {
      expect(sameMove({ from: 'e2', to: 'e4' }, { from: 'e2', to: 'e4' })).toBe(true);
    });

    it('returns false for different moves', () => {
      expect(sameMove({ from: 'e2', to: 'e4' }, { from: 'e2', to: 'e3' })).toBe(false);
    });

    it('returns true for same moves with same promotion', () => {
      expect(sameMove({ from: 'e7', to: 'e8', promotion: 'q' }, { from: 'e7', to: 'e8', promotion: 'q' })).toBe(true);
    });

    it('returns false for different promotions', () => {
      expect(sameMove({ from: 'e7', to: 'e8', promotion: 'q' }, { from: 'e7', to: 'e8', promotion: 'r' })).toBe(false);
    });
  });
});
