import { useMemo } from 'react';

const moveDotStyle = {
  backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.95) 0 13%, rgba(245,158,11,0.18) 14% 27%, transparent 28%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  boxShadow: 'inset 0 0 0 2px rgba(245,158,11,0.28), 0 0 18px rgba(245,158,11,0.22)',
};

const captureRingStyle = {
  backgroundImage: 'radial-gradient(circle, transparent 0 48%, rgba(245,158,11,0.9) 49%, rgba(245,158,11,0.9) 58%, transparent 59%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  boxShadow: 'inset 0 0 0 2px rgba(245,158,11,0.45), 0 0 22px rgba(245,158,11,0.26)',
};

const selectedSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.78), 0 0 18px rgba(245,158,11,0.24)',
};

const lastMoveSquareStyle = {
  backgroundImage: 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(245,158,11,0.08))',
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.52), 0 0 22px rgba(245,158,11,0.20)',
};

const checkedKingSquareStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.22)',
  boxShadow: 'inset 0 0 0 2px rgba(239, 68, 68, 0.75)',
  animation: 'king-check-soft-pulse 1.4s ease-in-out infinite',
};

const engineFromSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.78), 0 0 20px rgba(245,158,11,0.26)',
};

const engineToSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.78), 0 0 20px rgba(245,158,11,0.26)',
  backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.34) 0 16%, transparent 17%)',
};

export function useMoveHighlights({
  selectedSquare,
  moveHints,
  lastMoveSquares,
  checkedKingSquare,
  engineMove,
}) {
  const boardSquareStyles = useMemo(() => {
    const styles = { ...moveHints };

    if (lastMoveSquares?.from) {
      styles[lastMoveSquares.from] = {
        ...styles[lastMoveSquares.from],
        ...lastMoveSquareStyle,
      };
    }

    if (lastMoveSquares?.to) {
      styles[lastMoveSquares.to] = {
        ...styles[lastMoveSquares.to],
        ...lastMoveSquareStyle,
      };
    }

    if (engineMove?.from) {
      styles[engineMove.from] = {
        ...styles[engineMove.from],
        ...engineFromSquareStyle,
      };
    }

    if (engineMove?.to) {
      styles[engineMove.to] = {
        ...styles[engineMove.to],
        ...engineToSquareStyle,
      };
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        ...selectedSquareStyle,
      };
    }

    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        ...styles[checkedKingSquare],
        ...checkedKingSquareStyle,
      };
    }

    return styles;
  }, [selectedSquare, moveHints, lastMoveSquares, checkedKingSquare, engineMove]);

  const engineArrows = useMemo(() => {
    if (!engineMove) return [];
    return [
      {
        startSquare: engineMove.from,
        endSquare: engineMove.to,
        color: 'rgba(245,158,11,0.88)',
      },
    ];
  }, [engineMove]);

  return {
    boardSquareStyles,
    engineArrows,
    moveDotStyle,
    captureRingStyle,
  };
}
