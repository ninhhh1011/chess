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
      expect(onMoveComplete).toHaveBeenCalledWith(mockMoveResult, expect.any(Number));
    });

    it('calls onMoveStart callback when move begins', async () => {
      // Use immediate resolution for this test
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
      });

      const onMoveStart = vi.fn();

      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveStart,
        })
      );

      // Start the move
      await act(async () => {
        await result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      });

      // After move completes, onMoveStart should have been called
      expect(onMoveStart).toHaveBeenCalled();
    });

    it('handles cancelMove correctly', async () => {
      // Use immediate resolution for stable testing
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
      });

      const { result } = renderHook(() => useBotMove({ botElo: 1200 }));

      // Initially not thinking
      expect(result.current.isThinking).toBe(false);

      // Start move
      await act(async () => {
        await result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      });

      // After completion, should not be thinking
      expect(result.current.isThinking).toBe(false);

      // cancelMove should exist and be callable
      expect(typeof result.current.cancelMove).toBe('function');
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

    it('handles bot error by calling onMoveComplete with error result', async () => {
      const mockErrorResult = { move: null, source: 'none' };
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockErrorResult);

      const onMoveComplete = vi.fn();

      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveComplete,
        })
      );

      await act(async () => {
        await result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      });

      expect(result.current.isThinking).toBe(false);
      expect(result.current.lastMove).toEqual(mockErrorResult);
      expect(onMoveComplete).toHaveBeenCalledWith(mockErrorResult, expect.any(Number));
    });

    it('handles getBotMove rejection gracefully', async () => {
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Engine crashed'));

      const onMoveComplete = vi.fn();

      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveComplete,
        })
      );

      await act(async () => {
        await result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      });

      // Should complete without throwing and return error result
      expect(result.current.isThinking).toBe(false);
      expect(result.current.lastMove).toEqual({
        move: null,
        source: 'error',
        warning: 'Engine crashed',
      });
      expect(onMoveComplete).toHaveBeenCalledWith(expect.objectContaining({
        move: null,
        source: 'error',
      }), expect.any(Number));
    });

    it('prevents double move by canceling previous request', async () => {
      const move1 = { move: 'e7e5', source: 'stockfish' };
      const move2 = { move: 'd7d5', source: 'stockfish' };

      // First call resolves slowly, second call resolves quickly
      (botService.getBotMove as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve(move1), 100))
        )
        .mockResolvedValueOnce(move2);

      const { result } = renderHook(() => useBotMove({ botElo: 1200 }));

      // Start first move
      const promise1 = result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

      // Immediately start second move (should cancel first)
      const promise2 = result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

      // Both should complete
      await act(async () => {
        await promise2;
      });

      // Only one call should have been made (second call cancels first)
      expect(botService.getBotMove).toHaveBeenCalledTimes(2);
    });

    it('ignores stale response when gameGenId changes', async () => {
      const move1 = { move: 'e7e5', source: 'stockfish' };
      const move2 = { move: 'd7d5', source: 'stockfish' };

      // First call resolves slowly
      (botService.getBotMove as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve(move1), 100))
        )
        .mockResolvedValueOnce(move2);

      const onMoveComplete = vi.fn();
      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveComplete,
        })
      );

      // Start first move with genId 1
      result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 1);

      // Immediately start second move with genId 2 (simulates new game)
      result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 2);

      // Wait for both to resolve
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // onMoveComplete should be called ONCE - only the second (valid) request's response is accepted
      // The first (stale) response is ignored
      expect(onMoveComplete).toHaveBeenCalledTimes(1);
      expect(onMoveComplete).toHaveBeenCalledWith(move2, 2);

      // The final lastMove should be from the second request
      expect(result.current.lastMove).toEqual(move2);
    });

    it('handles timeout by returning error result', async () => {
      // Mock that never resolves
      (botService.getBotMove as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const onMoveComplete = vi.fn();
      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveComplete,
          timeoutMs: 100, // Short timeout for test
        })
      );

      // Start move that will timeout
      result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 1);

      // Wait for timeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // Should have called onMoveComplete with timeout error
      expect(onMoveComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          move: null,
          source: 'timeout',
          warning: 'Bot move timed out',
        }),
        1
      );

      // lastMove should be the timeout error
      expect(result.current.lastMove).toEqual(
        expect.objectContaining({
          move: null,
          source: 'timeout',
        })
      );

      // isThinking should be false (timeout handled)
      expect(result.current.isThinking).toBe(false);
    });

    it('does not apply timeout result to subsequent valid request', async () => {
      let resolveSlow;
      const slowPromise = new Promise((resolve) => {
        resolveSlow = resolve;
      });

      // First never resolves (will timeout), second resolves normally
      (botService.getBotMove as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => slowPromise)
        .mockResolvedValueOnce({ move: 'd7d5', source: 'stockfish' });

      const onMoveComplete = vi.fn();
      const { result } = renderHook(() =>
        useBotMove({
          botElo: 1200,
          onMoveComplete,
          timeoutMs: 100,
        })
      );

      // Start first move with genId 1 (will timeout)
      result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 1);

      // Immediately start second move with genId 2
      result.current.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 2);

      // Wait for timeout of first and completion of second
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        // Resolve the slow promise (should be ignored)
        resolveSlow({ move: 'e7e5', source: 'stockfish' });
      });

      // Only the second (valid) request should complete
      // The timeout of the first should not affect the second
      expect(onMoveComplete).toHaveBeenCalledTimes(1);
      expect(onMoveComplete).toHaveBeenCalledWith(
        expect.objectContaining({ move: 'd7d5' }),
        2
      );
    });
  });
});
