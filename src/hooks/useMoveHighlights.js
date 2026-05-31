import { useMemo } from 'react';

// Empty square legal move - small dot
const moveDotStyle = {
  backgroundImage: 'radial-gradient(circle, var(--color-board-legal-hint) 0 11%, transparent 12%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
};

// Capture legal move - ring outline
const captureRingStyle = {
  boxShadow: 'inset 0 0 0 2px var(--color-board-legal-hint)',
};

// Selected square - amber border
const selectedSquareStyle = {
  backgroundColor: 'var(--color-board-selected)',
  boxShadow: 'inset 0 0 0 2px rgba(56,189,248,0.72)',
};

// Last move - very light yellow background
const lastMoveSquareStyle = {
  backgroundColor: 'var(--color-board-last-move)',
};

// Checked king - red with pulse
const checkedKingSquareStyle = {
  backgroundColor: 'rgba(239,68,68,0.28)',
  boxShadow: 'inset 0 0 0 3px rgba(239,68,68,0.65)',
  animation: 'king-check-soft-pulse 1.4s ease-in-out infinite',
};

// Engine hint squares
const engineFromSquareStyle = {
  boxShadow: 'inset 0 0 0 2px rgba(245,158,11,0.62)',
};

const engineToSquareStyle = {
  boxShadow: 'inset 0 0 0 2px rgba(245,158,11,0.62)',
  backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.28) 0 10%, transparent 11%)',
};

function getLegalMoveHintStyle(hintStyle) {
  return hintStyle?.boxShadow ? captureRingStyle : moveDotStyle;
}

export function useMoveHighlights({
  selectedSquare,
  moveHints,
  lastMoveSquares,
  checkedKingSquare,
  engineMove,
}) {
  const boardSquareStyles = useMemo(() => {
    const styles = {};

    // Priority 1 (lowest): Last move - light background only
    if (lastMoveSquares?.from && lastMoveSquares.from !== checkedKingSquare && lastMoveSquares.from !== selectedSquare) {
      styles[lastMoveSquares.from] = lastMoveSquareStyle;
    }
    if (lastMoveSquares?.to && lastMoveSquares.to !== checkedKingSquare && lastMoveSquares.to !== selectedSquare) {
      styles[lastMoveSquares.to] = lastMoveSquareStyle;
    }

    // Priority 2: Legal move hints (from moveHints prop - selected or hover)
    Object.keys(moveHints).forEach((square) => {
      if (square !== checkedKingSquare && square !== selectedSquare) {
        styles[square] = getLegalMoveHintStyle(moveHints[square]);
      }
    });

    // Priority 3: Engine hint squares
    if (engineMove?.from && engineMove.from !== checkedKingSquare && engineMove.from !== selectedSquare) {
      styles[engineMove.from] = engineFromSquareStyle;
    }
    if (engineMove?.to && engineMove.to !== checkedKingSquare && engineMove.to !== selectedSquare) {
      styles[engineMove.to] = engineToSquareStyle;
    }

    // Priority 4: Selected square - amber highlight
    if (selectedSquare && selectedSquare !== checkedKingSquare) {
      styles[selectedSquare] = selectedSquareStyle;
    }

    // Priority 5 (highest): Checked king - red highlight, never overridden
    if (checkedKingSquare) {
      styles[checkedKingSquare] = checkedKingSquareStyle;
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
