/**
 * Stockfish Web Worker with Request Management
 * Handles Stockfish.js initialization, analysis requests, and fallback engine
 */

let stockfishWorker = null;
let engineReady = false;
let currentRequestId = null;
let requestTimeout = null;

const HARD_TIMEOUT_MS = 5000;

// Initialize Stockfish engine
function initStockfish() {
  try {
    // Load Stockfish.js from CDN or local
    importScripts('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js');

    if (typeof Stockfish === 'function') {
      stockfishWorker = Stockfish();

      stockfishWorker.onmessage = (line) => {
        handleStockfishOutput(line);
      };

      // Initialize UCI
      stockfishWorker.postMessage('uci');

      return true;
    }
    return false;
  } catch (error) {
    console.error('[Worker] Stockfish init error:', error);
    return false;
  }
}

// Stockfish output handler
let analysisData = {
  bestMove: null,
  evaluation: null,
  pv: [],
  depth: 0
};

function handleStockfishOutput(line) {
  if (!currentRequestId) return;

  if (line.startsWith('uciok')) {
    engineReady = true;
    postMessage({ type: 'ready', success: true });
  } else if (line.startsWith('info')) {
    // Parse depth
    const depthMatch = line.match(/depth (\d+)/);
    if (depthMatch) {
      analysisData.depth = parseInt(depthMatch[1]);
    }

    // Parse evaluation
    const cpMatch = line.match(/score cp (-?\d+)/);
    const mateMatch = line.match(/score mate (-?\d+)/);

    if (mateMatch) {
      const mateIn = parseInt(mateMatch[1]);
      analysisData.evaluation = {
        type: 'mate',
        value: mateIn
      };
    } else if (cpMatch) {
      const cp = parseInt(cpMatch[1]);
      analysisData.evaluation = {
        type: 'cp',
        value: cp
      };
    }

    // Parse PV
    const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);
    if (pvMatch) {
      analysisData.pv = pvMatch[1].split(' ').filter(m => m.length >= 4);
    }
  } else if (line.startsWith('bestmove')) {
    const match = line.match(/bestmove (\S+)/);
    if (match) {
      analysisData.bestMove = match[1];
    }

    clearTimeout(requestTimeout);

    postMessage({
      type: 'analysis_complete',
      requestId: currentRequestId,
      data: {
        bestMove: analysisData.bestMove,
        evaluation: analysisData.evaluation || { type: 'cp', value: 0 },
        pv: analysisData.pv,
        depth: analysisData.depth,
        source: 'stockfish'
      }
    });

    currentRequestId = null;
    analysisData = { bestMove: null, evaluation: null, pv: [], depth: 0 };
  }
}

// Deterministic Minimax with Alpha-Beta Pruning
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PIECE_SQUARE_TABLES = {
  p: [ // Pawn
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [ // Knight
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [ // Bishop
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [ // Rook
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [ // Queen
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [ // King
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
  ]
};

function getPieceSquareValue(piece, square, color) {
  const table = PIECE_SQUARE_TABLES[piece];
  if (!table) return 0;

  // Flip square for black pieces
  const index = color === 'w' ? square : 63 - square;
  return table[index];
}

function evaluatePosition(board, turn) {
  let score = 0;

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (!piece) continue;

    const value = PIECE_VALUES[piece.type] || 0;
    const posValue = getPieceSquareValue(piece.type, i, piece.color);
    const totalValue = value + posValue;

    score += piece.color === 'w' ? totalValue : -totalValue;
  }

  return score;
}

function minimax(game, depth, alpha, beta, maximizingPlayer) {
  if (depth === 0 || game.isGameOver()) {
    const board = game.board().flat();
    let score = evaluatePosition(board, game.turn());

    if (game.isCheckmate()) {
      score = maximizingPlayer ? -100000 : 100000;
    } else if (game.isCheck()) {
      score += maximizingPlayer ? -50 : 50;
    }

    return { score, move: null };
  }

  const moves = game.moves({ verbose: true });

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    let bestMove = null;

    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();

      if (evaluation.score > maxEval) {
        maxEval = evaluation.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, evaluation.score);
      if (beta <= alpha) break; // Beta cutoff
    }

    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    let bestMove = null;

    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();

      if (evaluation.score < minEval) {
        minEval = evaluation.score;
        bestMove = move;
      }

      beta = Math.min(beta, evaluation.score);
      if (beta <= alpha) break; // Alpha cutoff
    }

    return { score: minEval, move: bestMove };
  }
}

function fallbackAnalysis(fen) {
  // Import chess.js in worker context
  importScripts('https://cdn.jsdelivr.net/npm/chess.js@1.0.0-beta.8/dist/chess.js');

  const game = new Chess(fen);
  const isWhite = game.turn() === 'w';

  const result = minimax(game, 3, -Infinity, Infinity, isWhite);

  if (!result.move) {
    const moves = game.moves({ verbose: true });
    result.move = moves[0];
  }

  const bestMove = result.move ? `${result.move.from}${result.move.to}${result.move.promotion || ''}` : null;

  return {
    bestMove,
    evaluation: { type: 'cp', value: result.score },
    pv: bestMove ? [bestMove] : [],
    depth: 3,
    source: 'fallback_minimax'
  };
}

// Message handler
self.onmessage = function(e) {
  const { type, requestId, fen, depth, movetime, skillLevel, elo } = e.data;

  if (type === 'init') {
    const success = initStockfish();
    if (!success) {
      postMessage({ type: 'ready', success: false, error: 'Failed to load Stockfish' });
    }
    return;
  }

  if (type === 'analyze') {
    // Cancel previous request
    if (currentRequestId) {
      clearTimeout(requestTimeout);
      stockfishWorker?.postMessage('stop');
    }

    currentRequestId = requestId;
    analysisData = { bestMove: null, evaluation: null, pv: [], depth: 0 };

    // Set hard timeout for fallback
    requestTimeout = setTimeout(() => {
      if (currentRequestId === requestId) {
        console.warn('[Worker] Hard timeout, using fallback');
        stockfishWorker?.postMessage('stop');

        try {
          const fallbackResult = fallbackAnalysis(fen);
          postMessage({
            type: 'analysis_complete',
            requestId,
            data: fallbackResult
          });
        } catch (error) {
          postMessage({
            type: 'analysis_error',
            requestId,
            error: error.message
          });
        }

        currentRequestId = null;
      }
    }, HARD_TIMEOUT_MS);

    if (!engineReady || !stockfishWorker) {
      clearTimeout(requestTimeout);
      try {
        const fallbackResult = fallbackAnalysis(fen);
        postMessage({
          type: 'analysis_complete',
          requestId,
          data: fallbackResult
        });
      } catch (error) {
        postMessage({
          type: 'analysis_error',
          requestId,
          error: error.message
        });
      }
      currentRequestId = null;
      return;
    }

    // Configure engine
    if (skillLevel !== undefined) {
      stockfishWorker.postMessage(`setoption name Skill Level value ${skillLevel}`);
    }

    if (elo) {
      stockfishWorker.postMessage('setoption name UCI_LimitStrength value true');
      stockfishWorker.postMessage(`setoption name UCI_Elo value ${elo}`);
    }

    // Start analysis
    stockfishWorker.postMessage('ucinewgame');
    stockfishWorker.postMessage(`position fen ${fen}`);

    if (movetime) {
      stockfishWorker.postMessage(`go movetime ${movetime}`);
    } else {
      stockfishWorker.postMessage(`go depth ${depth || 10}`);
    }
  }

  if (type === 'stop') {
    clearTimeout(requestTimeout);
    stockfishWorker?.postMessage('stop');
    currentRequestId = null;
  }
};
