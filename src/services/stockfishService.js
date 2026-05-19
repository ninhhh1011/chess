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

export function getEngineState() {
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
      return await analyzeFenFallback({ fen, depth, elo });
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
    
    const timeout = setTimeout(() => {
      stopEngine();
      console.warn('[Stockfish] Analysis timeout, using fallback');
      engineState = 'ready';
      analyzeFenFallback({ fen, depth, elo })
        .then(resolve)
        .catch(reject);
    }, 10000);
    
    currentAnalysis = { stopped: false };
    
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
            bestMove,
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
      engineState = 'ready';
      analyzeFenFallback({ fen, depth, elo })
        .then(resolve)
        .catch(reject);
    }
  });
}

export async function analyzeFen(options = {}) {
  const queuedAnalysis = analysisQueue
    .catch(() => {})
    .then(() => runAnalyzeFen(options));

  analysisQueue = queuedAnalysis.catch(() => {});
  return queuedAnalysis;
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
