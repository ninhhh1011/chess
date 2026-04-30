import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluateBoard(game) {
  const board = game.board();
  let score = 0;
  board.flat().forEach((piece) => {
    if (!piece) return;
    const value = PIECE_VALUES[piece.type] || 0;
    score += piece.color === 'w' ? value : -value;
  });
  if (game.isCheckmate()) score = game.turn() === 'w' ? -100000 : 100000;
  return score;
}

function displayEval(cp) {
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`;
}

function chooseBestMove(fen) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (!moves.length) return { bestMove: null, score: evaluateBoard(game), pv: [] };
  const isWhite = game.turn() === 'w';
  let best = null;
  let bestScore = isWhite ? -Infinity : Infinity;

  moves.forEach((move) => {
    const copy = new Chess(fen);
    copy.move(move.san);
    let score = evaluateBoard(copy);
    if (copy.isCheck()) score += isWhite ? 25 : -25;
    if (copy.isCheckmate()) score = isWhite ? 100000 : -100000;
    if ((isWhite && score > bestScore) || (!isWhite && score < bestScore)) {
      best = move;
      bestScore = score;
    }
  });

  return { 
    bestMove: best ? `${best.from}${best.to}${best.promotion || ''}` : null, 
    score: bestScore, 
    pv: best ? [`${best.from}${best.to}${best.promotion || ''}`] : [] 
  };
}

export async function analyzeFenFallback({ fen, depth = 10 } = {}) {
  if (!fen) throw new Error('Thiếu FEN để phân tích.');

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Fallback engine timeout.')), 3000);
    
    window.setTimeout(() => {
      try {
        const result = chooseBestMove(fen);
        window.clearTimeout(timeout);
        resolve({
          success: true,
          source: 'fallback',
          fen,
          depth,
          bestMove: result.bestMove,
          evaluation: { 
            type: 'cp', 
            value: result.score, 
            display: displayEval(result.score) 
          },
          pv: result.pv,
          raw: 'fallback-material-engine',
        });
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    }, 100);
  });
}

export async function getBestMoveFallback({ fen, depth = 10 } = {}) {
  const analysis = await analyzeFenFallback({ fen, depth });
  return analysis.bestMove;
}
