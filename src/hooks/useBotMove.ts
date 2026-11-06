import { useState, useCallback, useRef, useEffect } from 'react';
import { getBotMove } from '../services/botService';
import type { BotMoveResult } from '../types/ChessTypes';

interface UseBotMoveOptions {
  botElo?: number;
  onMoveComplete?: (move: BotMoveResult, gameGenId: number) => void;
  /** Timeout in ms for bot move request. Default 15000ms. */
  timeoutMs?: number;
}

interface UseBotMoveReturn {
  isThinking: boolean;
  lastMove: BotMoveResult | null;
  requestId: number;
  getMove: (fen: string, gameGenId?: number) => Promise<BotMoveResult>;
  cancelMove: () => void;
}

/**
 * Hook for managing bot move requests with proper cancellation.
 * Uses a private request token to prevent stale responses from being applied.
 * Includes timeout handling to prevent infinite loading.
 *
 * gameGenId is callback metadata; request freshness is tracked independently.
 */
export function useBotMove(options: UseBotMoveOptions = {}): UseBotMoveReturn {
  const { botElo = 1200, onMoveComplete, timeoutMs = 15000 } = options;

  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<BotMoveResult | null>(null);
  const [requestId, setRequestId] = useState(0);

  // Request freshness must not depend on caller-supplied game generations.
  const requestTokenRef = useRef(0);
  // Track active abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track timeout ID for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelMove = useCallback(() => {
    requestTokenRef.current += 1;
    // Clear any pending timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
  }, []);

  const getMove = useCallback(
    async (fen: string, gameGenId?: number): Promise<BotMoveResult> => {
      // Cancel any pending move first
      cancelMove();

      const requestToken = requestTokenRef.current;
      const callbackGameGenId = gameGenId ?? requestToken;
      const staleResult: BotMoveResult = {
        move: null,
        source: 'stale',
        elo: botElo,
        depth: 0,
        movetime: 0,
        skillLevel: 0,
        warning: 'Stale response ignored',
      };
      setRequestId(requestToken);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsThinking(true);

      // Create timeout to prevent infinite loading
      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<BotMoveResult>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error('TIMEOUT'));
        }, timeoutMs);
        timeoutRef.current = timeoutId;
      });

      try {
        // Race between bot move and timeout
        const result = await Promise.race([
          getBotMove(fen, botElo, controller.signal),
          timeoutPromise,
        ]);

        // Check if this response is still valid (request not cancelled/stale)
        if (requestTokenRef.current !== requestToken) {
          return staleResult;
        }

        setLastMove(result);
        onMoveComplete?.(result, callbackGameGenId);
        return result;
      } catch (error) {
        // Check if this request is still current before handling error
        if (requestTokenRef.current !== requestToken) {
          return staleResult;
        }

        const isTimeout = timedOut || (error instanceof Error && error.message === 'TIMEOUT');
        const errorResult: BotMoveResult = {
          move: null,
          source: isTimeout ? 'timeout' : 'error',
          elo: botElo,
          depth: 0,
          movetime: 0,
          skillLevel: 0,
          warning: isTimeout ? 'Bot move timed out' : (error instanceof Error ? error.message : 'Unknown error'),
        };

        setLastMove(errorResult);
        onMoveComplete?.(errorResult, callbackGameGenId);
        return errorResult;
      } finally {
        // Always clear timeout
        window.clearTimeout(timeoutId!);
        if (timeoutRef.current === timeoutId!) {
          timeoutRef.current = null;
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        // Only clear thinking state if this is still the current request
        if (requestTokenRef.current === requestToken) {
          setIsThinking(false);
        }
      }
    },
    [botElo, onMoveComplete, cancelMove, timeoutMs]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelMove();
    };
  }, [cancelMove]);

  return {
    isThinking,
    lastMove,
    requestId,
    getMove,
    cancelMove,
  };
}
