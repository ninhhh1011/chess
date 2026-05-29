import { analyzeFen } from './stockfishService';
import { getSafeFallbackMove } from './heuristicBotEngine';
import { getBotLevelByElo } from '../data/botLevels';
import { isLegalUciMove, parseUciMove } from '../utils/chessMoveValidation';

const BOT_DEBUG = false;

function debugBot(...args) {
  if (BOT_DEBUG) {
    console.log(...args);
  }
}

function getFallbackSource(botElo) {
  return botElo <= 800 ? 'fallback_random_weak' : 'fallback_heuristic';
}

function getFallbackBotMove({ fen, botElo, config, warning }) {
  const fallbackMove = getSafeFallbackMove(fen, botElo);

  if (!fallbackMove) {
    return {
      move: null,
      source: 'none',
      elo: config.elo,
      depth: config.depth,
      movetime: config.movetime,
      skillLevel: config.skillLevel,
      warning: 'No legal moves',
    };
  }

  return {
    move: fallbackMove,
    source: getFallbackSource(botElo),
    elo: config.elo,
    depth: config.depth,
    movetime: config.movetime,
    skillLevel: config.skillLevel,
    warning,
  };
}

export async function getBotMove({ fen, botElo = 1200 }) {
  const config = getBotLevelByElo(botElo);
  
  if (!config) {
    throw new Error(`Invalid bot ELO: ${botElo}`);
  }

  debugBot(`[Bot] Getting move for ELO ${botElo}`, config);

  if (config.randomChance > 0 && Math.random() < config.randomChance) {
    const weakMove = getSafeFallbackMove(fen, 800);
    debugBot(`[Bot] Using weak fallback (${config.randomChance * 100}% chance):`, weakMove);

    return {
      move: weakMove,
      source: weakMove ? 'fallback_random_weak' : 'none',
      elo: config.elo,
      depth: config.depth,
      skillLevel: config.skillLevel,
      warning: weakMove ? undefined : 'No legal moves',
    };
  }

  try {
    debugBot(`[Bot] Calling analyzeFen with depth=${config.depth}, movetime=${config.movetime}, skillLevel=${config.skillLevel}`);
    
    const analysis = await analyzeFen({ 
      fen, 
      depth: config.depth, 
      movetime: config.movetime,
      elo: config.elo,
      skillLevel: config.skillLevel,
      purpose: 'bot_move',
    });
    
    debugBot('[Bot] Analysis result:', analysis);
    
    if (analysis?.success && analysis.bestMove && isLegalUciMove(fen, analysis.bestMove)) {
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
    
    if (analysis?.bestMove) {
      console.warn('[Bot] Stockfish returned invalid move for current FEN', {
        fen,
        turn: fen.split(' ')[1],
        bestMove: analysis.bestMove,
        source: analysis.source,
      });
    }

    return getFallbackBotMove({
      fen,
      botElo,
      config,
      warning: 'Stockfish unavailable or returned invalid move; using safe fallback.',
    });
  } catch (error) {
    console.error('[Bot] Error getting move:', error);

    return getFallbackBotMove({
      fen,
      botElo,
      config,
      warning: 'Bot engine error; using safe fallback.',
    });
  }
}

export function uciToMoveObject(uci) {
  return parseUciMove(uci);
}
