import { Chess } from 'chess.js';
import { analyzeFen } from './stockfishService';
import { getBotLevelByElo } from '../data/botLevels';

function getRandomLegalMove(fen) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  
  if (moves.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * moves.length);
  const move = moves[randomIndex];
  
  return `${move.from}${move.to}${move.promotion || ''}`;
}

export async function getBotMove({ fen, botElo = 1200 }) {
  const config = getBotLevelByElo(botElo);
  
  if (!config) {
    throw new Error(`Invalid bot ELO: ${botElo}`);
  }

  // Check if should use random move for lower ELO
  if (config.randomChance > 0 && Math.random() < config.randomChance) {
    const randomMove = getRandomLegalMove(fen);
    return {
      move: randomMove,
      source: 'random_weak',
      elo: config.elo,
      depth: config.depth,
      skillLevel: config.skillLevel,
    };
  }

  try {
    // Use Stockfish WASM with ELO configuration
    const analysis = await analyzeFen({ 
      fen, 
      depth: config.depth, 
      movetime: config.movetime,
      elo: config.elo,
      skillLevel: config.skillLevel
    });
    
    if (analysis.success && analysis.bestMove) {
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
    return {
      move: fallbackMove,
      source: 'fallback',
      elo: config.elo,
      warning: 'Không tìm được nước tốt nhất, bot dùng nước ngẫu nhiên.',
    };
  } catch (error) {
    console.error('[botService] Error:', error);
    
    // Fallback to random on error
    const fallbackMove = getRandomLegalMove(fen);
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
