// Bridge worker for Stockfish.js.
// Stockfish.js needs to run as its own worker so it can resolve its wasm and
// pthread worker URLs from /stockfish/stockfish.js instead of this wrapper.

const STOCKFISH_SCRIPT_URL = '/stockfish/stockfish.js';
const STOCKFISH_WASM_URL = '/stockfish/stockfish.wasm';
const STOCKFISH_WORKER_URL = `${STOCKFISH_SCRIPT_URL}#${encodeURIComponent(STOCKFISH_WASM_URL)}`;
const STOCKFISH_WORKER_DEBUG = false;

let stockfish = null;
let isReady = false;
let initPromise = null;
let initResolve = null;
let initReject = null;
let initTimer = null;
let sawUciOk = false;

function normalizeEngineMessage(event) {
  return typeof event.data === 'string' ? event.data : event.data?.data ?? event.data;
}

function debugWorker(...args) {
  if (STOCKFISH_WORKER_DEBUG) {
    console.log(...args);
  }
}

function resetInitState() {
  initPromise = null;
  initResolve = null;
  initReject = null;
  initTimer = null;
  sawUciOk = false;
}

function disposeStockfish() {
  if (initTimer) {
    clearTimeout(initTimer);
  }

  if (stockfish) {
    stockfish.terminate();
  }

  stockfish = null;
  isReady = false;
  resetInitState();
}

function finishInit() {
  if (initTimer) {
    clearTimeout(initTimer);
  }

  isReady = true;
  initResolve?.();
  resetInitState();
}

function failInit(error) {
  const initError = error instanceof Error ? error : new Error(String(error));
  const reject = initReject;
  disposeStockfish();
  reject?.(initError);
}

async function initStockfish() {
  if (isReady && stockfish) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    initResolve = resolve;
    initReject = reject;

    debugWorker('[Worker] Starting Stockfish worker:', STOCKFISH_WORKER_URL);
    debugWorker('[Worker] crossOriginIsolated:', self.crossOriginIsolated);

    stockfish = new Worker(STOCKFISH_WORKER_URL);

    stockfish.onmessage = (event) => {
      const line = normalizeEngineMessage(event);

      if (typeof line === 'string') {
        self.postMessage({ type: 'output', data: line });

        if (!isReady) {
          if (line === 'uciok') {
            sawUciOk = true;
            stockfish.postMessage('isready');
          } else if (sawUciOk && line === 'readyok') {
            finishInit();
          }
        }
      } else {
        self.postMessage({ type: 'output', data: line });
      }
    };

    stockfish.onerror = (error) => {
      console.warn('[Worker] Stockfish worker error:', error?.message || error?.type || 'error');
      if (!isReady) {
        failInit(error.message || 'Stockfish worker failed to load');
      } else {
        self.postMessage({ type: 'error', message: error.message || 'Stockfish worker error' });
      }
    };

    initTimer = setTimeout(() => {
      failInit(new Error('Stockfish init timeout'));
    }, 10000);

    stockfish.postMessage('uci');
  });

  return initPromise;
}

self.onmessage = async (event) => {
  const message = event.data;

  if (message === 'init') {
    try {
      await initStockfish();
      self.postMessage({ type: 'ready', success: true });
    } catch (error) {
      console.warn('[Worker] Failed to init Stockfish:', error?.message || error);
      self.postMessage({ type: 'ready', success: false, error: error.message });
    }
    return;
  }

  if (message === 'dispose') {
    disposeStockfish();
    return;
  }

  if (!stockfish) {
    self.postMessage({ type: 'error', message: 'Stockfish not initialized' });
    return;
  }

  if (typeof message === 'string') {
    stockfish.postMessage(message);
  }
};
