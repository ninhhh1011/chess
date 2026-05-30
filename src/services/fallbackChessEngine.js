import { getSafeFallbackMove } from './heuristicBotEngine';
import { isLegalUciMove } from '../utils/chessMoveValidation';

function noLegalMovesResult(fen) {
  return {
    success: false,
    source: 'none',
    fen,
    depth: 0,
    bestMove: null,
    evaluation: null,
    pv: [],
    raw: [],
    warning: 'No legal moves',
  };
}

export async function analyzeFenFallback({ fen, elo = 1200 } = {}) {
  if (!fen) throw new Error('Missing FEN for fallback analysis.');

  return new Promise((resolve, reject) => {
    const setTimer = typeof window !== 'undefined' ? window.setTimeout.bind(window) : setTimeout;
    const clearTimer = typeof window !== 'undefined' ? window.clearTimeout.bind(window) : clearTimeout;
    const timeout = setTimer(() => reject(new Error('Fallback engine timeout.')), 3000);

    setTimer(() => {
      try {
        const bestMove = getSafeFallbackMove(fen, elo);
        clearTimer(timeout);

        if (!bestMove || !isLegalUciMove(fen, bestMove)) {
          resolve(noLegalMovesResult(fen));
          return;
        }

        resolve({
          success: true,
          source: elo <= 800 ? 'fallback_random_weak' : 'fallback_heuristic',
          fen,
          depth: 0,
          bestMove,
          evaluation: null,
          pv: [bestMove],
          raw: [],
          warning: 'Using heuristic fallback',
        });
      } catch (error) {
        clearTimer(timeout);
        reject(error);
      }
    }, 50);
  });
}

export async function getBestMoveFallback({ fen, elo = 1200 } = {}) {
  const analysis = await analyzeFenFallback({ fen, elo });
  return analysis.bestMove;
}
