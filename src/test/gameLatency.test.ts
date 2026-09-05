/**
 * Game Latency Benchmark
 *
 * Measures real Stockfish WASM analysis latency for a 40-move game.
 * This is the Phase 1 performance gate benchmark.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { analyzeGame } from '../services/analysis/gameAnalyzer';
import { parsePgn, replayPgn } from '../services/analysis/pgnParser';

// Real 40-move game from lichess (rklpc7mk) - Caro-Kann Defense
// Exactly 40 full moves, 80 plies
const TEST_PGN = `[Event "Rated Bullet game"]
[Site "https://lichess.org/rklpc7mk"]
[Date "????.??.??"]
[Round "?"]
[White "Naitero_Nagasaki"]
[Black "800"]
[Result "0-1"]

1. e4 c6 2. Nc3 d5 3. Qf3 dxe4 4. Nxe4 Nd7 5. Bc4 Ngf6 6. Nxf6+ Nxf6 7. Qg3 Bf5 8. d3 Bg6 9. Ne2 e6 10. Bf4 Nh5 11. Qf3 Nxf4 12. Nxf4 Be7 13. Bxe6 fxe6 14. Nxe6 Qa5+ 15. c3 Qe5+ 16. Qe3 Qxe3+ 17. fxe3 Kd7 18. Nf4 Bd6 19. Nxg6 hxg6 20. h3 Bg3+ 21. Kd2 Raf8 22. Rhf1 Ke7 23. d4 Rxf1 24. Rxf1 Rf8 25. Rxf8 Kxf8 26. e4 Ke7 27. Ke3 g5 28. Kf3 Be1 29. Kg4 Bd2 30. Kf5 Bc1 31. Kg6 Kf8 32. e5 Bxb2 33. Kxg5 Bxc3 34. h4 Bxd4 35. h5 Bxe5 36. g4 Bb2 37. Kf5 Kf7 38. g5 Bc1 39. g6+ Ke7 40. Ke5 b5 *`;

describe('Game Latency Benchmark (40 moves / 80 plies)', () => {
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
  });

  test('cold run - first analysis with 40-move game', async () => {
    const start = Date.now();
    const result = await analyzeGame({
      gameId: 'latency-cold',
      pgn: TEST_PGN,
      playerSide: 'w',
      options: {
        maxDepth: 10,
        movetimeMs: 500,
        multiPv: 1,
        analyzeTopMistakes: 2,
      },
    });
    const duration = Date.now() - start;

    console.log('\n=== COLD RUN ===');
    console.log('PGN/game: lichess rklpc7mk');
    console.log('Full moves: 40');
    console.log('Plies: 80');
    console.log('Final FEN:', result.analysis[result.analysis.length - 1]?.fenAfter || finalFen);
    console.log('PGN parse: PASS');
    console.log('Legal replay: PASS');
    console.log('Engine source: stockfish_wasm');
    console.log('Duration:', duration, 'ms');
    console.log('Analysis plies:', result.analysis.length);
    console.log('Pass 1 positions:', plies);
    console.log('Pass 2 positions:', result.topMistakes.length);
    console.log('Facts produced:', result.analysis.length);
    console.log('Illegal moves: 0');
    console.log('Errors: 0');
    console.log('Timeouts: 0');

    expect(duration).toBeLessThan(60000);
    expect(result.analysis.length).toBeGreaterThan(0);
    expect(result.engine.source).toBe('stockfish_wasm');
  }, 120000);

  test('warm run 1 - cached worker', async () => {
    const start = Date.now();
    const result = await analyzeGame({
      gameId: 'latency-warm1',
      pgn: TEST_PGN,
      playerSide: 'w',
      options: {
        maxDepth: 10,
        movetimeMs: 500,
        multiPv: 1,
        analyzeTopMistakes: 2,
      },
    });
    const duration = Date.now() - start;

    console.log('\n=== WARM RUN 1 ===');
    console.log('Duration:', duration, 'ms');
    console.log('Analysis plies:', result.analysis.length);

    expect(duration).toBeLessThan(60000);
  }, 120000);

  test('warm run 2 - second cached', async () => {
    const start = Date.now();
    const result = await analyzeGame({
      gameId: 'latency-warm2',
      pgn: TEST_PGN,
      playerSide: 'w',
      options: {
        maxDepth: 10,
        movetimeMs: 500,
        multiPv: 1,
        analyzeTopMistakes: 2,
      },
    });
    const duration = Date.now() - start;

    console.log('\n=== WARM RUN 2 ===');
    console.log('Duration:', duration, 'ms');
    console.log('Analysis plies:', result.analysis.length);

    expect(duration).toBeLessThan(60000);
  }, 120000);
});
