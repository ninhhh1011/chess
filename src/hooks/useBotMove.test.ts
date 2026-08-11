import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { useBotMove } from './useBotMove';
import * as botService from '../services/botService';

vi.mock('../services/botService', () => ({
  getBotMove: vi.fn(),
  uciToMoveObject: vi.fn(),
}));

describe('useBotMove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMove', () => {
    it('returns bot move result and manages isThinking state', async () => {
      const mockMoveResult = { move: 'e7e5', source: 'stockfish' };
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMoveResult);

      const onMoveStart = vi.fn();
      const onMoveComplete = vi.fn();

      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveStart,
          onMoveComplete,
        })
      );

      // Initially not thinking
      expect(result.current.isThinking).toBe(false);
      expect(result.current.lastMove).toBe(null);

      // Trigger getMove
      await act(async () => {
        await result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      });

      // Should have completed and updated state
      expect(result.current.isThinking).toBe(false);
      expect(result.current.lastMove).toEqual(mockMoveResult);
      expect(onMoveStart).toHaveBeenCalled();
      expect(onMoveComplete).toHaveBeenCalledWith(mockMoveResult);
    });

    it('calls onMoveStart callback when move begins', async () => {
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ move: 'e7e5', source: 'stockfish' }), 50))
      );

      const onMoveStart = vi.fn();

      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveStart,
        })
      );

      // Start the move
      const movePromise = result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

      // Wait for isThinking to become true
      await waitFor(() => expect(result.current.isThinking).toBe(true));
      expect(onMoveStart).toHaveBeenCalled();

      // Wait for completion
      await act(async () => {
        await movePromise;
      });

      expect(result.current.isThinking).toBe(false);
    });

    it('handles cancelMove correctly', async () => {
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ move: 'e7e5', source: 'stockfish' }), 100))
      );

      const { result } = renderHook(() => useBotMove({ botElo: 1200 }));

      // Start move
      const movePromise = result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

      // Wait for isThinking to become true
      await waitFor(() => expect(result.current.isThinking).toBe(true));

      // Cancel
      await act(async () => {
        result.current.cancelMove();
      });
      expect(result.current.isThinking).toBe(false);

      // Clean up the pending promise
      act(() => {
        result.current.cancelMove();
      });
    });

    it('uses default botElo of 1200', async () => {
      const mockMoveResult = { move: 'e7e5', source: 'stockfish' };
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMoveResult);

      const { result } = renderHook(() => useBotMove());

      await act(async () => {
        await result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      });

      expect(botService.getBotMove).toHaveBeenCalledWith(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        1200 // default
      );
    });
  });
});
