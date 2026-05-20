import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for Stockfish Web Worker integration
 * Handles debouncing, request cancellation, and automatic fallback
 */
export function useStockfishWorker() {
  const [bestMove, setBestMove] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'stockfish' or 'fallback_minimax'

  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const pendingRequestRef = useRef(null);

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker('/stockfish-worker-v2.js');

      workerRef.current.onmessage = (e) => {
        const { type, requestId, data, error: workerError } = e.data;

        if (type === 'ready') {
          if (!data?.success && workerError) {
            setError(workerError);
          }
        } else if (type === 'analysis_complete') {
          // Only process if this is the current request
          if (requestId === pendingRequestRef.current) {
            setBestMove(data.bestMove);
            setEvaluation(data.evaluation);
            setSource(data.source);
            setIsThinking(false);
            setError(null);
            pendingRequestRef.current = null;
          }
        } else if (type === 'analysis_error') {
          if (requestId === pendingRequestRef.current) {
            setError(workerError);
            setIsThinking(false);
            pendingRequestRef.current = null;
          }
        }
      };

      workerRef.current.onerror = (err) => {
        console.error('[useStockfishWorker] Worker error:', err);
        setError('Worker crashed');
        setIsThinking(false);
      };

      // Initialize engine
      workerRef.current.postMessage({ type: 'init' });

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    } catch (err) {
      console.error('[useStockfishWorker] Init error:', err);
      setError('Failed to initialize worker');
    }
  }, []);

  /**
   * Analyze a position with debouncing (leading edge, 300ms)
   * Automatically cancels stale requests
   */
  const analyze = useCallback(
    ({ fen, depth = 10, movetime = null, skillLevel = null, elo = null }) => {
      if (!workerRef.current) {
        setError('Worker not initialized');
        return;
      }

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Leading edge: execute immediately if not currently thinking
      if (!isThinking) {
        executeAnalysis({ fen, depth, movetime, skillLevel, elo });
      } else {
        // Debounce subsequent requests
        debounceTimerRef.current = setTimeout(() => {
          executeAnalysis({ fen, depth, movetime, skillLevel, elo });
        }, 300);
      }
    },
    [isThinking]
  );

  const executeAnalysis = ({ fen, depth, movetime, skillLevel, elo }) => {
    const requestId = ++requestIdRef.current;
    pendingRequestRef.current = requestId;

    setIsThinking(true);
    setError(null);

    workerRef.current.postMessage({
      type: 'analyze',
      requestId,
      fen,
      depth,
      movetime,
      skillLevel,
      elo
    });
  };

  /**
   * Stop current analysis
   */
  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      setIsThinking(false);
      pendingRequestRef.current = null;
    }
  }, []);

  /**
   * Clear results
   */
  const clear = useCallback(() => {
    setBestMove(null);
    setEvaluation(null);
    setSource(null);
    setError(null);
  }, []);

  return {
    bestMove,
    evaluation,
    isThinking,
    error,
    source,
    analyze,
    stop,
    clear
  };
}
