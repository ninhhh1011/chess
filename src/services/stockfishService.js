import Stockfish from 'stockfish';
import { analyzeFenFallback, getBestMoveFallback } from './fallbackChessEngine';

let engine = null;
let engineReady = false;
let currentAnalysis = null;
let messageQueue = [];

function parseEvaluation(line) {
  const cpMatch = line.match(/score cp (-?\d+)/);
  const mateMatch = line.match(/score mate (-?\d+)/);
  
  if (mateMatch) {
    const mateIn = parseInt(mateMatch[1]);
    return {
      type: 'mate',
      value: mateIn,
      display: `Mate in ${Math.abs(mateIn)}`
    };
  }
  
  if (cpMatch) {
    const cp = parseInt(cpMatch[1]);
    return {
      type: 'cp',
      value: cp,
      display: `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
    };
  }
  
  return null;
}

function parsePV(line) {
  const pvMatch = line.match(/pv (.+)/);
  if (pvMatch) {
    return pvMatch[1].split(' ').filter(m => m.length >= 4);
  }
  return [];
}

export async function initEngine() {
  if (engine && engineReady) return true;
  
  try {
    console.log('[Stockfish] Initializing engine...');
    engine = Stockfish();
    engineReady = false;
    messageQueue = [];
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('[Stockfish] Init timeout, using fallback');
        engine = null;
        engineReady = false;
        resolve(false);
      }, 5000);
      
      engine.onmessage = (event) => {
        const message = event.data || event;
        console.log('[Stockfish]', message);
        
        if (message === 'uciok') {
          engine.postMessage('isready');
        } else if (message === 'readyok') {
          engineReady = true;
          clearTimeout(timeout);
          console.log('[Stockfish] Engine ready!');
          resolve(true);
        }
      };
      
      engine.postMessage('uci');
    });
  } catch (error) {
    console.error('[Stockfish] Init error:', error);
    engine = null;
    engineReady = false;
    return false;
  }
}

export function isEngineReady() {
  return engineReady && engine !== null;
}

export function stopEngine() {
  if (engine && engineReady) {
    try {
      engine.postMessage('stop');
    } catch (error) {
      console.warn('[Stockfish] Stop error:', error);
    }
  }
  if (currentAnalysis) {
    currentAnalysis.stopped = true;
    currentAnalysis = null;
  }
}

export function disposeEngine() {
  stopEngine();
  if (engine) {
    try {
      engine.postMessage('quit');
      engine.terminate?.();
    } catch (error) {
      console.warn('[Stockfish] Dispose error:', error);
    }
    engine = null;
    engineReady = false;
  }
}

export async function configureEngineForElo({ elo, skillLevel }) {
  if (!isEngineReady()) return false;
  
  try {
    // Set Skill Level (0-20)
    if (skillLevel !== undefined) {
      engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
      console.log(`[Stockfish] Set Skill Level to ${skillLevel}`);
    }
    
    // Try to set UCI_Elo if supported
    if (elo) {
      engine.postMessage('setoption name UCI_LimitStrength value true');
      engine.postMessage(`setoption name UCI_Elo value ${elo}`);
      console.log(`[Stockfish] Set UCI_Elo to ${elo}`);
    }
    
    return true;
  } catch (error) {
    console.warn('[Stockfish] Configure error:', error);
    return false;
  }
}

export async function analyzeFen({ fen, depth = 10, movetime = null, elo = null, skillLevel = null } = {}) {
  if (!fen) {
    throw new Error('FEN is required');
  }
  
  // Try to init engine if not ready
  if (!isEngineReady()) {
    const initialized = await initEngine();
    if (!initialized) {
      console.warn('[Stockfish] Engine not available, using fallback');
      return await analyzeFenFallback({ fen, depth });
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
    
    const timeout = setTimeout(() => {
      stopEngine();
      console.warn('[Stockfish] Analysis timeout, using fallback');
      analyzeFenFallback({ fen, depth })
        .then(resolve)
        .catch(reject);
    }, 10000);
    
    currentAnalysis = { stopped: false };
    
    const messageHandler = (event) => {
      if (currentAnalysis?.stopped) return;
      
      const message = event.data || event;
      rawMessages.push(message);
      
      if (message.startsWith('info')) {
        const depthMatch = message.match(/depth (\d+)/);
        if (depthMatch) {
          lastDepth = parseInt(depthMatch[1]);
        }
        
        const evalResult = parseEvaluation(message);
        if (evalResult) {
          evaluation = evalResult;
        }
        
        const pvMoves = parsePV(message);
        if (pvMoves.length > 0) {
          pv = pvMoves;
        }
      } else if (message.startsWith('bestmove')) {
        const match = message.match(/bestmove (\S+)/);
        if (match) {
          bestMove = match[1];
        }
        
        clearTimeout(timeout);
        engine.onmessage = null;
        currentAnalysis = null;
        
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
    };
    
    engine.onmessage = messageHandler;
    
    try {
      engine.postMessage('ucinewgame');
      engine.postMessage(`position fen ${fen}`);
      
      if (movetime) {
        engine.postMessage(`go movetime ${movetime}`);
      } else {
        engine.postMessage(`go depth ${depth}`);
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('[Stockfish] Analysis error:', error);
      analyzeFenFallback({ fen, depth })
        .then(resolve)
        .catch(reject);
    }
  });
}

export async function getBestMove({ fen, depth = 8, movetime = null } = {}) {
  try {
    const analysis = await analyzeFen({ fen, depth, movetime });
    return analysis.bestMove;
  } catch (error) {
    console.error('[Stockfish] getBestMove error:', error);
    return await getBestMoveFallback({ fen, depth });
  }
}
