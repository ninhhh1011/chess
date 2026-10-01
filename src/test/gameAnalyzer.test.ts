import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Chess } from 'chess.js';
import { analyzeGame } from '../services/analysis/gameAnalyzer';
import * as stockfishService from '../services/stockfishService';
import type { AnalysisResult, EngineConfig } from '../types/ChessTypes';

vi.mock('../services/stockfishService', () => ({
  analyzeFen: vi.fn(),
  isEngineReady: vi.fn(() => true),
}));

const PGN = '1. e4 e5 2. Qh5 Nc6 *';
const request = {
  gameId: 'two-pass-contract',
  pgn: PGN,
  playerSide: 'w' as const,
  options: { maxDepth: 12, movetimeMs: 500, multiPv: 1, analyzeTopMistakes: 1 },
};

function result(fen: string, value: number, bestMove: string): AnalysisResult {
  return {
    success: true,
    source: 'stockfish_wasm',
    fen,
    bestMove,
    evaluation: { type: 'cp', value, display: String(value) },
    depth: 8,
    pv: [bestMove],
    raw: [],
  };
}

function positions() {
  const game = new Chess();
  game.loadPgn(PGN);
  return game.history({ verbose: true });
}

describe('two-pass game analyzer', () => {
  const analyzeFen = stockfishService.analyzeFen as ReturnType<typeof vi.fn>;

  beforeEach(() => vi.clearAllMocks());

  test('covers every ply once and deep-analyzes the deterministic top candidate', async () => {
    const moves = positions();
    const shallow = new Map([
      [moves[0].before, result(moves[0].before, 0, 'e2e4')],
      [moves[0].after, result(moves[0].after, -20, 'c7c5')],
      [moves[1].after, result(moves[1].after, 10, 'g1f3')],
      [moves[2].after, result(moves[2].after, 200, 'b8c6')],
      [moves[3].after, result(moves[3].after, -190, 'g1f3')],
    ]);

    analyzeFen.mockImplementation(async (config: EngineConfig) => {
      if (config.depth === 12) return { ...result(config.fen, 10, 'g1f3'), pv: ['h5f7'] };
      const analysis = shallow.get(config.fen);
      if (!analysis) throw new Error(`Unexpected FEN: ${config.fen}`);
      return analysis;
    });

    const analysis = await analyzeGame(request);

    expect(analysis.topMistakes).toEqual(['3']);
    expect(analysis.analysis.map(fact => fact.ply)).toEqual([1, 2, 3, 4]);
    expect(new Set(analysis.analysis.map(fact => fact.ply)).size).toBe(4);
    expect(analysis.analysis.every(fact => fact.candidates.length === 1)).toBe(true);
    expect(analysis.analysis[0]).toEqual(expect.objectContaining({
      bestMove: expect.objectContaining({ uci: 'e2e4', san: 'e4' }),
      evalBefore: expect.objectContaining({ value: 0 }),
      evalAfter: expect.objectContaining({ value: 20 }),
    }));
    expect(analyzeFen).toHaveBeenCalledWith(expect.objectContaining({
      fen: moves[2].before,
      depth: 12,
    }));
    expect(analysis.analysis[2].candidates[0].pv).toEqual(['g1f3']);
  });

  test('fails with the exact pass and ply instead of hiding an engine error', async () => {
    const moves = positions();
    analyzeFen.mockImplementation(async ({ fen }: EngineConfig) => {
      if (fen === moves[1].after) throw new Error('engine exploded');
      return result(fen, 0, 'e2e4');
    });

    await expect(analyzeGame(request)).rejects.toThrow(
      'Pass 1 failed at ply 2/4: engine exploded'
    );
  });

  test('reports the exact cancellation point', async () => {
    analyzeFen.mockImplementation(async ({ fen }: EngineConfig) => result(fen, 0, 'e2e4'));
    let checks = 0;

    await expect(analyzeGame(request, { onCancel: () => ++checks === 2 })).rejects.toThrow(
      'Analysis cancelled during shallow pass at ply 1/4'
    );
  });

  test('reports the exact deep-pass engine failure', async () => {
    const moves = positions();
    analyzeFen.mockImplementation(async (config: EngineConfig) => {
      if (config.depth === 12) throw new Error('deep exploded');
      const move = new Chess(config.fen).moves({ verbose: true })[0];
      return result(config.fen, config.fen === moves[2].after ? 200 : 0, `${move.from}${move.to}${move.promotion || ''}`);
    });

    await expect(analyzeGame(request)).rejects.toThrow(
      'Pass 2 failed at candidate 1/1 (ply 3): deep exploded'
    );
  });

  test('reports the exact deep-pass cancellation point', async () => {
    const moves = positions();
    analyzeFen.mockImplementation(async (config: EngineConfig) => {
      const move = new Chess(config.fen).moves({ verbose: true })[0];
      return result(config.fen, config.fen === moves[2].after ? 200 : 0, `${move.from}${move.to}${move.promotion || ''}`);
    });
    let checks = 0;

    await expect(analyzeGame(request, { onCancel: () => ++checks === 6 })).rejects.toThrow(
      'Analysis cancelled during deep pass at candidate 1/1'
    );
  });
});
