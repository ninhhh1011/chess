import { afterEach, describe, expect, it, vi } from 'vitest';

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: string[] = [];
  terminated = false;

  constructor() { ControlledWorker.instances.push(this); }

  postMessage(message: string) {
    this.messages.push(message);
    if (message === 'init') queueMicrotask(() => this.onmessage?.({ data: { type: 'ready', success: true } } as MessageEvent));
  }

  terminate() { this.terminated = true; }

  emit(line: string) {
    this.onmessage?.({ data: { type: 'output', data: line } } as MessageEvent);
  }
}

async function loadService() {
  ControlledWorker.instances = [];
  vi.stubGlobal('Worker', ControlledWorker);
  vi.resetModules();
  return import('../services/stockfishService');
}

async function waitFor(predicate: () => boolean) {
  for (let i = 0; i < 100; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Timed out waiting for worker lifecycle event');
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Stockfish request lifecycle', () => {
  it('aborts a queued request without initializing or running it', async () => {
    const service = await loadService();
    const active = service.analyzeFen({ fen: FEN, depth: 8 });
    await waitFor(() => ControlledWorker.instances[0]?.messages.includes('go depth 8'));
    const controller = new AbortController();
    const queued = service.analyzeFen({ fen: FEN, depth: 8, signal: controller.signal });
    controller.abort();

    await expect(queued).rejects.toMatchObject({ name: 'AbortError' });
    expect(ControlledWorker.instances).toHaveLength(1);
    expect(ControlledWorker.instances[0].messages.filter((message) => message.startsWith('go '))).toEqual(['go depth 8']);
    ControlledWorker.instances[0].emit('bestmove e2e4');
    await expect(active).resolves.toMatchObject({ source: 'stockfish_wasm', bestMove: 'e2e4' });
  });

  it('settles an in-flight abort once and ignores later worker output', async () => {
    const service = await loadService();
    const controller = new AbortController();
    const request = service.analyzeFen({ fen: FEN, depth: 8, signal: controller.signal });
    await waitFor(() => ControlledWorker.instances[0]?.messages.includes('go depth 8'));
    const oldHandler = ControlledWorker.instances[0].onmessage;
    let settled = 0;
    request.catch(() => { settled += 1; });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    oldHandler?.({ data: { type: 'output', data: 'bestmove e2e4' } } as MessageEvent);
    await Promise.resolve();
    expect(settled).toBe(1);
  });

  it('does not let dispose recreate a worker for queued work', async () => {
    const service = await loadService();
    const active = service.analyzeFen({ fen: FEN, depth: 8 });
    await waitFor(() => ControlledWorker.instances[0]?.messages.includes('go depth 8'));
    const queued = service.analyzeFen({ fen: FEN, depth: 8 });
    service.disposeEngine();

    await expect(active).rejects.toMatchObject({ name: 'AbortError' });
    await expect(queued).rejects.toMatchObject({ name: 'AbortError' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ControlledWorker.instances).toHaveLength(1);
  });

  it('recovers from timeout and handles the next request on a replacement worker', async () => {
    vi.useFakeTimers();
    const service = await loadService();
    const first = service.analyzeFen({ fen: FEN, depth: 8 });
    await vi.waitFor(() => expect(ControlledWorker.instances[0]?.messages).toContain('go depth 8'));
    await vi.advanceTimersByTimeAsync(3001);
    await expect(first).resolves.toMatchObject({ source: 'fallback', warning: 'Stockfish timeout' });

    const next = service.analyzeFen({ fen: FEN, depth: 8 });
    await vi.waitFor(() => expect(ControlledWorker.instances[1]?.messages).toContain('go depth 8'));
    ControlledWorker.instances[1].emit('bestmove e2e4');
    await expect(next).resolves.toMatchObject({ source: 'stockfish_wasm', bestMove: 'e2e4' });
  });

  it('rejects promptly when cancellation arrives during initialization fallback', async () => {
    const fallbackStarted = vi.fn();
    vi.doMock('../services/fallbackChessEngine', () => ({
      analyzeFenFallback: vi.fn(() => {
        fallbackStarted();
        return new Promise((resolve) => setTimeout(() => resolve({ bestMove: 'e2e4', evaluation: null }), 50));
      }),
      getBestMoveFallback: vi.fn(),
    }));
    vi.stubGlobal('Worker', undefined);
    vi.resetModules();
    const service = await import('../services/stockfishService');
    const controller = new AbortController();
    const request = service.analyzeFen({ fen: FEN, depth: 8, signal: controller.signal });
    await waitFor(() => fallbackStarted.mock.calls.length > 0);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    vi.doUnmock('../services/fallbackChessEngine');
  });

  it('ignores callbacks from a replaced worker while resolving the newer request', async () => {
    const service = await loadService();
    const controller = new AbortController();
    const oldRequest = service.analyzeFen({ fen: FEN, depth: 8, signal: controller.signal });
    await waitFor(() => ControlledWorker.instances[0]?.messages.includes('go depth 8'));
    const oldHandler = ControlledWorker.instances[0].onmessage;
    controller.abort();
    await expect(oldRequest).rejects.toMatchObject({ name: 'AbortError' });

    const current = service.analyzeFen({ fen: FEN, depth: 8 });
    await waitFor(() => ControlledWorker.instances[1]?.messages.includes('go depth 8'));
    oldHandler?.({ data: { type: 'output', data: 'bestmove e2e4' } } as MessageEvent);
    await Promise.resolve();
    ControlledWorker.instances[1].emit('bestmove d2d4');
    await expect(current).resolves.toMatchObject({ source: 'stockfish_wasm', bestMove: 'd2d4' });
  });
});
