import { Chess } from 'chess.js';
import { moveToUci } from '../utils/chessMoveValidation';

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function scoreMove(game, move) {
  let score = 0;
  const movingPiece = game.get(move.from);

  if (move.captured) {
    const capturedValue = PIECE_VALUES[move.captured] || 0;
    const attackerValue = PIECE_VALUES[movingPiece?.type] || 0;
    score += capturedValue - attackerValue * 0.12;
  }

  if (move.flags?.includes('p')) {
    score += move.promotion === 'q' ? 850 : 500;
  }

  const nextGame = new Chess(game.fen());
  try {
    nextGame.move(move);
    if (nextGame.isCheckmate()) score += 100000;
    else if (nextGame.isCheck()) score += 60;
  } catch {
    return -999999;
  }

  const moveNumber = Number(game.fen().split(' ')[5]) || 1;
  const earlyGame = moveNumber <= 12;

  if (earlyGame && movingPiece) {
    const fromRank = move.from[1];

    if ((movingPiece.type === 'n' || movingPiece.type === 'b') && (fromRank === '1' || fromRank === '8')) {
      score += 35;
    }

    if (['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c5', 'f5'].includes(move.to)) {
      score += 20;
    }

    if (move.flags?.includes('k') || move.flags?.includes('q')) {
      score += 80;
    }
  }

  if (earlyGame && movingPiece?.type === 'q' && !move.captured) {
    score -= 25;
  }

  return score;
}

export function getSafeFallbackMove(fen, botElo = 1200) {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });

  if (!moves.length) return null;

  if (botElo <= 800) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return moveToUci(randomMove);
  }

  const scored = moves
    .map((move) => ({
      move,
      score: scoreMove(game, move),
    }))
    .sort((a, b) => b.score - a.score);

  const topN = botElo >= 1600 ? 2 : 3;
  const candidates = scored.slice(0, Math.min(topN, scored.length));
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  return moveToUci(chosen.move);
}
