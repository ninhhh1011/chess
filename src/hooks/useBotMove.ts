import { useState, useCallback, useRef, useEffect } from 'react';
import { getBotMove } from '../services/botService';
import type { BotMoveResult } from '../types/ChessTypes';

interface UseBotMoveOptions {
  botElo?: number;
  onMoveStart?: () => void;
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
 * Uses requestId (gameGenId) tracking to prevent stale responses from being applied.
 * Includes timeout handling to prevent infinite loading.
 *
 * IMPORTANT: gameGenId must be passed to distinguish between requests from different games
 * that may have the same initial FEN. This prevents old game responses from affecting new games.
 */
export function useBotMove(options: UseBotMoveOptions = {}): UseBotMoveReturn {
  const { botElo = 1200, onMoveStart, onMoveComplete, timeoutMs = 15000 } = options;

  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<BotMoveResult | null>(null);
  const [requestId, setRequestId] = useState(0);

  // Track current game generation ID to ignore stale responses
  const currentGameGenIdRef = useRef(0);
  // Track active abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track timeout ID for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelMove = useCallback(() => {
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

      // Use provided gameGenId or increment
      const genId = gameGenId !== undefined ? gameGenId : currentGameGenIdRef.current + 1;
      currentGameGenIdRef.current = genId;
      setRequestId(genId);

      abortControllerRef.current = new AbortController();
      setIsThinking(true);
      onMoveStart?.();

      // Create timeout to prevent infinite loading
      const timeoutPromise = new Promise<BotMoveResult>((_, reject) => {
        timeoutRef.current = window.setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, timeoutMs);
      });

      try {
        // Race between bot move and timeout
        const result = await Promise.race([
          getBotMove(fen, botElo),
          timeoutPromise,
        ]);

        // Check if this response is still valid (request not cancelled/stale)
        if (currentGameGenIdRef.current !== genId) {
          console.debug('[useBotMove] Ignoring stale response', { genId, current: currentGameGenIdRef.current });
          return lastMove || { move: null, source: 'stale', warning: 'Stale response ignored' };
        }

        setLastMove(result);
        onMoveComplete?.(result, genId);
        return result;
      } catch (error) {
        // Check if this request is still current before handling error
        if (currentGameGenIdRef.current !== genId) {
          return lastMove || { move: null, source: 'stale', warning: 'Stale response ignored' };
        }

        const isTimeout = error instanceof Error && error.message === 'TIMEOUT';
        const errorResult: BotMoveResult = {
          move: null,
          source: isTimeout ? 'timeout' : 'error',
          warning: isTimeout ? 'Bot move timed out' : (error instanceof Error ? error.message : 'Unknown error'),
        };

        setLastMove(errorResult);
        onMoveComplete?.(errorResult, genId);
        return errorResult;
      } finally {
        // Always clear timeout
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // Only clear thinking state if this is still the current request
        if (currentGameGenIdRef.current === genId) {
          setIsThinking(false);
        }
      }
    },
    [botElo, onMoveStart, onMoveComplete, cancelMove, lastMove, timeoutMs]
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
