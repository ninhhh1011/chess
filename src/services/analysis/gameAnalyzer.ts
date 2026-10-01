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
  calculateMoverCPL,
  classifyMove,
  determineSkillTags,
} from './orientation';
import { replayPgn, parsePgn } from './pgnParser';
import { assertGameAnalysisV1 } from './analysisFact';
import type { AnalysisResult } from '../../types/ChessTypes';
import type {
  AnalysisFactV1,
  GameAnalysis,
  AnalyzeGameRequest,
  AnalysisProgress,
  CandidateLine,
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
  if (gameReplay.moves.length === 0) {
    throw new Error('PGN contains no moves');
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
    evalBefore: InternalEval;
    evalAfter: InternalEval;
  }> = [];
  const shallowFacts: AnalysisFactV1[] = [];

  let beforeResult;
  try {
    beforeResult = await analyzeFen({
      fen: gameReplay.moves[0].fenBefore,
      depth: Math.min(8, request.options.maxDepth),
      movetime: Math.min(500, request.options.movetimeMs),
      elo: 1500,
      purpose: 'review',
    });
  } catch (error) {
    throw new Error(
      `Pass 1 failed before ply 1/${gameReplay.moves.length}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }

  // Shallow analysis - one new position per ply; the prior result is reused.
  for (let i = 0; i < gameReplay.moves.length; i++) {
    const move = gameReplay.moves[i];

    try {
      const afterResult = await analyzeFen({
        fen: move.fen,
        depth: Math.min(8, request.options.maxDepth),
        movetime: Math.min(500, request.options.movetimeMs),
        elo: 1500,
        purpose: 'review',
      });

      if (!beforeResult.evaluation || beforeResult.source !== 'stockfish_wasm') {
        throw new Error(`invalid Stockfish result for position before ply ${move.ply}`);
      }
      if (!afterResult.evaluation || afterResult.source !== 'stockfish_wasm') {
        throw new Error(`invalid Stockfish result for position after ply ${move.ply}`);
      }

      const evalBefore = normalizeEvalToWhite(
        { ...beforeResult.evaluation, depth: beforeResult.depth },
        move.fenBefore.split(' ')[1] as 'w' | 'b'
      );
      const evalAfter = normalizeEvalToWhite(
        { ...afterResult.evaluation, depth: afterResult.depth },
        move.fen.split(' ')[1] as 'w' | 'b'
      );
      const cpl = calculateMoverCPL(
        evalBefore,
        evalAfter,
        move.fenBefore.split(' ')[1] as 'w' | 'b'
      );

      shallowFacts.push(buildAnalysisFact(
        request.gameId,
        move,
        request.options,
        { evalSwing: cpl, evalBefore, evalAfter },
        beforeResult,
        Math.min(500, request.options.movetimeMs)
      ));

      if (cpl !== null && cpl > 80) {
        candidateMistakes.push({ ply: move.ply, evalSwing: cpl, evalBefore, evalAfter });
      }
      beforeResult = afterResult;
    } catch (error) {
      throw new Error(
        `Pass 1 failed at ply ${move.ply}/${gameReplay.moves.length}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }

    onProgress({
      phase: 'shallow',
      currentPly: i + 1,
      totalPlies: gameReplay.moves.length,
      percentage: 10 + Math.round((i / gameReplay.moves.length) * 30),
      message: `Scanning move ${i + 1}/${gameReplay.moves.length}...`,
    });

    if (onCancel()) {
      throw new Error(`Analysis cancelled during shallow pass at ply ${i + 1}/${gameReplay.moves.length}`);
    }
  }

  // Sort by severity
  candidateMistakes.sort((a, b) => b.evalSwing - a.evalSwing || a.ply - b.ply);

  // Take top N for deep analysis
  const topMistakes = candidateMistakes.slice(0, request.options.analyzeTopMistakes);
  const topMistakePlies = topMistakes.map(m => m.ply);

  // === PASS 2: Deep analysis of mistakes ===
  onProgress({
    phase: 'deep',
    currentPly: 0,
    totalPlies: topMistakePlies.length,
    percentage: 40,
    message: 'Deep analysis of mistakes...',
  });

  const analysisFacts: AnalysisFactV1[] = [];

  for (let i = 0; i < topMistakes.length; i++) {
    const candidate = topMistakes[i];
    const move = gameReplay.moves.find(m => m.ply === candidate.ply);

    if (!move) throw new Error(`Pass 2 could not resolve ply ${candidate.ply}`);

    try {
      const fact = await analyzeSingleMove(
        request.gameId,
        move,
        request.options,
        candidate
      );
      analysisFacts.push(fact);
    } catch (error) {
      throw new Error(
        `Pass 2 failed at candidate ${i + 1}/${topMistakes.length} (ply ${candidate.ply}): ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }

    onProgress({
      phase: 'deep',
      currentPly: i + 1,
      totalPlies: topMistakePlies.length,
      percentage: 40 + Math.round((i / topMistakePlies.length) * 50),
      message: `Analyzing mistake ${i + 1}/${topMistakePlies.length}...`,
    });

    if (onCancel()) {
      throw new Error(`Analysis cancelled during deep pass at candidate ${i + 1}/${topMistakes.length}`);
    }
  }

  analysisFacts.push(...shallowFacts.filter(fact => !topMistakePlies.includes(fact.ply)));

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

  return assertGameAnalysisV1({
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
  });
}

/**
 * Analyze a single move deeply
 */
async function analyzeSingleMove(
  gameId: string,
  move: { san: string; uci: string; fenBefore: string; fen: string; ply: number },
  options: AnalyzeGameRequest['options'],
  candidate: { evalSwing: number; evalBefore: InternalEval; evalAfter: InternalEval }
): Promise<AnalysisFactV1> {
  const result = await analyzeFen({
    fen: move.fenBefore,
    depth: options.maxDepth,
    movetime: options.movetimeMs,
    elo: 2850,
    purpose: 'review',
  });

  if (!result.evaluation || result.source !== 'stockfish_wasm') {
    throw new Error('invalid Stockfish result');
  }

  return buildAnalysisFact(gameId, move, options, candidate, result, options.movetimeMs);
}

function buildAnalysisFact(
  gameId: string,
  move: { san: string; uci: string; fenBefore: string; fen: string; ply: number },
  options: AnalyzeGameRequest['options'],
  candidate: { evalSwing: number | null; evalBefore: InternalEval; evalAfter: InternalEval },
  result: AnalysisResult,
  movetimeMs: number
): AnalysisFactV1 {
  const ply = move.ply;
  const turn = move.fenBefore.split(' ')[1] as 'w' | 'b';
  const bestMove = result.bestMove || '';
  const game = new Chess(move.fenBefore);
  const bestMoveObj = bestMove ? game.move({
    from: bestMove.slice(0, 2),
    to: bestMove.slice(2, 4),
    promotion: bestMove[4],
  }) : null;
  if (!result.evaluation || result.source !== 'stockfish_wasm' || !bestMoveObj) {
    throw new Error('invalid Stockfish move evidence');
  }

  const eval_: InternalEval = {
    type: result.evaluation.type,
    value: result.evaluation.value,
    depth: result.depth,
  };
  const normalizedEval = normalizeEvalToWhite(eval_, turn);
  const candidates: CandidateLine[] = [{
    uci: bestMove,
    san: bestMoveObj.san,
    eval: formatEvaluation(normalizedEval),
    pv: result.pv[0] === bestMove ? result.pv : [bestMove],
  }];

  const cpl = candidate.evalSwing;

  // Classify move
  const classification = classifyMove(cpl, candidate.evalBefore);

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
    fenBefore: move.fenBefore,
    fenAfter: move.fen,
    playedMove: {
      uci: move.uci,
      san: move.san,
      fen: move.fen,
    },
    bestMove: {
      uci: bestMove,
      san: bestMoveObj?.san || '',
      fen: bestMoveObj?.after || move.fenBefore,
    },
    evalBefore: {
      ...formatEvaluation(candidate.evalBefore),
    },
    evalAfter: {
      ...formatEvaluation(candidate.evalAfter),
    },
    centipawnLoss: cpl,
    classification,
    candidates,
    skillTags: tags as AnalysisFactV1['skillTags'],
    engine: {
      source: 'stockfish_wasm',
      version: 'unknown',
      depth: result.depth,
      movetimeMs,
      multiPv: options.multiPv,
    },
    analyzedAt: new Date().toISOString(),
  };
}

function formatEvaluation(eval_: InternalEval) {
  return {
    type: eval_.type,
    value: eval_.value,
    display: eval_.type === 'mate'
      ? `Mate in ${Math.abs(eval_.value)}`
      : `${eval_.value >= 0 ? '+' : ''}${(eval_.value / 100).toFixed(2)}`,
  };
}

/**
 * Quick sanity check - does engine work?
 */
export async function isAnalysisAvailable(): Promise<boolean> {
  return isEngineReady();
}
