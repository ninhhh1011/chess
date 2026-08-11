import { analyzeFen } from './stockfishService';
import { getSafeFallbackMove } from './heuristicBotEngine';
import { getBotLevelByElo } from '../data/botLevels';
import { isLegalUciMove, parseUciMove } from '../utils/chessMoveValidation';
import type { AnalysisResult, BotConfig, BotMoveResult, EngineConfig } from '../types/ChessTypes';

// Simple state machine
let state: {
  status: 'idle' | 'thinking' | 'cancelled';
  currentFen: string | null;
  requestId: number;
} = {
  status: 'idle',
  currentFen: null,
  requestId: 0,
};

function getFallbackSource(botElo: number): string {
  return botElo <= 800 ? 'fallback_random_weak' : 'fallback_heuristic';
}

/**
 * Get bot's move for given FEN position
 * Uses state machine pattern to prevent race conditions
 */
export async function getBotMove(fen: string, botElo: number = 1200): Promise<BotMoveResult> {
  const config = getBotLevelByElo(botElo);

  if (!config) {
    throw new Error(`Invalid bot ELO: ${botElo}`);
  }

  // Cancel any pending request
  state.status = 'cancelled';
  state.requestId++;
  const thisRequestId = state.requestId;

  // Start new request
  state.status = 'thinking';
  state.currentFen = fen;

  try {
    // Random weak move chance (for low ELO bots)
    if (config.randomChance > 0 && Math.random() < config.randomChance) {
      const weakMove = getSafeFallbackMove(fen, 800);
      return validateAndReturn(fen, weakMove, 'fallback_random_weak', config, thisRequestId);
    }

    // Analyze with Stockfish
    const engineConfig: EngineConfig = {
      fen,
      depth: config.depth,
      movetime: config.movetime,
      elo: config.elo,
      skillLevel: config.skillLevel,
      useSkillLevelOnly: config.useSkillLevelOnly,
      purpose: 'bot_move',
    };

    const analysis: AnalysisResult = await analyzeFen(engineConfig);

    // Check staleness (status check is redundant since requestId changes on cancel)
    if (state.currentFen !== fen || state.requestId !== thisRequestId) {
      return {
        move: null,
        source: 'stale',
        ...config,
      };
    }

    if (analysis.success && analysis.bestMove && isLegalUciMove(fen, analysis.bestMove)) {
      return {
        move: analysis.bestMove,
        source: analysis.source,
        elo: config.elo,
        depth: analysis.depth,
        movetime: config.movetime,
        skillLevel: config.skillLevel,
        evaluation: analysis.evaluation ?? undefined,
      };
    }

    // Invalid move or failed - use fallback
    return getFallbackBotMove(fen, botElo, config, 'Stockfish unavailable or invalid move');
  } catch (error) {
    console.error('[Bot] Error getting move:', error);
    return getFallbackBotMove(fen, botElo, config, 'Bot engine error');
  } finally {
    if (state.requestId === thisRequestId) {
      state.status = 'idle';
    }
  }
}

function validateAndReturn(
  fen: string,
  move: string | null,
  source: string,
  config: BotConfig,
  requestId: number
): BotMoveResult {
  // Check if this request is still current
  if (state.requestId !== requestId) {
    return { move: null, source: 'stale', ...config };
  }

  if (!move || !isLegalUciMove(fen, move)) {
    return getFallbackBotMove(fen, config.elo, config, 'Invalid move');
  }

  return {
    move,
    source,
    elo: config.elo,
    depth: config.depth,
    movetime: config.movetime,
    skillLevel: config.skillLevel,
  };
}

function getFallbackBotMove(fen: string, botElo: number, config: BotConfig, warning: string): BotMoveResult {
  const fallbackMove = getSafeFallbackMove(fen, botElo);

  if (!fallbackMove || !isLegalUciMove(fen, fallbackMove)) {
    return {
      move: null,
      source: 'none',
      ...config,
      warning: 'No legal moves',
    };
  }

  return {
    move: fallbackMove,
    source: getFallbackSource(botElo),
    ...config,
    warning,
  };
}

export function uciToMoveObject(uci: string) {
  return parseUciMove(uci);
}
