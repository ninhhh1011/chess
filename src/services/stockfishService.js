import { analyzeFenFallback, getBestMoveFallback } from './fallbackChessEngine';

const STOCKFISH_DEBUG = false;

let worker = null;
let engineReady = false;
let engineState = 'idle'; // idle, loading, ready, analyzing, error
let engineInitPromise = null;
let currentAnalysis = null;
let analysisQueue = Promise.resolve();

function debugStockfish(...args) {
  if (STOCKFISH_DEBUG) {
    console.log(...args);
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
      source: fallback.source || 'fallback',
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

    // Tạo bridge worker từ public folder
    worker = new Worker('/stockfish-worker.js');
    
    const initPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[Stockfish] Init timeout');
        engineState = 'error';
        engineReady = false;
        worker?.terminate();
        worker = null;
        resolve(false);
      }, 10000);
      
      worker.onmessage = (event) => {
        const message = event.data;
        debugStockfish('[Stockfish] Worker message:', message);
        
        if (message.type === 'ready') {
          clearTimeout(timeout);
          if (message.success) {
            engineReady = true;
            engineState = 'ready';
            debugStockfish('[Stockfish] Engine ready!');
            resolve(true);
          } else {
            engineState = 'error';
            engineReady = false;
            console.error('[Stockfish] Init failed:', message.error);
            worker?.terminate();
            worker = null;
            resolve(false);
          }
        }
      };
      
      worker.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[Stockfish] Worker error:', error);
        engineState = 'error';
        engineReady = false;
        worker?.terminate();
        worker = null;
        resolve(false);
      };
      
      // Gửi init command
      worker.postMessage('init');
    });

    engineInitPromise = initPromise.finally(() => {
      engineInitPromise = null;
    });

    return engineInitPromise;
  } catch (error) {
    console.error('[Stockfish] Init error:', error);
    engineState = 'error';
    engineReady = false;
    engineInitPromise = null;
    worker?.terminate();
    worker = null;
    return false;
  }
}

export function isEngineReady() {
  return engineReady && worker !== null;
}

export function stopEngine() {
  if (currentAnalysis) {
    currentAnalysis.stopped = true;
    currentAnalysis = null;
  }
  if (worker && engineReady) {
    try {
      worker.postMessage('stop');
      // Clear message handler to prevent stale messages
      worker.onmessage = null;
      debugStockfish('[Stockfish] Stop command sent');
    } catch (error) {
      console.warn('[Stockfish] Stop error:', error);
    }
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
    worker = null;
    engineReady = false;
    engineState = 'idle';
  }
}

export function cancelPendingAnalysis() {
  if (currentAnalysis) {
    const analysisToCancel = currentAnalysis;
    stopEngine();
    if (analysisToCancel.reject) {
      analysisToCancel.reject(new Error('CANCELLED'));
    }
    currentAnalysis = null;
    engineState = 'ready';
  }
}

// Cleanup on page unload
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

async function runAnalyzeFen({ fen, depth = 10, movetime = null, elo = null, skillLevel = null } = {}) {
  if (!fen) {
    throw new Error('FEN is required');
  }
  
  // Try to init engine if not ready
  if (!isEngineReady()) {
    const initialized = await initEngine();
    if (!initialized) {
      console.warn('[Stockfish] Engine not available, using fallback');
      return await getStableFallbackAnalysis({ fen, depth, elo });
    }
  }
  
  // Configure engine for ELO/skill level
  if (elo || skillLevel !== null) {
    await configureEngineForElo({ elo, skillLevel });
  }
  
  return new Promise((resolve, reject) => {
    let bestMove = null;
    let evaluation = null;
    let pv = [];
    let lastDepth = 0;
    const rawMessages = [];
    
    engineState = 'analyzing';
    
    let timeoutMs = 6000;
    if (depth <= 12) timeoutMs = 1500;
    else if (depth <= 18) timeoutMs = 3000;
    
    const timeout = setTimeout(() => {
      stopEngine();
      engineState = 'ready';
      
      if (pv.length > 0) {
        console.warn('[Stockfish] Analysis timeout, returning partial result');
        resolve({
            success: true,
            source: 'stockfish_wasm_partial',
            fen,
            depth: lastDepth || depth,
            bestMove: pv[0],
            evaluation: evaluation || { type: 'cp', value: 0, display: '0.00' },
            pv,
            raw: rawMessages
        });
      } else {
        console.warn('[Stockfish] Analysis timeout, using fallback');
        getStableFallbackAnalysis(
          { fen, depth, elo },
          'Stockfish timeout, using fallback'
        ).then(resolve).catch(reject);
      }
    }, timeoutMs);
    
    currentAnalysis = { stopped: false, reject };
    
    const messageHandler = (event) => {
      if (currentAnalysis?.stopped) return;
      
      const message = event.data;
      
      if (message.type === 'output') {
        const line = message.data;
        rawMessages.push(line);
        debugStockfish('[Stockfish]', line);
        
        if (line.startsWith('info')) {
          const depthMatch = line.match(/depth (\d+)/);
          if (depthMatch) {
            lastDepth = parseInt(depthMatch[1]);
          }
          
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          
          if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            evaluation = {
              type: 'mate',
              value: mateIn,
              display: `Mate in ${Math.abs(mateIn)}`
            };
          } else if (cpMatch) {
            const cp = parseInt(cpMatch[1]);
            evaluation = {
              type: 'cp',
              value: cp,
              display: `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
            };
          }
          
          const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);
          if (pvMatch) {
            pv = pvMatch[1].split(' ').filter(m => m.length >= 4);
          }
        } else if (line.startsWith('bestmove')) {
          const match = line.match(/bestmove (\S+)/);
          if (match) {
            bestMove = match[1];
          }
          
          clearTimeout(timeout);
          worker.onmessage = null;
          currentAnalysis = null;
          engineState = 'ready';
          
          resolve({
            success: true,
            source: 'stockfish_wasm',
            fen,
            depth: lastDepth || depth,
            bestMove: bestMove || (pv.length > 0 ? pv[0] : null),
            evaluation: evaluation || { type: 'cp', value: 0, display: '0.00' },
            pv,
            raw: rawMessages
          });
        }
      }
    };
    
    worker.onmessage = messageHandler;
    
    try {
      worker.postMessage('ucinewgame');
      worker.postMessage(`position fen ${fen}`);
      
      if (movetime) {
        worker.postMessage(`go movetime ${movetime}`);
      } else {
        worker.postMessage(`go depth ${depth}`);
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('[Stockfish] Analysis error:', error);
      engineState = 'error';
      getStableFallbackAnalysis(
        { fen, depth, elo },
        'Stockfish unavailable, using fallback'
      )
        .then(resolve)
        .catch(reject);
    }
  });
}

let activeFen = null;

export async function analyzeFen(options = {}) {
  try {
    if (currentAnalysis) {
      cancelPendingAnalysis();
    }
    activeFen = options.fen;
    return await runAnalyzeFen(options);
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
    return await getBestMoveFallback({ fen, depth });
  }
}
