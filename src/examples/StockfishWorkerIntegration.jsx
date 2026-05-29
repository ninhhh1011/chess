/**
 * Example Integration: Using useStockfishWorker in ChessGameBoard
 *
 * This demonstrates how to replace the old stockfishService with the new worker-based hook
 */

import { useEffect } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useStockfishWorker } from '../hooks/useStockfishWorker';

export default function ChessGameBoardWithWorker() {
  const {
    currentFen,
    analysisMode,
    isBotThinking,
    setEngineHint,
  } = useChessGame();

  // Initialize Stockfish worker hook
  const {
    bestMove,
    evaluation,
    isThinking,
    error,
    source,
    analyze,
    stop,
    clear
  } = useStockfishWorker();

  // Live analysis: analyze current position whenever FEN changes
  useEffect(() => {
    if (analysisMode || !isBotThinking) {
      // Debounced analysis with automatic cancellation of stale requests
      analyze({
        fen: currentFen,
        depth: 8,
        movetime: 400
      });
    }

    return () => {
      // Cleanup: stop analysis when component unmounts or FEN changes
      stop();
    };
  }, [currentFen, analysisMode, isBotThinking, analyze, stop]);

  // Update engine hint when analysis completes
  useEffect(() => {
    if (bestMove && evaluation) {
      setEngineHint({
        bestMove,
        fen: currentFen,
        evaluation,
        source
      });
    }
  }, [bestMove, evaluation, currentFen, source, setEngineHint]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('[ChessGameBoard] Stockfish error:', error);
      // Could show a toast notification here
    }
  }, [error]);

  // Rest of component...
  return (
    <div>
      {/* Display analysis status */}
      <div className="analysis-status">
        {isThinking && <span>Đang phân tích...</span>}
        {source === 'fallback_minimax' && (
          <span className="text-emerald-400">Fallback engine</span>
        )}
        {error && <span className="text-red-400">Lỗi: {error}</span>}
      </div>

      {/* Display evaluation */}
      {evaluation && (
        <div className="evaluation">
          {evaluation.type === 'mate' ? (
            <span>Mate in {Math.abs(evaluation.value)}</span>
          ) : (
            <span>{(evaluation.value / 100).toFixed(2)}</span>
          )}
        </div>
      )}

      {/* Display best move */}
      {bestMove && (
        <div className="best-move">
          Best: {bestMove}
        </div>
      )}

      {/* Board and other components... */}
    </div>
  );
}

/**
 * Example: Bot move calculation with configurable ELO
 */
export function useBotMoveWithWorker(botElo = 1200) {
  const { analyze, bestMove, isThinking } = useStockfishWorker();

  const calculateBotMove = async (fen) => {
    // Map ELO to skill level (0-20)
    const skillLevel = Math.floor((botElo - 800) / 100);
    const clampedSkill = Math.max(0, Math.min(20, skillLevel));

    analyze({
      fen,
      depth: 8,
      skillLevel: clampedSkill,
      elo: botElo
    });

    // Wait for analysis to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isThinking && bestMove) {
          clearInterval(checkInterval);
          resolve(bestMove);
        }
      }, 100);

      // Timeout after 6 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(bestMove || null);
      }, 6000);
    });
  };

  return { calculateBotMove, isCalculating: isThinking };
}

/**
 * Example: Deep analysis with custom depth
 */
export function useDeepAnalysis() {
  const { analyze, bestMove, evaluation, isThinking, stop } = useStockfishWorker();

  const runDeepAnalysis = (fen, depth = 15) => {
    analyze({
      fen,
      depth,
      movetime: null // Use depth-based search
    });
  };

  return {
    runDeepAnalysis,
    result: { bestMove, evaluation },
    isAnalyzing: isThinking,
    stopAnalysis: stop
  };
}

/**
 * Example: Move annotation with worker
 */
export async function annotateMove(beforeFen, afterFen, playedMove) {
  const worker = new Worker('/stockfish-worker-v2.js');

  return new Promise((resolve, reject) => {
    let beforeEval = null;
    let afterEval = null;
    let requestCount = 0;

    worker.onmessage = (e) => {
      if (e.data.type === 'analysis_complete') {
        requestCount++;

        if (requestCount === 1) {
          beforeEval = e.data.data.evaluation;
          // Request second analysis
          worker.postMessage({
            type: 'analyze',
            requestId: 2,
            fen: afterFen,
            depth: 7,
            movetime: 400
          });
        } else if (requestCount === 2) {
          afterEval = e.data.data.evaluation;
          worker.terminate();

          // Calculate annotation
          const annotation = classifyMove(beforeEval, afterEval, playedMove);
          resolve(annotation);
        }
      } else if (e.data.type === 'analysis_error') {
        worker.terminate();
        reject(new Error(e.data.error));
      }
    };

    // Start first analysis
    worker.postMessage({ type: 'init' });
    setTimeout(() => {
      worker.postMessage({
        type: 'analyze',
        requestId: 1,
        fen: beforeFen,
        depth: 8,
        movetime: 500
      });
    }, 500);
  });
}

function classifyMove(beforeEval, afterEval, playedMove) {
  // Convert to centipawns
  const beforeCp = beforeEval.type === 'mate'
    ? (beforeEval.value > 0 ? 9900 : -9900)
    : beforeEval.value;

  const afterCp = afterEval.type === 'mate'
    ? (afterEval.value > 0 ? 9900 : -9900)
    : afterEval.value;

  const loss = Math.abs(afterCp - beforeCp);

  if (loss < 25) {
    return { symbol: '!', label: 'Tốt nhất', tone: 'best' };
  } else if (loss < 80) {
    return { symbol: '?!', label: 'Không chính xác', tone: 'inaccuracy' };
  } else if (loss < 180) {
    return { symbol: '?', label: 'Sai lầm', tone: 'mistake' };
  } else {
    return { symbol: '??', label: 'Sai lầm nghiêm trọng', tone: 'blunder' };
  }
}
