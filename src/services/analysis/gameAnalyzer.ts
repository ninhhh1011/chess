/**
 * Two-Pass Game Analyzer
 *
 * Pass 1: Replay PGN, validate moves, shallow analysis to find candidates
 * Pass 2: Deep analysis of top mistakes
 */

import { Chess } from 'chess.js';
import { analyzeFen, isEngineReady } from '../stockfishService';
import {
  normalizeEvalToWhite,
  calculateCPL,
  classifyMove,
  determineSkillTags,
  parseEngineEval,
} from './orientation';
import { replayPgn, parsePgn } from './pgnParser';
import type { Evaluation } from '../../types/ChessTypes';
import type {
  AnalysisFactV1,
  GameAnalysis,
  AnalyzeGameRequest,
  AnalysisProgress,
  CandidateLine,
  MoveNotation,
} from '../../types/analysis';

/**
 * Internal evaluation type used in orientation module
 * Matches orientation.ts expectations
 */
interface InternalEval {
  type: 'cp' | 'mate';
  value: number;
  depth?: number;
}

export interface AnalyzeGameCallbacks {
  onProgress: (progress: AnalysisProgress) => void;
  onCancel: () => boolean;
}

/**
 * Default callbacks
 */
const defaultCallbacks: AnalyzeGameCallbacks = {
  onProgress: () => {},
  onCancel: () => false,
};

/**
 * Two-pass game analyzer
 */
export async function analyzeGame(
  request: AnalyzeGameRequest,
  callbacks: Partial<AnalyzeGameCallbacks> = {}
): Promise<GameAnalysis> {
  const { onProgress, onCancel } = { ...defaultCallbacks, ...callbacks };
  const startTime = Date.now();

  // Validate PGN
  const pgnResult = parsePgn(request.pgn);
  if (!pgnResult.success) {
    throw new Error(`Invalid PGN: ${pgnResult.error}`);
  }

  // Replay PGN
  onProgress({
    phase: 'replaying',
    currentPly: 0,
    totalPlies: pgnResult.moves.length,
    percentage: 0,
    message: 'Validating moves...',
  });

  const gameReplay = replayPgn(request.pgn);
  if (!gameReplay) {
    throw new Error('Failed to replay PGN');
  }

  // Check for cancellation
  if (onCancel()) {
    throw new Error('Analysis cancelled');
  }

  // === PASS 1: Shallow analysis to find candidates ===
  onProgress({
    phase: 'shallow',
    currentPly: 0,
    totalPlies: gameReplay.moves.length,
    percentage: 10,
    message: 'Scanning for mistakes...',
  });

  const candidateMistakes: Array<{
    ply: number;
    evalSwing: number;
  }> = [];

  // Shallow analysis - quick eval at key positions
  for (let i = 0; i < gameReplay.moves.length; i++) {
    const move = gameReplay.moves[i];
    const game = new Chess(move.fen);

    // Skip if game ended
    if (game.isGameOver()) continue;

    try {
      const result = await analyzeFen({
        fen: move.fen,
        depth: Math.min(8, request.options.maxDepth),
        elo: 1500,
      });

      if (result.evaluation) {
        // Normalize to white
        const turn = move.fen.split(' ')[1] as 'w' | 'b';
        const normalizedEval: InternalEval = {
          type: result.evaluation.type,
          value: result.evaluation.value,
          depth: result.depth,
        };
        const normalized = normalizeEvalToWhite(normalizedEval, turn);

        // Check if this is a potential mistake
        if (result.source === 'stockfish_wasm' && result.bestMove) {
          // Compare played vs best
          const bestResult = await analyzeFen({
            fen: move.fen,
            depth: Math.min(8, request.options.maxDepth),
            elo: 2850, // Higher level for best move comparison
          });

          if (bestResult.evaluation && bestResult.source === 'stockfish_wasm') {
            const bestEvalNormalized: InternalEval = {
              type: bestResult.evaluation.type,
              value: bestResult.evaluation.value,
              depth: bestResult.depth,
            };
            const bestNormalized = normalizeEvalToWhite(bestEvalNormalized, turn);
            const cpl = calculateCPL(normalized, bestNormalized);

            if (cpl !== null && cpl > 80) {
              candidateMistakes.push({
                ply: move.ply,
                evalSwing: cpl,
              });
            }
          }
        }
      }
    } catch {
      // Skip on error
    }

    onProgress({
      phase: 'shallow',
      currentPly: i + 1,
      totalPlies: gameReplay.moves.length,
      percentage: 10 + Math.round((i / gameReplay.moves.length) * 30),
      message: `Scanning move ${i + 1}/${gameReplay.moves.length}...`,
    });

    if (onCancel()) {
      throw new Error('Analysis cancelled');
    }
  }

  // Sort by severity
  candidateMistakes.sort((a, b) => b.evalSwing - a.evalSwing);

  // Take top N for deep analysis
  const topMistakePlies = candidateMistakes
    .slice(0, request.options.analyzeTopMistakes)
    .map(m => m.ply);

  // === PASS 2: Deep analysis of mistakes ===
  onProgress({
    phase: 'deep',
    currentPly: 0,
    totalPlies: topMistakePlies.length,
    percentage: 40,
    message: 'Deep analysis of mistakes...',
  });

  const analysisFacts: AnalysisFactV1[] = [];

  for (let i = 0; i < topMistakePlies.length; i++) {
    const ply = topMistakePlies[i];
    const move = gameReplay.moves.find(m => m.ply === ply);

    if (!move) continue;

    try {
      const fact = await analyzeSingleMove(
        request.gameId,
        ply,
        move,
        request.options,
        topMistakePlies
      );
      analysisFacts.push(fact);
    } catch {
      // Skip on error
    }

    onProgress({
      phase: 'deep',
      currentPly: i + 1,
      totalPlies: topMistakePlies.length,
      percentage: 40 + Math.round((i / topMistakePlies.length) * 50),
      message: `Analyzing mistake ${i + 1}/${topMistakePlies.length}...`,
    });

    if (onCancel()) {
      throw new Error('Analysis cancelled');
    }
  }

  // Fill in non-mistake moves with basic info
  for (const move of gameReplay.moves) {
    if (!topMistakePlies.includes(move.ply)) {
      analysisFacts.push({
        schemaVersion: 'analysis.v1',
        gameId: request.gameId,
        ply: move.ply,
        turn: move.ply % 2 === 1 ? 'w' : 'b',
        fenBefore: move.fen, // Simplified - actual previous FEN would need tracking
        fenAfter: move.fen,
        playedMove: {
          uci: '', // Would need to compute
          san: move.san,
          fen: move.fen,
        },
        bestMove: {
          uci: '',
          san: '',
          fen: move.fen,
        },
        evalBefore: { type: 'cp', value: 0, display: '0.00' },
        evalAfter: { type: 'cp', value: 0, display: '0.00' },
        centipawnLoss: null,
        classification: 'unclassified',
        candidates: [],
        skillTags: ['unclassified'],
        engine: {
          source: 'stockfish_wasm',
          version: 'unknown',
          multiPv: request.options.multiPv,
        },
        analyzedAt: new Date().toISOString(),
      });
    }
  }

  // Sort by ply
  analysisFacts.sort((a, b) => a.ply - b.ply);

  // Calculate summary
  const mistakes = analysisFacts.filter(f =>
    ['mistake', 'blunder', 'inaccuracy'].includes(f.classification)
  );
  const blunders = analysisFacts.filter(f => f.classification === 'blunder');
  const inaccuracies = analysisFacts.filter(f => f.classification === 'inaccuracy');
  const cpls = analysisFacts
    .filter(f => f.centipawnLoss !== null)
    .map(f => f.centipawnLoss as number);
  const avgCPL = cpls.length > 0
    ? Math.round(cpls.reduce((a, b) => a + b, 0) / cpls.length)
    : null;

  const durationMs = Date.now() - startTime;

  onProgress({
    phase: 'done',
    currentPly: gameReplay.moves.length,
    totalPlies: gameReplay.moves.length,
    percentage: 100,
    message: 'Analysis complete!',
  });

  return {
    schemaVersion: 'gameAnalysis.v1',
    gameId: request.gameId,
    pgn: request.pgn,
    playerSide: request.playerSide,
    analysis: analysisFacts,
    topMistakes: topMistakePlies.map(String),
    summary: {
      totalMoves: gameReplay.moves.length,
      mistakesCount: mistakes.length,
      blundersCount: blunders.length,
      inaccuraciesCount: inaccuracies.length,
      avgCPL,
    },
    engine: {
      source: 'stockfish_wasm',
      version: 'unknown',
      multiPv: request.options.multiPv,
    },
    analyzedAt: new Date().toISOString(),
    durationMs,
  };
}

/**
 * Analyze a single move deeply
 */
async function analyzeSingleMove(
  gameId: string,
  ply: number,
  move: { san: string; fen: string; ply: number },
  options: AnalyzeGameRequest['options'],
  _allMistakePlies: number[]
): Promise<AnalysisFactV1> {
  const turn = ply % 2 === 1 ? 'w' : 'b';

  // Analyze current position with MultiPV
  const result = await analyzeFen({
    fen: move.fen,
    depth: options.maxDepth,
    elo: 2850,
  });

  const eval_: InternalEval = {
    type: result.evaluation?.type || 'cp',
    value: result.evaluation?.value || 0,
    depth: result.depth,
  };
  const normalizedEval = normalizeEvalToWhite(eval_, turn);

  // Get best move
  const bestMove = result.bestMove || '';
  const game = new Chess(move.fen);
  const bestMoveObj = bestMove ? game.move({
    from: bestMove.slice(0, 2),
    to: bestMove.slice(2, 4),
    promotion: bestMove[4],
  }) : null;

  // Get candidates (simplified - would need multiPV support)
  const candidates: CandidateLine[] = [];
  if (bestMove && bestMoveObj) {
    const bestEval = parseEngineEval(`cp ${result.evaluation?.value || 0}`);
    const normalizedBestEval = normalizeEvalToWhite(bestEval || { type: 'cp', value: 0 }, turn);
    candidates.push({
      uci: bestMove,
      san: bestMoveObj.san,
      eval: {
        type: normalizedBestEval.type,
        value: normalizedBestEval.value,
        display: normalizedBestEval.type === 'mate'
          ? `Mate in ${Math.abs(normalizedBestEval.value)}`
          : `${normalizedBestEval.value >= 0 ? '+' : ''}${(normalizedBestEval.value / 100).toFixed(2)}`,
      },
      pv: [bestMove],
    });
  }

  // Calculate CPL
  const bestEvalNormalized = candidates[0]?.eval || normalizedEval;
  const cpl = calculateCPL(normalizedEval, bestEvalNormalized);

  // Classify move
  const classification = classifyMove(cpl, normalizedEval);

  // Determine skill tags
  const tags = determineSkillTags(
    {
      san: move.san,
      piece: move.san[0] || 'p',
      isCapture: move.san.includes('x'),
      isCheck: move.san.includes('+'),
      isMate: move.san.includes('#'),
    },
    cpl || 0,
    {
      isBackRank: false,
      isHanging: false,
      isOpening: ply < 10,
      isEndgame: false,
    }
  );

  return {
    schemaVersion: 'analysis.v1',
    gameId,
    ply,
    turn,
    fenBefore: move.fen,
    fenAfter: move.fen,
    playedMove: {
      uci: '',
      san: move.san,
      fen: move.fen,
    },
    bestMove: {
      uci: bestMove,
      san: bestMoveObj?.san || '',
      fen: move.fen,
    },
    evalBefore: { type: 'cp', value: 0, display: '0.00' },
    evalAfter: {
      type: normalizedEval.type,
      value: normalizedEval.value,
      display: normalizedEval.type === 'mate'
        ? `Mate in ${Math.abs(normalizedEval.value)}`
        : `${normalizedEval.value >= 0 ? '+' : ''}${(normalizedEval.value / 100).toFixed(2)}`,
    },
    centipawnLoss: cpl,
    classification,
    candidates,
    skillTags: tags as AnalysisFactV1['skillTags'],
    engine: {
      source: 'stockfish_wasm',
      version: 'unknown',
      depth: result.depth,
      multiPv: options.multiPv,
    },
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Quick sanity check - does engine work?
 */
export async function isAnalysisAvailable(): Promise<boolean> {
  return isEngineReady();
}
