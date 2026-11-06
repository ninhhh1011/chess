import { afterEach, describe, expect, test, vi } from 'vitest';
import { getBestMove } from '../services/stockfishService';

const FENS = {
  white: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  black: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
};

afterEach(() => vi.unstubAllGlobals());

async function analyzeWithWorker(fen: string, score: string, moveOverride?: string) {
  const move = moveOverride ?? (fen.split(' ')[1] === 'b' ? 'g8h6' : 'e2e4');
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage(message: string) {
      if (message === 'init') queueMicrotask(() => this.onmessage?.({ data: { type: 'ready', success: true } } as MessageEvent));
      if (message.startsWith('go ')) queueMicrotask(() => {
        this.onmessage?.({ data: { type: 'output', data: `info depth 8 ${score} pv ${move}` } } as MessageEvent);
        this.onmessage?.({ data: { type: 'output', data: `bestmove ${move}` } } as MessageEvent);
      });
    }
    terminate() {}
  }
  vi.stubGlobal('Worker', FakeWorker);
  vi.resetModules();
  const { analyzeFen } = await import('../services/stockfishService');
  return analyzeFen({ fen, depth: 8, elo: 1200 });
}

describe('Stockfish canonical evaluation contract', () => {
  test.each([
    [FENS.white, 'score cp 35', 'cp', 35, '+0.35'],
    [FENS.black, 'score cp 35', 'cp', -35, '-0.35'],
    [FENS.white, 'score mate 3', 'mate', 3, 'Mate in 3 for White'],
    [FENS.black, 'score mate 3', 'mate', -3, 'Mate in 3 for Black'],
    [FENS.white, 'score mate -4', 'mate', -4, 'Mate in 4 for Black'],
    [FENS.black, 'score mate -4', 'mate', 4, 'Mate in 4 for White'],
  ] as const)('returns white POV for %s with %s', async (fen, score, type, value, display) => {
    const result = await analyzeWithWorker(fen, score);
    expect(result).toMatchObject({ source: 'stockfish_wasm', perspective: 'white' });
    expect(result.evaluation).toMatchObject({ type, value, display });
  });

  test('keeps a legal best move but reports no evaluation when worker sends no score', async () => {
    const result = await analyzeWithWorker(FENS.white, '');
    expect(result).toMatchObject({ source: 'stockfish_wasm', perspective: 'white', bestMove: 'e2e4' });
    expect(result.evaluation).toBeNull();
  });

  test('reports fallback with no evaluation when the worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    vi.resetModules();
    const { analyzeFen } = await import('../services/stockfishService');
    const result = await analyzeFen({ fen: FENS.white, depth: 8, elo: 1200 });
    expect(result).toMatchObject({ source: 'fallback', perspective: 'white' });
    expect(result.evaluation).toBeNull();
  });

  test('reports invalid worker move as fallback and keeps evaluation null', async () => {
    const result = await analyzeWithWorker(FENS.white, 'score cp 80', 'z9z9');
    expect(result).toMatchObject({ source: 'fallback', perspective: 'white' });
    expect(result.evaluation).toBeNull();
  });

  test('reports a terminal position without legal moves as fallback with no evaluation', async () => {
    vi.stubGlobal('Worker', undefined);
    vi.resetModules();
    const { analyzeFen } = await import('../services/stockfishService');
    const result = await analyzeFen({ fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', depth: 8, elo: 1200 });
    expect(result).toMatchObject({ source: 'fallback', perspective: 'white', bestMove: null });
    expect(result.evaluation).toBeNull();
  });

  test('does not turn cancellation into a fallback move', async () => {
    await expect(getBestMove({ fen: FENS.white, signal: AbortSignal.abort() }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
