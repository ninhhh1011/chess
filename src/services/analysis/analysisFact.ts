import { Chess } from 'chess.js';
import type { AnalysisFactV1, Evaluation, GameAnalysis, MoveNotation } from '../../types/analysis';

const CLASSIFICATIONS = new Set([
  'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder', 'forced', 'unclassified',
]);
const SKILL_TAGS = new Set([
  'hung_piece', 'missed_capture', 'missed_mate', 'back_rank', 'opening_principle',
  'king_safety', 'tactical_oversight', 'endgame_conversion', 'unclassified',
]);

function fail(field: string): never {
  throw new Error(`Invalid analysis.v1 ${field}`);
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field);
  return value as Record<string, unknown>;
}

function evaluation(value: unknown, field: string): asserts value is Evaluation {
  const item = object(value, field);
  if ((item.type !== 'cp' && item.type !== 'mate')
    || typeof item.value !== 'number' || !Number.isFinite(item.value)
    || typeof item.display !== 'string' || !item.display) fail(field);
}

function legalMove(
  value: unknown,
  field: string,
  fenBefore: string,
  expectedFen?: string
): MoveNotation {
  const item = object(value, field);
  if (typeof item.uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(item.uci)
    || typeof item.san !== 'string' || !item.san
    || typeof item.fen !== 'string' || !item.fen) fail(field);

  let played;
  try {
    played = new Chess(fenBefore).move({
      from: item.uci.slice(0, 2),
      to: item.uci.slice(2, 4),
      promotion: item.uci[4],
    });
  } catch {
    fail(field);
  }
  if (!played || played.san !== item.san || played.after !== item.fen
    || (expectedFen !== undefined && item.fen !== expectedFen)) fail(field);
  return item as unknown as MoveNotation;
}

function legalCandidate(value: unknown, field: string, fenBefore: string): string {
  const item = object(value, field);
  if (typeof item.uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(item.uci)
    || typeof item.san !== 'string' || !item.san) fail(field);
  try {
    const move = new Chess(fenBefore).move({
      from: item.uci.slice(0, 2),
      to: item.uci.slice(2, 4),
      promotion: item.uci[4],
    });
    if (!move || move.san !== item.san) fail(field);
  } catch {
    fail(field);
  }
  return item.uci;
}

function legalPv(value: unknown, field: string, fenBefore: string): string[] {
  if (!Array.isArray(value) || value.length === 0) fail(field);
  const game = new Chess(fenBefore);
  for (const uci of value) {
    if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) fail(field);
    try {
      if (!game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })) fail(field);
    } catch {
      fail(field);
    }
  }
  return value as string[];
}

export function getAnalysisFactEvidenceId(fact: Pick<AnalysisFactV1, 'gameId' | 'ply'>): string {
  return `${fact.gameId}:ply:${fact.ply}`;
}

export function assertAnalysisFactV1(value: unknown): AnalysisFactV1 {
  const fact = object(value, 'fact');
  if (fact.schemaVersion !== 'analysis.v1') fail('schemaVersion');
  if (typeof fact.gameId !== 'string' || !fact.gameId.trim()) fail('gameId');
  if (!Number.isInteger(fact.ply) || Number(fact.ply) < 1) fail('ply');
  if (typeof fact.fenBefore !== 'string') fail('fenBefore');
  if (typeof fact.fenAfter !== 'string') fail('fenAfter');
  try {
    new Chess(fact.fenBefore);
  } catch {
    fail('fenBefore');
  }
  try {
    new Chess(fact.fenAfter);
  } catch {
    fail('fenAfter');
  }
  if (fact.turn !== fact.fenBefore.split(' ')[1]) fail('turn');

  legalMove(fact.playedMove, 'playedMove', fact.fenBefore, fact.fenAfter);
  const bestMove = legalMove(fact.bestMove, 'bestMove', fact.fenBefore);
  evaluation(fact.evalBefore, 'evalBefore');
  evaluation(fact.evalAfter, 'evalAfter');
  if (fact.centipawnLoss !== null
    && (typeof fact.centipawnLoss !== 'number' || !Number.isFinite(fact.centipawnLoss) || fact.centipawnLoss < 0)) {
    fail('centipawnLoss');
  }
  if (typeof fact.classification !== 'string' || !CLASSIFICATIONS.has(fact.classification)) fail('classification');
  if (!Array.isArray(fact.skillTags) || fact.skillTags.length === 0
    || !fact.skillTags.every(tag => typeof tag === 'string' && SKILL_TAGS.has(tag))) fail('skillTags');
  if (!Array.isArray(fact.candidates) || fact.candidates.length === 0) fail('candidates');
  fact.candidates.forEach((candidate, index) => {
    const item = object(candidate, `candidates[${index}]`);
    const uci = legalCandidate(item, `candidates[${index}]`, fact.fenBefore as string);
    evaluation(item.eval, `candidates[${index}].eval`);
    const pv = legalPv(item.pv, `candidates[${index}].pv`, fact.fenBefore as string);
    if (pv[0] !== uci) fail(`candidates[${index}].pv`);
  });
  if (!(fact.candidates as Array<{ uci: string }>).some(candidate => candidate.uci === bestMove.uci)) {
    fail('bestMove candidate');
  }

  const engine = object(fact.engine, 'engine');
  if (engine.source !== 'stockfish_wasm' || typeof engine.version !== 'string'
    || !Number.isInteger(engine.multiPv) || Number(engine.multiPv) < 1
    || (engine.depth !== undefined && (!Number.isInteger(engine.depth) || Number(engine.depth) < 1))) fail('engine');
  if (typeof fact.analyzedAt !== 'string' || Number.isNaN(Date.parse(fact.analyzedAt))) fail('analyzedAt');
  const canonicalAnalyzedAt = new Date(fact.analyzedAt).toISOString();
  if (fact.analyzedAt !== canonicalAnalyzedAt
    && fact.analyzedAt !== canonicalAnalyzedAt.replace('.000Z', 'Z')) fail('analyzedAt');

  return fact as unknown as AnalysisFactV1;
}

export function assertGameAnalysisV1(value: unknown): GameAnalysis {
  const analysis = object(value, 'gameAnalysis');
  if (analysis.schemaVersion !== 'gameAnalysis.v1') throw new Error('Invalid gameAnalysis.v1 schemaVersion');
  if (typeof analysis.gameId !== 'string' || !analysis.gameId.trim()) throw new Error('Invalid gameAnalysis.v1 gameId');
  if (!Array.isArray(analysis.analysis)) throw new Error('Invalid gameAnalysis.v1 analysis');

  const facts = analysis.analysis.map(assertAnalysisFactV1);
  const summary = object(analysis.summary, 'gameAnalysis.summary');
  if (!Number.isInteger(summary.totalMoves) || Number(summary.totalMoves) !== facts.length) {
    throw new Error('Invalid gameAnalysis.v1 totalMoves');
  }
  facts.forEach((fact, index) => {
    if (fact.gameId !== analysis.gameId) throw new Error(`Invalid gameAnalysis.v1 gameId at ply ${fact.ply}`);
    if (fact.ply !== index + 1) throw new Error(`Invalid gameAnalysis.v1 missing or duplicate ply ${index + 1}`);
  });
  if (new Set(facts.map(getAnalysisFactEvidenceId)).size !== facts.length) {
    throw new Error('Invalid gameAnalysis.v1 duplicate evidence ID');
  }
  if (!Array.isArray(analysis.topMistakes) || !analysis.topMistakes.every(ply =>
    typeof ply === 'string' && facts.some(fact => String(fact.ply) === ply))) {
    throw new Error('Invalid gameAnalysis.v1 topMistakes');
  }
  return analysis as unknown as GameAnalysis;
}
