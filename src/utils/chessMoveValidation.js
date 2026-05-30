import { Chess } from 'chess.js';

export function parseUciMove(uci) {
  if (!uci || typeof uci !== 'string' || uci.length < 4) return null;

  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

export function isLegalUciMove(fen, uci) {
  const parsed = parseUciMove(uci);
  if (!fen || !parsed) return false;

  try {
    const game = new Chess(fen);
    const legalMoves = game.moves({ verbose: true });

    return legalMoves.some((move) => {
      const sameFromTo = move.from === parsed.from && move.to === parsed.to;
      if (!sameFromTo) return false;

      if (move.promotion) {
        return move.promotion === parsed.promotion;
      }

      return true;
    });
  } catch {
    return false;
  }
}

export function getLegalMoveFromUci(fenOrGame, uci) {
  const parsed = parseUciMove(uci);
  if (!parsed) return null;

  try {
    const game =
      typeof fenOrGame === 'string'
        ? new Chess(fenOrGame)
        : fenOrGame;

    const legalMoves = game.moves({ verbose: true });

    return (
      legalMoves.find((move) => {
        const sameFromTo = move.from === parsed.from && move.to === parsed.to;
        if (!sameFromTo) return false;

        if (move.promotion) {
          return move.promotion === parsed.promotion;
        }

        return true;
      }) || null
    );
  } catch {
    return null;
  }
}

export function moveToUci(move) {
  if (!move) return null;
  return `${move.from}${move.to}${move.promotion || ''}`;
}
