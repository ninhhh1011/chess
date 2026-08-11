import { analyzeFenFallback, getBestMoveFallback } from './fallbackChessEngine';
import { isLegalUciMove } from '../utils/chessMoveValidation';
import type { AnalysisResult, EngineConfig, Evaluation } from '../types/ChessTypes';

const ENGINE_VERSION = '2026-05-30-simplified';
const ENGINE_CRASH_BASE_COOLDOWN_MS = 60000;
const ENGINE_CRASH_MAX_COOLDOWN_MS = 300000;

let worker: Worker | null = null;
let engineReady = false;
let engineState: 'idle' | 'loading' | 'ready' | 'analyzing' | 'error' = 'idle';
let engineDisabledUntil = 0;
let engineFailureCount = 0;
let hasLoggedWorkerUnavailable = false;
let currentAnalysis: { stopped: boolean; fen: string } | null = null;

// Simple request ID for request cancellation
let currentRequestId = 0;

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

  if (engineState === 'loading') {
    return false;
  }

  engineState = 'loading';

  try {
    if (worker) {
      worker.terminate();
    }

    worker = new Worker(`/stockfish-worker.js?v=${ENGINE_VERSION}`);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        disableEngine('Init timeout');
        resolve(false);
      }, 10000);

      worker!.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'ready') {
          clearTimeout(timeout);
          if (event.data.success) {
            engineReady = true;
            engineState = 'ready';
            engineFailureCount = 0;
            hasLoggedWorkerUnavailable = false;
            debug('Engine ready!');
            resolve(true);
          } else {
            disableEngine(event.data.error || 'Init failed');
            resolve(false);
          }
        }
      };

      worker!.onerror = () => {
        clearTimeout(timeout);
        disableEngine('Worker error');
        resolve(false);
      };

      worker!.postMessage('init');
    });
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
export async function configureEngine(elo: number): Promise<boolean> {
  if (!isEngineReady()) return false;

  try {
    if (elo < 1200) {
      // Use Skill Level for low ELO
      const skillLevel = Math.max(0, Math.floor((1200 - elo) / 50));
      worker!.postMessage('setoption name UCI_LimitStrength value false');
      worker!.postMessage(`setoption name Skill Level value ${skillLevel}`);
    } else {
      // Use UCI_Elo for mid-high ELO
      worker!.postMessage('setoption name UCI_LimitStrength value true');
      worker!.postMessage(`setoption name UCI_Elo value ${elo}`);
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
  if (currentAnalysis) {
    currentAnalysis.stopped = true;
  }
  if (worker) {
    worker.postMessage('stop');
  }
}

/**
 * Dispose of engine resources
 */
export function disposeEngine() {
  stopEngine();
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
  stopEngine();
  currentAnalysis = null;
}

async function fallbackAnalysis(fen: string, depth: number, elo: number, warning = 'Stockfish unavailable'): Promise<AnalysisResult> {
  try {
    const fallback = await analyzeFenFallback({ fen, elo } as { fen: string; elo?: number });
    return {
      success: !!fallback?.bestMove,
      source: 'fallback',
      fen,
      bestMove: fallback?.bestMove || null,
      evaluation: fallback?.evaluation || null,
      depth: fallback?.depth || 0,
      pv: [],
      raw: [],
      warning,
    };
  } catch {
    return {
      success: false,
      source: 'fallback',
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
export async function analyzeFen(config: EngineConfig): Promise<AnalysisResult> {
  const { fen, depth = 10, movetime = null, elo = 1200, skillLevel = null } = config;

  if (!fen) {
    throw new Error('FEN is required');
  }

  // Init engine if needed
  if (!isEngineReady()) {
    const initialized = await initEngine();
    if (!initialized) {
      return await fallbackAnalysis(fen, depth, elo);
    }
  }

  // Configure ELO
  if (elo || skillLevel !== null) {
    await configureEngine(elo);
  }

  const requestId = ++currentRequestId;
  const timeoutMs = depth <= 12 ? 1500 : depth <= 18 ? 3000 : 6000;

  return new Promise((resolve) => {
    const timeout = setTimeout(async () => {
      if (currentAnalysis?.stopped || !currentAnalysis) return;
      // Timeout - use partial result or fallback
      const partial = getPartialResult(fen);
      if (partial) {
        resolve({ ...partial, source: 'stockfish_wasm_partial' });
      } else {
        resolve(await fallbackAnalysis(fen, depth, elo, 'Stockfish timeout'));
      }
    }, timeoutMs);

    currentAnalysis = { stopped: false, fen };
    let bestMove: string | null = null;
    let evaluation: Evaluation | null = null;
    let lastDepth = 0;
    const pv: string[] = [];

    function cleanup() {
      clearTimeout(timeout);
      if (worker) {
        worker.onmessage = null;
      }
    }

    function finish(result: AnalysisResult) {
      cleanup();
      currentAnalysis = null;
      engineState = 'ready';
      resolve(result);
    }

    worker!.onmessage = async (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'error') {
        disableEngine(message.error);
        finish(await fallbackAnalysis(fen, depth, elo, 'Stockfish error'));
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
        evaluation = { type: 'mate', value: mateIn, display: `Mate in ${Math.abs(mateIn)}` };
      } else if (cpMatch) {
        const cp = parseInt(cpMatch[1], 10);
        evaluation = { type: 'cp', value: cp, display: `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}` };
      }

      // Parse PV
      const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);
      if (pvMatch) {
        pv.push(...pvMatch[1].split(' ').filter((m) => m.length >= 4));
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
            fen,
            bestMove: candidate,
            evaluation: evaluation || { type: 'cp', value: 0, display: '0.00' },
            depth: lastDepth || depth,
            pv,
            raw: [],
          });
        } else {
          const partial = getPartialResult(fen);
          finish(partial || await fallbackAnalysis(fen, depth, elo, 'Invalid bestmove'));
        }
      }
    };

    worker!.onerror = async () => {
      disableEngine('Worker error');
      finish(await fallbackAnalysis(fen, depth, elo, 'Worker error'));
    };

    try {
      worker!.postMessage('ucinewgame');
      worker!.postMessage(`position fen ${fen}`);
      worker!.postMessage(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
      engineState = 'analyzing';
    } catch {
      disableEngine('Command error');
      // Use synchronous fallback since we're in a sync context
      fallbackAnalysis(fen, depth, elo, 'Command error').then(finish);
    }
  });
}

function getPartialResult(_fen: string): AnalysisResult | null {
  // Return null - simplified, no partial results
  return null;
}

/**
 * Get best move only (convenience function)
 */
export async function getBestMove(config: Omit<EngineConfig, 'purpose'>): Promise<string | null> {
  try {
    const result = await analyzeFen(config);
    return result.bestMove;
  } catch {
    return getBestMoveFallback(config);
  }
}
