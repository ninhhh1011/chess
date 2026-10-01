import { beforeEach, describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import {
  assertAnalysisFactV1,
  assertGameAnalysisV1,
  getAnalysisFactEvidenceId,
} from '../services/analysis/analysisFact';
import { buildCoachContext } from '../services/analysis/coach';
import {
  getUserProfile,
  recordAnalysisFacts,
  recordGameReview,
  resetUserProfile,
} from '../services/userProfileService';
import type { AnalysisFactV1, GameAnalysis } from '../types/analysis';

function createFact(overrides: Partial<AnalysisFactV1> = {}): AnalysisFactV1 {
  const game = new Chess();
  const move = game.move('e4');

  return {
    schemaVersion: 'analysis.v1',
    gameId: 'contract-game',
    ply: 1,
    turn: 'w',
    fenBefore: move.before,
    fenAfter: move.after,
    playedMove: { uci: 'e2e4', san: 'e4', fen: move.after },
    bestMove: { uci: 'e2e4', san: 'e4', fen: move.after },
    evalBefore: { type: 'cp', value: 20, display: '+0.20' },
    evalAfter: { type: 'cp', value: 20, display: '+0.20' },
    centipawnLoss: 0,
    classification: 'best',
    candidates: [{
      uci: 'e2e4',
      san: 'e4',
      eval: { type: 'cp', value: 20, display: '+0.20' },
      pv: ['e2e4'],
    }],
    skillTags: ['opening_principle'],
    engine: { source: 'stockfish_wasm', version: '18', depth: 8, movetimeMs: 500, multiPv: 1 },
    analyzedAt: '2026-09-06T00:00:00.000Z',
    ...overrides,
  };
}

function createAnalysis(facts: AnalysisFactV1[]): GameAnalysis {
  return {
    schemaVersion: 'gameAnalysis.v1',
    gameId: 'contract-game',
    pgn: '1. e4 *',
    playerSide: 'w',
    analysis: facts,
    topMistakes: [],
    summary: {
      totalMoves: facts.length,
      mistakesCount: 0,
      blundersCount: 0,
      inaccuraciesCount: 0,
      avgCPL: 0,
    },
    engine: { source: 'stockfish_wasm', version: '18', multiPv: 1 },
    analyzedAt: '2026-09-06T00:00:00.000Z',
    durationMs: 10,
  };
}

describe('AnalysisFactV1 runtime contract', () => {
  beforeEach(() => resetUserProfile());

  test('uses gameId and ply as the stable evidence ID', () => {
    const fact = createFact();

    expect(assertAnalysisFactV1(fact)).toBe(fact);
    expect(getAnalysisFactEvidenceId(fact)).toBe('contract-game:ply:1');
  });

  test('rejects a fact whose legal move evidence does not match its FEN', () => {
    const fact = createFact({ playedMove: { uci: 'e2e3', san: 'e4', fen: createFact().fenAfter } });

    expect(() => assertAnalysisFactV1(fact)).toThrow(/playedMove/);
  });

  test('rejects a non-canonical analyzedAt timestamp before persistence', () => {
    expect(assertAnalysisFactV1(createFact({ analyzedAt: '2026-09-06T00:00:00Z' })).analyzedAt)
      .toBe('2026-09-06T00:00:00Z');
    expect(() => assertAnalysisFactV1(createFact({ analyzedAt: 'September 6, 2026' })))
      .toThrow(/analyzedAt/);
  });

  test('rejects an illegal continuation in a candidate line', () => {
    const fact = createFact({
      candidates: [{
        uci: 'e2e4',
        san: 'e4',
        eval: { type: 'cp', value: 20, display: '+0.20' },
        pv: ['e2e4', 'e2e4'],
      }],
    });

    expect(() => assertAnalysisFactV1(fact)).toThrow(/candidates\[0\]\.pv/);
  });

  test('rejects duplicate or missing ply evidence in a game analysis', () => {
    const duplicate = createFact({ ply: 1 });
    const missing = createFact({ ply: 3, turn: 'w' });

    expect(() => assertGameAnalysisV1(createAnalysis([duplicate, missing]))).toThrow(/ply 2/);
  });

  test('gives Coach only validated facts and the same evidence ID', () => {
    const fact = createFact();
    const context = buildCoachContext(createAnalysis([fact]), 1);

    expect(context.moveContext?.evidenceId).toBe('contract-game:ply:1');
    expect(() => buildCoachContext(createAnalysis([{ ...fact, fenAfter: 'invalid' }]), 1)).toThrow(/fenAfter/);
  });

  test('records learning tags from validated facts and rejects invalid evidence', () => {
    const fact = createFact({
      classification: 'mistake',
      centipawnLoss: 120,
      skillTags: ['opening_principle', 'tactical_oversight'],
    });

    recordAnalysisFacts([fact]);
    expect(getUserProfile().commonMistakes).toEqual(expect.arrayContaining([
      'opening_principle',
      'tactical_oversight',
    ]));
    expect(() => recordAnalysisFacts([{ ...fact, schemaVersion: 'broken' }])).toThrow(/schemaVersion/);
  });

  test('persists a game review with its trusted fact and stable evidence trace', () => {
    const fact = createFact({ classification: 'mistake', centipawnLoss: 120 });

    recordGameReview({ reviewId: 'review-contract-1', gameId: fact.gameId, facts: [fact] });
    const profile = getUserProfile();

    expect(profile.persistence.gameReviews).toEqual([
      expect.objectContaining({
        schemaVersion: 'gameReview.v1',
        reviewId: 'review-contract-1',
        gameId: 'contract-game',
        factIds: ['contract-game:ply:1'],
      }),
    ]);
    expect(profile.persistence.analysisFacts).toEqual([
      expect.objectContaining({
        gameId: 'contract-game',
        ply: 1,
        engine: expect.objectContaining({ source: 'stockfish_wasm' }),
      }),
    ]);
    expect(profile.persistence.skillStates).toEqual([
      expect.objectContaining({
        schemaVersion: 'skillState.v1', skillId: 'opening_principle', score: -1,
        evidenceIds: ['contract-game:ply:1'],
      }),
    ]);
  });
});
