import { analyzeFenFallback, getBestMoveFallback } from './fallbackChessEngine';
import { isLegalUciMove } from '../utils/chessMoveValidation';

const STOCKFISH_DEBUG = false;
const STOCKFISH_WORKER_VERSION = '2026-05-30-silent-fallback';
const ENGINE_CRASH_BASE_COOLDOWN_MS = 60000;
const ENGINE_CRASH_MAX_COOLDOWN_MS = 300000;
const ENGINE_WARNING_THROTTLE_MS = 5000;

let worker = null;
let engineReady = false;
let engineState = 'idle'; // idle, loading, ready, analyzing, error
let engineInitPromise = null;
let currentAnalysis = null;
let analysisQueue = Promise.resolve();
let analysisSeq = 0;
let activeFen = null;
let engineDisabledUntil = 0;
let lastEngineWarningAt = 0;
let engineFailureCount = 0;
let hasLoggedWorkerUnavailable = false;

function isStockfishDebugEnabled() {
  if (STOCKFISH_DEBUG) return true;
  if (typeof window === 'undefined' || !import.meta.env.DEV) return false;

  try {
    return window.localStorage?.getItem('debugStockfish') === '1';
  } catch {
    return false;
  }
}

function debugStockfish(...args) {
  if (isStockfishDebugEnabled()) {
    console.log(...args);
  }
}

function serializeEngineError(error) {
  if (!error) return 'Unknown engine error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error?.message) return error.error.message;
  if (error.type) return error.type;
  return String(error);
}

function warnStockfish(message, data = null) {
  if (!isStockfishDebugEnabled()) return;

  const now = Date.now();
  if (now - lastEngineWarningAt > ENGINE_WARNING_THROTTLE_MS) {
    if (data) console.warn(message, data);
    else console.warn(message);
    lastEngineWarningAt = now;
  }
}

function disableEngineForCooldown(error) {
  engineFailureCount += 1;
  const cooldownMs = Math.min(
    ENGINE_CRASH_BASE_COOLDOWN_MS * (2 ** Math.max(engineFailureCount - 1, 0)),
    ENGINE_CRASH_MAX_COOLDOWN_MS
  );

  engineDisabledUntil = Date.now() + cooldownMs;
  engineState = 'error';
  engineReady = false;

  if (worker) {
    try {
      worker.terminate();
    } catch {
      // Worker is already unusable.
    }
  }

  worker = null;

  if (!hasLoggedWorkerUnavailable || isStockfishDebugEnabled()) {
    warnStockfish('[Stockfish] Worker unavailable; using fallback temporarily', {
      error: serializeEngineError(error),
      cooldownMs,
    });
    hasLoggedWorkerUnavailable = true;
  }
}

function noLegalMovesResult(fen, warning = 'No legal moves') {
  return {
    success: false,
    source: 'none',
    fen,
    bestMove: null,
    evaluation: null,
    depth: 0,
    pv: [],
    raw: [],
    warning,
  };
}

async function getStableFallbackAnalysis({ fen, depth = 10, elo = 1200 } = {}, warning = 'Stockfish unavailable, using fallback') {
  try {
    const fallback = await analyzeFenFallback({ fen, depth, elo });
    if (!fallback?.bestMove) {
      return noLegalMovesResult(fen, fallback?.warning || 'No legal moves');
    }

    return {
      ...fallback,
      success: true,
      evaluation: fallback.evaluation || null,
      depth: fallback.depth || 0,
      warning: fallback.warning || warning,
    };
  } catch (error) {
    console.warn('[Stockfish] Fallback analysis failed:', error);
    return noLegalMovesResult(fen, 'No legal moves');
  }
}

export function getEngineState() {
  return engineState;
}

export function getStatus() {
  if (engineState === 'error') return 'crashed';
  if (engineState === 'analyzing') return 'busy';
  return engineState;
}

export async function initEngine() {
  if (Date.now() < engineDisabledUntil) {
    engineState = 'error';
    engineReady = false;
    return false;
  }

  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    engineState = 'error';
    engineReady = false;
    return false;
  }

  if (engineReady && worker) {
    debugStockfish('[Stockfish] Engine already ready');
    return true;
  }

  if (engineState === 'loading') {
    debugStockfish('[Stockfish] Engine loading, please wait...');
    return engineInitPromise || false;
  }

  engineState = 'loading';

  try {
    debugStockfish('[Stockfish] Initializing engine...');
    debugStockfish('[Stockfish] window.crossOriginIsolated:', window.crossOriginIsolated);

    if (worker) {
      worker.terminate();
      worker = null;
    }

    worker = new Worker(`/stockfish-worker.js?v=${STOCKFISH_WORKER_VERSION}`);

    const initPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        disableEngineForCooldown(new Error('Stockfish init timeout'));
        resolve(false);
      }, 10000);

      worker.onmessage = (event) => {
        const message = event.data;
        debugStockfish('[Stockfish] Worker message:', message);

        if (message.type !== 'ready') return;

        clearTimeout(timeout);
        if (message.success) {
          engineReady = true;
          engineState = 'ready';
          engineFailureCount = 0;
          hasLoggedWorkerUnavailable = false;
          debugStockfish('[Stockfish] Engine ready!');
          resolve(true);
        } else {
          disableEngineForCooldown(message.error || 'Stockfish init failed');
          resolve(false);
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        disableEngineForCooldown(error);
        resolve(false);
      };

      worker.postMessage('init');
    });

    engineInitPromise = initPromise.finally(() => {
      engineInitPromise = null;
    });

    return engineInitPromise;
  } catch (error) {
    disableEngineForCooldown(error);
    engineInitPromise = null;
    return false;
  }
}

export function isEngineReady() {
  return engineReady && worker !== null;
}

function stopCurrentWorkerSearch() {
  if (!worker || !engineReady) return;

  try {
    worker.postMessage('stop');
    debugStockfish('[Stockfish] Stop command sent');
  } catch (error) {
    console.warn('[Stockfish] Stop error:', error);
  }
}

export function stopEngine() {
  if (currentAnalysis) {
    currentAnalysis.stopped = true;
    currentAnalysis.cleanup?.();
    const reject = currentAnalysis.reject;
    currentAnalysis = null;
    reject?.(new Error('CANCELLED'));
  }

  stopCurrentWorkerSearch();

  if (worker) {
    worker.onmessage = null;
  }
}

export function disposeEngine() {
  stopEngine();
  if (worker) {
    try {
      worker.terminate();
      debugStockfish('[Stockfish] Engine terminated');
    } catch (error) {
      console.warn('[Stockfish] Dispose error:', error);
    }
  }

  worker = null;
  engineReady = false;
  engineState = 'idle';
}

export function cancelPendingAnalysis() {
  stopEngine();
  if (engineState !== 'idle') {
    engineState = isEngineReady() ? 'ready' : engineState;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    disposeEngine();
  });
  window.addEventListener('pagehide', () => {
    disposeEngine();
  });
}

export async function configureEngineForElo({ elo, skillLevel }) {
  if (!isEngineReady()) return false;

  try {
    if (skillLevel !== undefined) {
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      debugStockfish(`[Stockfish] Set Skill Level to ${skillLevel}`);
    }

    if (elo) {
      worker.postMessage('setoption name UCI_LimitStrength value true');
      worker.postMessage(`setoption name UCI_Elo value ${elo}`);
      debugStockfish(`[Stockfish] Set UCI_Elo to ${elo}`);
    }

    return true;
  } catch (error) {
    console.warn('[Stockfish] Configure error:', error);
    return false;
  }
}

function defaultEvaluation() {
  return { type: 'cp', value: 0, display: '0.00' };
}

function isEmptyBestMove(move) {
  return !move || move === '(none)' || move === '0000';
}

async function runAnalyzeFen({
  fen,
  depth = 10,
  movetime = null,
  elo = 1200,
  skillLevel = null,
  purpose = 'analysis',
} = {}) {
  if (!fen) {
    throw new Error('FEN is required');
  }

  if (!isEngineReady()) {
    const initialized = await initEngine();
    if (!initialized) {
      return getStableFallbackAnalysis({ fen, depth, elo });
    }
  }

  if (elo || skillLevel !== null) {
    await configureEngineForElo({ elo, skillLevel });
  }

  return new Promise((resolve, reject) => {
    const requestId = ++analysisSeq;
    let settled = false;
    let bestMove = null;
    let evaluation = null;
    let pv = [];
    let lastDepth = 0;
    const rawMessages = [];

    let timeoutMs = 6000;
    if (depth <= 12) timeoutMs = 1500;
    else if (depth <= 18) timeoutMs = 3000;

    function isCurrentRequest() {
      return currentAnalysis?.requestId === requestId && !currentAnalysis.stopped;
    }

    function cleanup() {
      clearTimeout(timeout);
      if (worker) {
        worker.onmessage = null;
      }
    }

    function finish(result) {
      if (settled || !isCurrentRequest()) return;
      settled = true;
      cleanup();
      currentAnalysis = null;
      engineState = isEngineReady() ? 'ready' : engineState;
      resolve(result);
    }

    function fail(error) {
      if (settled || !isCurrentRequest()) return;
      settled = true;
      cleanup();
      currentAnalysis = null;
      engineState = isEngineReady() ? 'ready' : engineState;
      reject(error);
    }

    function fallback(warning) {
      if (settled || !isCurrentRequest()) return;
      getStableFallbackAnalysis({ fen, depth, elo }, warning)
        .then(finish)
        .catch(fail);
    }

    const timeout = setTimeout(() => {
      if (!isCurrentRequest()) return;

      stopCurrentWorkerSearch();
      const partialBestMove = pv[0] || null;

      if (partialBestMove && isLegalUciMove(fen, partialBestMove)) {
        warnStockfish('[Stockfish] Analysis timeout, returning legal partial result', {
          fen,
          bestMove: partialBestMove,
          purpose,
        });
        finish({
          success: true,
          source: 'stockfish_wasm_partial',
          fen,
          depth: lastDepth || depth,
          bestMove: partialBestMove,
          evaluation: evaluation || defaultEvaluation(),
          pv,
          raw: rawMessages,
        });
        return;
      }

      warnStockfish('[Stockfish] Analysis timeout with invalid/stale PV, using fallback', {
        fen,
        pv0: partialBestMove,
        turn: fen.split(' ')[1],
        purpose,
      });
      fallback('Stockfish timeout, using fallback');
    }, timeoutMs);

    currentAnalysis = {
      requestId,
      stopped: false,
      reject,
      cleanup,
      fen,
      depth,
      elo,
      purpose,
    };

    const messageHandler = (event) => {
      if (!isCurrentRequest()) return;

      const message = event.data;

      if (message.type === 'error') {
        disableEngineForCooldown(message.message || message.error || 'Stockfish worker error');
        fallback('Stockfish unavailable, using fallback');
        return;
      }

      if (message.type !== 'output') return;

      const line = message.data;
      rawMessages.push(line);
      debugStockfish('[Stockfish]', line);

      if (line.startsWith('info')) {
        const depthMatch = line.match(/depth (\d+)/);
        if (depthMatch) {
          lastDepth = parseInt(depthMatch[1], 10);
        }

        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);

        if (mateMatch) {
          const mateIn = parseInt(mateMatch[1], 10);
          evaluation = {
            type: 'mate',
            value: mateIn,
            display: `Mate in ${Math.abs(mateIn)}`,
          };
        } else if (cpMatch) {
          const cp = parseInt(cpMatch[1], 10);
          evaluation = {
            type: 'cp',
            value: cp,
            display: `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`,
          };
        }

        const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);
        if (pvMatch) {
          pv = pvMatch[1].split(' ').filter((move) => move.length >= 4);
        }
        return;
      }

      if (line.startsWith('bestmove')) {
        const match = line.match(/bestmove (\S+)/);
        if (match) {
          bestMove = match[1];
        }

        const candidateBestMove = isEmptyBestMove(bestMove) ? (pv[0] || null) : bestMove;

        if (candidateBestMove && isLegalUciMove(fen, candidateBestMove)) {
          finish({
            success: true,
            source: 'stockfish_wasm',
            fen,
            depth: lastDepth || depth,
            bestMove: candidateBestMove,
            evaluation: evaluation || defaultEvaluation(),
            pv,
            raw: rawMessages,
          });
          return;
        }

        warnStockfish('[Stockfish] bestmove invalid/stale, using fallback', {
          fen,
          candidateBestMove,
          turn: fen.split(' ')[1],
          purpose,
        });
        fallback('Stockfish returned invalid move, using fallback');
      }
    };

    worker.onmessage = messageHandler;
    worker.onerror = (error) => {
      if (!isCurrentRequest()) return;
      disableEngineForCooldown(error);
      fallback('Stockfish unavailable, using fallback');
    };

    try {
      worker.postMessage('ucinewgame');
      worker.postMessage(`position fen ${fen}`);

      if (movetime) {
        worker.postMessage(`go movetime ${movetime}`);
      } else {
        worker.postMessage(`go depth ${depth}`);
      }

      engineState = 'analyzing';
    } catch (error) {
      disableEngineForCooldown(error);
      fallback('Stockfish unavailable, using fallback');
    }
  });
}

export async function analyzeFen(options = {}) {
  activeFen = options.fen;

  const queuedAnalysis = analysisQueue
    .catch(() => null)
    .then(() => runAnalyzeFen(options));

  analysisQueue = queuedAnalysis.catch(() => null);

  try {
    return await queuedAnalysis;
  } catch (error) {
    if (error?.message === 'CANCELLED') {
      throw error;
    }

    console.warn('[Stockfish] Analysis failed, using fallback:', error);
    return getStableFallbackAnalysis(options);
  }
}

export async function getBestMove({ fen, depth = 8, movetime = null, elo = null, skillLevel = null } = {}) {
  try {
    const analysis = await analyzeFen({ fen, depth, movetime, elo, skillLevel });
    return analysis.bestMove;
  } catch (error) {
    console.error('[Stockfish] getBestMove error:', error);
    return getBestMoveFallback({ fen, depth, elo });
  }
}
