import { useState, useCallback, useRef, useEffect } from 'react';
import { getBotMove } from '../services/botService';
import type { BotMoveResult } from '../types/ChessTypes';

interface UseBotMoveOptions {
  botElo?: number;
  onMoveStart?: () => void;
  onMoveComplete?: (move: BotMoveResult) => void;
}

interface UseBotMoveReturn {
  isThinking: boolean;
  lastMove: BotMoveResult | null;
  getMove: (fen: string) => Promise<BotMoveResult>;
  cancelMove: () => void;
}

export function useBotMove(options: UseBotMoveOptions = {}): UseBotMoveReturn {
  const { botElo = 1200, onMoveStart, onMoveComplete } = options;

  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<BotMoveResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelMove = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
  }, []);

  const getMove = useCallback(
    async (fen: string): Promise<BotMoveResult> => {
      // Cancel any pending move
      cancelMove();

      abortControllerRef.current = new AbortController();
      setIsThinking(true);
      onMoveStart?.();

      try {
        const result = await getBotMove(fen, botElo);
        setLastMove(result);
        onMoveComplete?.(result);
        return result;
      } finally {
        setIsThinking(false);
      }
    },
    [botElo, onMoveStart, onMoveComplete, cancelMove]
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
    getMove,
    cancelMove,
  };
}
