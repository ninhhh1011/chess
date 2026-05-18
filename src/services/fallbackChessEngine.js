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

function getRandomLegalMove(fen) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * moves.length);
  const move = moves[randomIndex];
  return `${move.from}${move.to}${move.promotion || ''}`;
}

function chooseBestMove(fen, elo = 1200) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (!moves.length) return { bestMove: null, score: evaluateBoard(game), pv: [] };
  
  // ELO 400: random move
  if (elo <= 400) {
    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];
    return { 
      bestMove: `${move.from}${move.to}${move.promotion || ''}`, 
      score: 0, 
      pv: [] 
    };
  }
  
  // ELO 800: ưu tiên ăn quân
  if (elo <= 800) {
    const captureMoves = moves.filter(m => m.captured);
    if (captureMoves.length > 0) {
      const move = captureMoves[Math.floor(Math.random() * captureMoves.length)];
      return { 
        bestMove: `${move.from}${move.to}${move.promotion || ''}`, 
        score: PIECE_VALUES[move.captured] || 0, 
        pv: [] 
      };
    }
  }
  
  // ELO 1200+: đánh giá 1-ply
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

export async function analyzeFenFallback({ fen, depth = 10, elo = 1200 } = {}) {
  if (!fen) throw new Error('Thiếu FEN để phân tích.');

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Fallback engine timeout.')), 3000);
    
    window.setTimeout(() => {
      try {
        const result = chooseBestMove(fen, elo);
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

export async function getBestMoveFallback({ fen, depth = 10, elo = 1200 } = {}) {
  const analysis = await analyzeFenFallback({ fen, depth, elo });
  return analysis.bestMove;
}
