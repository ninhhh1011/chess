import { analyzeFenFallback, getBestMoveFallback } from './fallbackChessEngine';
import { isLegalUciMove } from '../utils/chessMoveValidation';
import type { AnalysisResult, EngineConfig, Evaluation } from '../types/ChessTypes';
import { toWhitePerspective } from '../domain/engine/evaluation';

const ENGINE_VERSION = '2026-05-30-simplified';
const ENGINE_CRASH_BASE_COOLDOWN_MS = 60000;
const ENGINE_CRASH_MAX_COOLDOWN_MS = 300000;
const STOCKFISH_MIN_UCI_ELO = 1320;
const STOCKFISH_MAX_UCI_ELO = 3190;

let worker: Worker | null = null;
let engineReady = false;
let engineState: 'idle' | 'loading' | 'ready' | 'analyzing' | 'error' = 'idle';
let engineDisabledUntil = 0;
let engineFailureCount = 0;
let hasLoggedWorkerUnavailable = false;
let engineInitPromise: Promise<boolean> | null = null;
let cancelEngineInit: (() => void) | null = null;
let currentAnalysis: { requestId: number; fen: string; cancel: (reason?: Error) => void } | null = null;
let analysisQueue: Promise<void> = Promise.resolve();
let currentRequestId = 0;
let lifecycleGeneration = 0;
let activeRequest: AnalysisRequest | null = null;

interface AnalysisRequest {
  generation: number;
  controller: AbortController;
  settled: boolean;
  started: boolean;
  abort: (reason: Error) => void;
}

const pendingRequests = new Set<AnalysisRequest>();

function createAbortError(message: string): DOMException {
  return new DOMException(message, 'AbortError');
}

function debug(...args: unknown[]) {
  if (typeof window !== 'undefined' && (window as unknown as { __DEV__?: boolean }).__DEV__ && localStorage.getItem('debugStockfish') === '1') {
    console.log('[Stockfish]', ...args);
  }
}

/**
 * Initialize the Stockfish engine
 */
export async function initEngine(): Promise<boolean> {
  if (Date.now() < engineDisabledUntil) {
    engineState = 'error';
    return false;
  }

  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    engineState = 'error';
    return false;
  }

  if (engineReady && worker) {
    debug('Engine already ready');
    return true;
  }

  if (engineInitPromise) return engineInitPromise;

  engineState = 'loading';

  try {
    if (worker) {
      worker.terminate();
    }

    const initializingWorker = new Worker(`/stockfish-worker.js?v=${ENGINE_VERSION}`);
    worker = initializingWorker;

    engineInitPromise = new Promise((resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let cancel: () => void;

      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        if (timeout !== null) clearTimeout(timeout);
        if (cancelEngineInit === cancel) cancelEngineInit = null;
        engineInitPromise = null;
        resolve(success);
      };

      cancel = () => {
        initializingWorker.onmessage = null;
        initializingWorker.onerror = null;
        finish(false);
      };
      cancelEngineInit = cancel;

      timeout = setTimeout(() => {
        if (worker === initializingWorker) disableEngine('Init timeout');
        else initializingWorker.terminate();
        finish(false);
      }, 10000);

      initializingWorker.onmessage = (event: MessageEvent) => {
        if (worker !== initializingWorker) return;
        if (event.data.type === 'ready') {
          if (event.data.success) {
            engineReady = true;
            engineState = 'ready';
            engineFailureCount = 0;
            hasLoggedWorkerUnavailable = false;
            debug('Engine ready!');
            finish(true);
          } else {
            disableEngine(event.data.error || 'Init failed');
            finish(false);
          }
        }
      };

      initializingWorker.onerror = () => {
        if (worker !== initializingWorker) return;
        disableEngine('Worker error');
        finish(false);
      };

      initializingWorker.postMessage('init');
    });
    return engineInitPromise;
  } catch (error) {
    disableEngine(String(error));
    return false;
  }
}

function disableEngine(reason: string) {
  engineFailureCount++;
  const cooldownMs = Math.min(
    ENGINE_CRASH_BASE_COOLDOWN_MS * (2 ** Math.max(engineFailureCount - 1, 0)),
    ENGINE_CRASH_MAX_COOLDOWN_MS
  );

  engineDisabledUntil = Date.now() + cooldownMs;
  engineState = 'error';
  engineReady = false;

  if (worker) {
    worker.terminate();
    worker = null;
  }

  if (!hasLoggedWorkerUnavailable) {
    debug('Worker unavailable, using fallback temporarily:', reason);
    hasLoggedWorkerUnavailable = true;
  }
}

export function isEngineReady(): boolean {
  return engineReady && worker !== null;
}

export function getEngineState() {
  return engineState;
}

/**
 * Configure engine for specific ELO level
 */
export async function configureEngine(
  elo: number,
  skillLevel: number | null = null,
  useSkillLevelOnly = false
): Promise<boolean> {
  if (!isEngineReady()) return false;

  try {
    if (useSkillLevelOnly || elo < STOCKFISH_MIN_UCI_ELO) {
      const effectiveSkillLevel = Math.max(0, Math.min(20, skillLevel ?? 20));
      worker!.postMessage('setoption name UCI_LimitStrength value false');
      worker!.postMessage(`setoption name Skill Level value ${effectiveSkillLevel}`);
    } else {
      // Use UCI_Elo only for levels inside the engine's supported range.
      worker!.postMessage('setoption name UCI_LimitStrength value true');
      const effectiveElo = Math.max(STOCKFISH_MIN_UCI_ELO, Math.min(STOCKFISH_MAX_UCI_ELO, elo));
      worker!.postMessage(`setoption name UCI_Elo value ${effectiveElo}`);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop current engine analysis
 */
export function stopEngine() {
  if (activeRequest) {
    activeRequest.abort(createAbortError('Stockfish analysis stopped'));
  } else if (worker) {
    worker.postMessage('stop');
  }
}

/**
 * Dispose of engine resources
 */
export function disposeEngine() {
  lifecycleGeneration += 1;
  for (const request of [...pendingRequests]) request.abort(createAbortError('Stockfish engine disposed'));
  cancelEngineInit?.();
  currentAnalysis?.cancel(createAbortError('Stockfish engine disposed'));
  if (worker) {
    worker.terminate();
    worker = null;
  }
  engineReady = false;
  engineState = 'idle';
}

/**
 * Cancel any pending analysis requests
 */
export function cancelPendingAnalysis() {
  for (const request of [...pendingRequests]) request.abort(createAbortError('Stockfish analysis cancelled'));
}

async function fallbackAnalysis(fen: string, depth: number, elo: number, warning = 'Stockfish unavailable', signal?: AbortSignal): Promise<AnalysisResult> {
  signal?.throwIfAborted();
  try {
    const fallback = await analyzeFenFallback({ fen, elo } as { fen: string; elo?: number });
    signal?.throwIfAborted();
    return {
      success: !!fallback?.bestMove,
      source: 'fallback',
      perspective: 'white',
      fen,
      bestMove: fallback?.bestMove || null,
      evaluation: fallback?.evaluation || null,
      depth: fallback?.depth || 0,
      pv: [],
      raw: [],
      warning,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error;
    return {
      success: false,
      source: 'fallback',
      perspective: 'white',
      fen,
      bestMove: null,
      evaluation: null,
      depth: 0,
      pv: [],
      raw: [],
      warning: 'No legal moves',
    };
  }
}

/**
 * Analyze FEN position and return best move with evaluation
 */
export function analyzeFen(config: EngineConfig): Promise<AnalysisResult> {
  if (!config.fen) return Promise.reject(new Error('FEN is required'));
  if (config.signal?.aborted) return Promise.reject(createAbortError('Stockfish analysis cancelled'));

  const id = ++currentRequestId;
  const request: AnalysisRequest = {
    generation: lifecycleGeneration,
    controller: new AbortController(),
    settled: false,
    started: false,
    abort: () => undefined,
  };

  let resolveRequest!: (result: AnalysisResult) => void;
  let rejectRequest!: (reason: unknown) => void;
  const result = new Promise<AnalysisResult>((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  let removeAbortListener = () => {};
  const settle = (settler: () => void) => {
    if (request.settled) return;
    request.settled = true;
    removeAbortListener();
    pendingRequests.delete(request);
    settler();
  };
  request.abort = (reason) => {
    if (request.settled) return;
    request.controller.abort(reason);
    if (currentAnalysis?.requestId === id) currentAnalysis.cancel(reason);
    else if (request.started && engineState === 'loading') {
      cancelEngineInit?.();
      worker?.terminate();
      worker = null;
      engineReady = false;
      engineState = 'idle';
    }
    settle(() => rejectRequest(reason));
  };
  pendingRequests.add(request);

  if (config.signal) {
    const onAbort = () => request.abort(createAbortError('Stockfish analysis cancelled'));
    config.signal.addEventListener('abort', onAbort, { once: true });
    removeAbortListener = () => config.signal?.removeEventListener('abort', onAbort);
  }

  const run = analysisQueue.then(async () => {
    if (request.settled) return;
    if (request.generation !== lifecycleGeneration) {
      request.abort(createAbortError('Stockfish engine disposed'));
      return;
    }
    request.started = true;
    activeRequest = request;
    try {
      const analysis = await analyzeFenNow({ ...config, signal: request.controller.signal }, id);
      settle(() => resolveRequest(analysis));
    } catch (error) {
      settle(() => rejectRequest(error));
    } finally {
      if (activeRequest === request) activeRequest = null;
    }
  });
  analysisQueue = run.then(() => undefined, () => undefined);
  return result;
}

async function analyzeFenNow(config: EngineConfig, requestId: number): Promise<AnalysisResult> {
  const { fen, depth = 10, movetime = null, elo = 1200, skillLevel = null, useSkillLevelOnly, signal } = config;

  if (!fen) {
    throw new Error('FEN is required');
  }
  signal?.throwIfAborted();

  const effectiveElo = elo ?? 1200;

  // Init engine if needed
  if (!isEngineReady()) {
    const initialized = await initEngine();
    if (!initialized) {
      signal?.throwIfAborted();
      return await fallbackAnalysis(fen, depth, effectiveElo, 'Stockfish unavailable', signal);
    }
  }
  signal?.throwIfAborted();

  // Configure ELO
  if (effectiveElo || skillLevel !== null) {
    await configureEngine(effectiveElo, skillLevel, useSkillLevelOnly);
  }
  signal?.throwIfAborted();

  const timeoutMs = depth <= 12 ? 3000 : depth <= 18 ? 4500 : 6000;

  return new Promise((resolve, reject) => {
    const analysisWorker = worker!;
    const timeout = setTimeout(() => {
      if (settled) return;
      analysisWorker.terminate();
      if (worker === analysisWorker) worker = null;
      engineReady = false;
      engineState = 'idle';
      fallbackAnalysis(fen, depth, effectiveElo, 'Stockfish timeout', signal).then(finish, fail);
    }, timeoutMs);

    let settled = false;
    let bestMove: string | null = null;
    let evaluation: Evaluation | null = null;
    let lastDepth = 0;
    const pv: string[] = [];

    function cleanup() {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      analysisWorker.onmessage = null;
      analysisWorker.onerror = null;
    }

    function finish(result: AnalysisResult) {
      if (settled) return;
      settled = true;
      cleanup();
      if (currentAnalysis?.requestId === requestId) currentAnalysis = null;
      if (worker === analysisWorker) engineState = isEngineReady() ? 'ready' : 'idle';
      resolve(result);
    }

    function fail(reason: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      if (currentAnalysis?.requestId === requestId) currentAnalysis = null;
      if (worker === analysisWorker) engineState = isEngineReady() ? 'ready' : 'idle';
      reject(reason);
    }

    function cancel(reason = new Error('Stockfish analysis disposed')) {
      if (settled) return;
      settled = true;
      cleanup();
      analysisWorker.terminate();
      if (worker === analysisWorker) worker = null;
      engineReady = false;
      if (currentAnalysis?.requestId === requestId) currentAnalysis = null;
      engineState = 'idle';
      reject(reason);
    }

    const onAbort = () => cancel(new DOMException('Stockfish analysis cancelled', 'AbortError'));
    signal?.addEventListener('abort', onAbort, { once: true });
    currentAnalysis = { requestId, fen, cancel };

    analysisWorker.onmessage = (event: MessageEvent) => {
      if (settled || worker !== analysisWorker || currentAnalysis?.requestId !== requestId) return;
      const message = event.data;

      if (message.type === 'error') {
        disableEngine(message.error);
        fallbackAnalysis(fen, depth, effectiveElo, 'Stockfish error', signal).then(finish, fail);
        return;
      }

      if (message.type !== 'output') return;

      const line: string = message.data;

      // Parse depth
      const depthMatch = line.match(/depth (\d+)/);
      if (depthMatch) {
        lastDepth = parseInt(depthMatch[1], 10);
      }

      // Parse evaluation
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);

      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        evaluation = toWhitePerspective(
          { type: 'mate', value: mateIn, display: `Mate in ${Math.abs(mateIn)}` },
          fen.split(' ')[1] === 'b' ? 'b' : 'w'
        );
      } else if (cpMatch) {
        const cp = parseInt(cpMatch[1], 10);
        evaluation = toWhitePerspective(
          { type: 'cp', value: cp, display: `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}` },
          fen.split(' ')[1] === 'b' ? 'b' : 'w'
        );
      }

      // Parse PV
      const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);
      if (pvMatch) {
        pv.splice(0, pv.length, ...pvMatch[1].split(' ').filter((m) => m.length >= 4));
      }

      // Best move
      if (line.startsWith('bestmove')) {
        const match = line.match(/bestmove (\S+)/);
        if (match) {
          bestMove = match[1];
        }

        const candidate = bestMove || pv[0] || null;
        if (candidate && isLegalUciMove(fen, candidate)) {
          finish({
            success: true,
            source: 'stockfish_wasm',
            perspective: 'white',
            fen,
            bestMove: candidate,
            evaluation,
            depth: lastDepth || depth,
            pv,
            raw: [],
          });
        } else {
          fallbackAnalysis(fen, depth, effectiveElo, 'Invalid bestmove', signal).then(finish, fail);
        }
      }
    };

    analysisWorker.onerror = () => {
      if (settled || worker !== analysisWorker || currentAnalysis?.requestId !== requestId) return;
      disableEngine('Worker error');
      fallbackAnalysis(fen, depth, effectiveElo, 'Worker error', signal).then(finish, fail);
    };

    try {
      analysisWorker.postMessage('ucinewgame');
      analysisWorker.postMessage(`position fen ${fen}`);
      analysisWorker.postMessage(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
      engineState = 'analyzing';
    } catch {
      disableEngine('Command error');
      // Use synchronous fallback since we're in a sync context
      fallbackAnalysis(fen, depth, effectiveElo, 'Command error', signal).then(finish, fail);
    }
  });
}

/**
 * Get best move only (convenience function)
 */
export async function getBestMove(config: Omit<EngineConfig, 'purpose'>): Promise<string | null> {
  try {
    const result = await analyzeFen(config);
    return result.bestMove;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error;
    return getBestMoveFallback({ fen: config.fen, elo: config.elo ?? 1200 });
  }
}
