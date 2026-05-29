import { Chess } from 'chess.js';
import { analyzeFen } from './stockfishService';
import { getBotLevelByElo } from '../data/botLevels';

const BOT_DEBUG = false;

function debugBot(...args) {
  if (BOT_DEBUG) {
    console.log(...args);
  }
}

function getRandomLegalMove(fen) {
  try {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];
    
    return `${move.from}${move.to}${move.promotion || ''}`;
  } catch (error) {
    console.warn('[Bot] Cannot choose random legal move:', error);
    return null;
  }
}

export async function getBotMove({ fen, botElo = 1200 }) {
  const config = getBotLevelByElo(botElo);
  
  if (!config) {
    throw new Error(`Invalid bot ELO: ${botElo}`);
  }

  debugBot(`[Bot] Getting move for ELO ${botElo}`, config);

  // Check if should use random move for lower ELO
  if (config.randomChance > 0 && Math.random() < config.randomChance) {
    const randomMove = getRandomLegalMove(fen);
    debugBot(`[Bot] Using random move (${config.randomChance * 100}% chance):`, randomMove);
    if (!randomMove) {
      return {
        move: null,
        source: 'none',
        elo: config.elo,
        warning: 'No legal moves',
      };
    }

    return {
      move: randomMove,
      source: 'random_weak',
      elo: config.elo,
      depth: config.depth,
      skillLevel: config.skillLevel,
    };
  }

  try {
    debugBot(`[Bot] Calling analyzeFen with depth=${config.depth}, movetime=${config.movetime}, skillLevel=${config.skillLevel}`);
    
    // Use Stockfish WASM with ELO configuration
    const analysis = await analyzeFen({ 
      fen, 
      depth: config.depth, 
      movetime: config.movetime,
      elo: config.elo,
      skillLevel: config.skillLevel
    });
    
    debugBot(`[Bot] Analysis result:`, analysis);
    
    if (analysis?.bestMove) {
      if (analysis.source === 'stockfish_wasm') {
        debugBot(`[Bot] Using Stockfish move: ${analysis.bestMove} (source: ${analysis.source})`);
      } else {
        debugBot(`[Bot] Using fallback move: ${analysis.bestMove} (source: ${analysis.source})`);
      }
      return {
        move: analysis.bestMove,
        source: analysis.source,
        elo: config.elo,
        depth: analysis.depth,
        movetime: config.movetime,
        skillLevel: config.skillLevel,
        evaluation: analysis.evaluation,
      };
    }
    
    // Fallback to random if no best move
    const fallbackMove = getRandomLegalMove(fen);
    debugBot(`[Bot] No best move found, using fallback random:`, fallbackMove);
    if (!fallbackMove) {
      return {
        move: null,
        source: 'none',
        elo: config.elo,
        warning: 'No legal moves',
      };
    }

    return {
      move: fallbackMove,
      source: 'fallback',
      elo: config.elo,
      warning: 'Không tìm được nước tốt nhất, bot dùng nước ngẫu nhiên.',
    };
  } catch (error) {
    console.error('[Bot] Error getting move:', error);
    
    // Fallback to random on error
    const fallbackMove = getRandomLegalMove(fen);
    debugBot(`[Bot] Error occurred, using fallback random:`, fallbackMove);
    if (!fallbackMove) {
      return {
        move: null,
        source: 'none',
        elo: config.elo,
        warning: 'No legal moves',
      };
    }

    return {
      move: fallbackMove,
      source: 'fallback',
      elo: config.elo,
      warning: 'Stockfish WASM không khả dụng, bot dùng fallback cơ bản.',
    };
  }
}

export function uciToMoveObject(uci) {
  if (!uci || uci.length < 4) return null;
  
  const from = uci.substring(0, 2);
  const to = uci.substring(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  
  return {
    from,
    to,
    promotion,
  };
}
