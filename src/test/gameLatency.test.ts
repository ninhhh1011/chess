/** Deterministic 80-ply unit contract. Real WASM latency is measured in P1-T08. */

import { Chess } from 'chess.js';
import { describe, test, expect, beforeAll, vi } from 'vitest';
import { analyzeGame } from '../services/analysis/gameAnalyzer';
import { parsePgn, replayPgn } from '../services/analysis/pgnParser';
import { RKLPC7MK_FIRST_40_PGN } from '../services/analysis/pgnFixtures';
import * as stockfishService from '../services/stockfishService';

vi.mock('../services/stockfishService', () => ({
  analyzeFen: vi.fn(),
  isEngineReady: vi.fn(() => true),
}));

// Deliberately fixed-size prefix of the 47-move Lichess game rklpc7mk.
const TEST_PGN = RKLPC7MK_FIRST_40_PGN;

describe('Deterministic game-analysis unit contract (40 moves / 80 plies)', () => {
  let fullMoves: number;
  let plies: number;
  let finalFen: string;

  beforeAll(() => {
    // Verify the test PGN has exactly 40 full moves and 80 plies
    const result = parsePgn(TEST_PGN);
    expect(result.success).toBe(true);

    fullMoves = Math.floor(result.moves.length / 2);
    plies = result.moves.length;

    // Get final FEN via replay
    const replay = replayPgn(TEST_PGN);
    expect(replay).not.toBeNull();
    finalFen = replay!.finalFen;

    expect(fullMoves).toBe(40);
    expect(plies).toBe(80);

    const analyzeFen = stockfishService.analyzeFen as ReturnType<typeof vi.fn>;
    analyzeFen.mockImplementation(async ({ fen }) => {
      const [,, , , , fullmoveText] = fen.split(' ');
      const turn = fen.split(' ')[1];
      const positionPly = (Number(fullmoveText) - 1) * 2 + (turn === 'b' ? 1 : 0);
      const whiteEval = positionPly === 21 ? -200 : 0;
      const legal = new Chess(fen).moves({ verbose: true })[0];
      const bestMove = legal ? `${legal.from}${legal.to}${legal.promotion || ''}` : null;

      return {
        success: true,
        source: 'stockfish_wasm',
        fen,
        bestMove,
        evaluation: { type: 'cp', value: turn === 'w' ? whiteEval : -whiteEval, display: String(whiteEval) },
        depth: 8,
        pv: bestMove ? [bestMove] : [],
        raw: [],
      };
    });
  });

  test('produces one fact per legal ply and deep-analyzes selected candidates', async () => {
    const result = await analyzeGame({
      gameId: 'coverage-80',
      pgn: TEST_PGN,
      playerSide: 'w',
      options: { maxDepth: 10, movetimeMs: 500, multiPv: 1, analyzeTopMistakes: 2 },
    });

    expect(result.analysis.map(fact => fact.ply)).toEqual(Array.from({ length: 80 }, (_, i) => i + 1));
    expect(new Set(result.analysis.map(fact => fact.ply)).size).toBe(80);
    expect(result.analysis.at(-1)?.fenAfter).toBe(finalFen);
    expect(result.topMistakes).toEqual(['21', '22']);
    expect(result.topMistakes.every(ply => result.analysis[Number(ply) - 1].candidates.length === 1)).toBe(true);
    expect(result.engine.source).toBe('stockfish_wasm');
  });
});
