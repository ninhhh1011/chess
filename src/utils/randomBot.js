export const BOT_LEVELS = [
  { elo: 400, label: 'ELO 400 - Mới học', blunderChance: 0.85, topMovePool: 8, depth: 1 },
  { elo: 800, label: 'ELO 800 - Dễ', blunderChance: 0.6, topMovePool: 6, depth: 1 },
  { elo: 1200, label: 'ELO 1200 - Trung bình', blunderChance: 0.35, topMovePool: 4, depth: 2 },
  { elo: 1600, label: 'ELO 1600 - Khá', blunderChance: 0.18, topMovePool: 3, depth: 2 },
  { elo: 2000, label: 'ELO 2000 - Mạnh', blunderChance: 0.05, topMovePool: 2, depth: 3 },
];

const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables for positional evaluation
const pawnTable = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const knightTable = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const bishopTable = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const kingMiddleGameTable = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

export function getBotLevelByElo(elo) {
  return BOT_LEVELS.find((level) => level.elo === Number(elo)) ?? BOT_LEVELS[0];
}

function getPieceSquareValue(piece, square, isEndgame = false) {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, ...
  const rank = parseInt(square[1]) - 1;   // 1=0, 2=1, ...
  
  let index;
  if (piece.color === 'w') {
    index = (7 - rank) * 8 + file;
  } else {
    index = rank * 8 + file;
  }

  switch (piece.type) {
    case 'p':
      return pawnTable[index];
    case 'n':
      return knightTable[index];
    case 'b':
      return bishopTable[index];
    case 'k':
      return kingMiddleGameTable[index];
    default:
      return 0;
  }
}

function evaluatePosition(game) {
  let score = 0;
  const board = game.board();
  const moveCount = game.history().length;
  const isEndgame = moveCount > 40;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (!piece) continue;

      const square = String.fromCharCode(97 + j) + (8 - i);
      const pieceValue = pieceValues[piece.type] || 0;
      const positionValue = getPieceSquareValue(piece, square, isEndgame);
      const totalValue = pieceValue + positionValue;

      if (piece.color === game.turn()) {
        score += totalValue;
      } else {
        score -= totalValue;
      }
    }
  }

  return score;
}

function minimax(game, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(game);
  }

  const moves = game.moves({ verbose: true });

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      game.move(move);
      const score = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      game.move(move);
      const score = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

function scoreMove(game, move, depth) {
  let score = 0;

  // Immediate capture value
  if (move.captured) {
    score += (pieceValues[move.captured] ?? 0) * 10;
  }

  // Promotion value
  if (move.promotion) {
    score += (pieceValues[move.promotion] ?? 0) * 5;
  }

  // Checkmate is best
  if (move.san.includes('#')) {
    return 1000000;
  }

  // Check is good
  if (move.san.includes('+')) {
    score += 50;
  }

  // Evaluate position after move
  if (depth > 0) {
    game.move(move);
    const positionScore = minimax(game, depth, -Infinity, Infinity, false);
    game.undo();
    score += positionScore;
  }

  // Add small random factor
  score += Math.random() * 10;

  return score;
}

export function getRandomBotMove(game, elo = 400) {
  const legalMoves = game.moves({ verbose: true });

  if (legalMoves.length === 0) {
    return null;
  }

  const level = getBotLevelByElo(elo);
  const shouldBlunder = Math.random() < level.blunderChance;

  if (shouldBlunder) {
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }

  // Score all moves with minimax
  const scoredMoves = legalMoves.map(move => ({
    move,
    score: scoreMove(game, move, level.depth)
  }));

  // Sort by score descending
  scoredMoves.sort((a, b) => b.score - a.score);

  // Pick from top candidates
  const candidatePool = scoredMoves.slice(0, Math.min(level.topMovePool, scoredMoves.length));
  const selectedIndex = Math.floor(Math.random() * candidatePool.length);
  
  return candidatePool[selectedIndex].move;
}
