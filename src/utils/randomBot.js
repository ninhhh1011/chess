export const BOT_LEVELS = [
  { elo: 400, label: 'ELO 400 - Mới học', blunderChance: 0.85, topMovePool: 8 },
  { elo: 800, label: 'ELO 800 - Dễ', blunderChance: 0.6, topMovePool: 6 },
  { elo: 1200, label: 'ELO 1200 - Trung bình', blunderChance: 0.35, topMovePool: 4 },
  { elo: 1600, label: 'ELO 1600 - Khá', blunderChance: 0.18, topMovePool: 3 },
  { elo: 2000, label: 'ELO 2000 - Mạnh', blunderChance: 0.05, topMovePool: 2 },
];

const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

export function getBotLevelByElo(elo) {
  return BOT_LEVELS.find((level) => level.elo === Number(elo)) ?? BOT_LEVELS[0];
}

function scoreMove(move) {
  let score = 0;

  if (move.captured) {
    score += pieceValues[move.captured] ?? 0;
  }
  if (move.promotion) {
    score += pieceValues[move.promotion] ?? 0;
  }
  if (move.san.includes('#')) {
    score += 10000;
  } else if (move.san.includes('+')) {
    score += 80;
  }
  if (move.flags.includes('c') || move.flags.includes('e')) {
    score += 20;
  }

  return score + Math.random() * 12;
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

  const rankedMoves = [...legalMoves].sort((a, b) => scoreMove(b) - scoreMove(a));
  const candidatePool = rankedMoves.slice(0, Math.min(level.topMovePool, rankedMoves.length));
  const selectedIndex = Math.floor(Math.random() * candidatePool.length);
  return candidatePool[selectedIndex];
}
