import { useMemo, useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { Chessboard } from 'react-chessboard';
import { standardPieces } from './standardPieces';
import { useMoveHighlights } from '../../hooks/useMoveHighlights';
import { playCaptureSound, playMoveSound, playCastlingSound } from '../../utils/sound';

const fixedBoardStyle = {
  width: '100%',
  height: '100%',
  aspectRatio: '1 / 1',
  border: '1px solid rgba(3, 3, 2, 0.08)',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 20px 40px -15px rgba(3, 3, 2, 0.07), 0 0 0 1px rgba(3, 3, 2, 0.04)',
  touchAction: 'none',
};

const stableSquareStyle = {
  boxSizing: 'border-box',
  border: '0',
  outline: '0',
  boxShadow: 'none',
  transition: 'background 120ms ease, box-shadow 120ms ease',
};

function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : '',
  };
}

function describeEngineMove(hint, activeGame) {
  const parsed = parseUciMove(hint?.bestMove);
  if (!parsed || !hint?.fen) return null;

  try {
    const piece = activeGame.get(parsed.from);
    const pieceLabels = { p: 'Tốt', n: 'Mã', b: 'Tượng', r: 'Xe', q: 'Hậu', k: 'Vua' };
    const pieceLabel = piece ? `${pieceLabels[piece.type] || 'Quân'} ${piece.color === 'w' ? 'trắng' : 'đen'}` : 'Quân';

    return {
      ...parsed,
      pieceLabel,
      san: hint.bestMove,
    };
  } catch {
    return {
      ...parsed,
      pieceLabel: 'Quân',
      san: hint.bestMove,
    };
  }
}

export default function ChessBoardPanel({ boardOrientation, engineHint, selectedSquare, moveHints, selectSquare, clearSelection, isThinking }) {
  const {
    activeGame,
    currentFen,
    gameGeneration,
    playerColor,
    isGameOver,
    attemptMove,
    getKingSquare,
    getLegalMoves,
  } = useChessGame();

  // FIX BUG 3: Remove hover hints state - only show hints on selection
  const [hoveredSquare, setHoveredSquare] = useState(null);

  const checkedKingSquare = useMemo(
    () => (activeGame.isCheck() ? getKingSquare(activeGame.turn()) : null),
    [activeGame, getKingSquare]
  );

  const engineMove = useMemo(() => describeEngineMove(engineHint, activeGame), [engineHint, activeGame]);
  const lastMoveSquares = useMemo(() => {
    const lastMove = activeGame.history({ verbose: true }).at(-1);
    return lastMove ? { from: lastMove.from, to: lastMove.to } : null;
  }, [activeGame]);

  // FIX BUG 3: Only use selected hints, never hover hints
  const { boardSquareStyles, engineArrows } = useMoveHighlights({
    selectedSquare,
    moveHints: selectedSquare ? moveHints : {}, // Only show hints when piece is selected
    lastMoveSquares,
    checkedKingSquare,
    engineMove,
  });

  // FIX BUG 3: Add subtle hover effect only on the piece itself
  const customSquareStyles = useMemo(() => {
    const styles = { ...boardSquareStyles };

    // Add subtle hover effect on hoverable pieces (no legal move dots)
    if (hoveredSquare && !selectedSquare && !isThinking && !isGameOver) {
      const piece = activeGame.get(hoveredSquare);
      if (piece && piece.color === activeGame.turn()) {
        if (piece.color !== playerColor) {
          // Don't highlight opponent pieces in bot mode
        } else {
          styles[hoveredSquare] = {
            ...styles[hoveredSquare],
            cursor: 'grab',
            boxShadow: styles[hoveredSquare]?.boxShadow || 'inset 0 0 0 2px rgba(16,185,129,0.35)',
          };
        }
      }
    }

    return styles;
  }, [boardSquareStyles, hoveredSquare, selectedSquare, isThinking, isGameOver, activeGame, playerColor]);

  function canDragPiece({ isSparePiece, piece, square }) {
    if (isSparePiece || isThinking || isGameOver || !piece?.pieceType) return false;

    const pieceColor = piece.pieceType[0];

    return activeGame.turn() === playerColor && pieceColor === playerColor;
  }

  // NEW: Handle drag begin - show legal move hints
  function handlePieceDragBegin({ piece, sourceSquare }) {
    if (!sourceSquare) return;

    // Select the piece being dragged to show legal move hints
    selectSquare(sourceSquare);
  }

  // NEW: Handle drag end - clear selection after drop
  function handlePieceDragEnd() {
    window.setTimeout(() => {
      clearSelection();
    }, 0);
  }

  function onPieceDrop({ piece, sourceSquare, targetSquare }) {
    if (!sourceSquare || !targetSquare) {
      clearSelection();
      return false;
    }

    if (sourceSquare === targetSquare) {
      clearSelection();
      return false;
    }

    const result = attemptMove(sourceSquare, targetSquare);

    if (result.status === 'moved') {
      // Play appropriate sound
      if (result.move.captured) {
        playCaptureSound();
      } else if (isCastling(sourceSquare, targetSquare)) {
        playCastlingSound();
      } else {
        playMoveSound();
      }
    }

    // Clear selection after drop attempt
    clearSelection();

    return result.status !== 'rejected';
  }

  function isCastling(from, to) {
    const piece = activeGame.get(from);
    if (!piece || piece.type !== 'k') return false;
    const filesDiff = Math.abs(to.charCodeAt(0) - from.charCodeAt(0));
    return filesDiff === 2; // King moves 2 squares = castling
  }

  // FIX BUG 3: Click selects piece and shows hints
  function handleSquareClick({ piece, square }) {
    if (!square) return;

    // If square has legal move hint, execute move
    if (selectedSquare && moveHints[square]) {
      const result = attemptMove(selectedSquare, square);

      if (result.status === 'moved') {
        if (result.move.captured) {
          playCaptureSound();
        } else if (isCastling(selectedSquare, square)) {
          playCastlingSound();
        } else {
          playMoveSound();
        }
        clearSelection();
      } else if (result.status === 'promotion_required') {
        clearSelection();
      }
      return;
    }

    // Deselect same square
    if (selectedSquare === square) {
      clearSelection();
      return;
    }

    // Select piece if it's player's turn
    const boardPiece = activeGame.get(square);
    if (boardPiece && boardPiece.color === activeGame.turn()) {
      selectSquare(square);
      return;
    }

    // Click on empty square or opponent piece clears selection
    clearSelection();
  }

  function handlePieceClick({ isSparePiece, piece, square }) {
    if (isSparePiece || !square) return;

    if (selectedSquare === square) {
      clearSelection();
      return;
    }

    selectSquare(square);
  }

  // FIX BUG 3: Hover only adds subtle effect, NO legal move dots
  function handleMouseOverSquare({ square }) {
    if (!square || selectedSquare || isThinking || isGameOver) return;

    const piece = activeGame.get(square);
    if (!piece || piece.color !== activeGame.turn()) return;

    // In bot mode, only allow hover on player's pieces
    if (piece.color !== playerColor) return;

    setHoveredSquare(square);
  }

  function handleMouseOutSquare() {
    setHoveredSquare(null);
  }

  // Determine if player can interact
  const canInteract = !isThinking && !isGameOver && activeGame.turn() === playerColor;

  return (
    <div className="chess-board-container relative">
      {/* Turn indicator overlay */}
      {isThinking && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2 rounded-full border border-[var(--app-border)] bg-white/95 px-5 py-3 shadow-[var(--shadow-floating)]">
            <div className="text-xl animate-bounce text-[#030302]">♟</div>
            <span className="text-xs font-medium text-[#030302]">Đang tính nước...</span>
          </div>
        </div>
      )}

      <Chessboard
        key={gameGeneration}
        options={{
          pieces: standardPieces,
          position: currentFen,
          boardOrientation,
          arePiecesDraggable: canInteract,
          onPieceDrop: canInteract ? onPieceDrop : () => false,
          canDragPiece: canInteract ? canDragPiece : () => false,
          onPieceDragBegin: canInteract ? handlePieceDragBegin : undefined,
          onPieceDragEnd: canInteract ? handlePieceDragEnd : undefined,
          onPieceClick: canInteract ? handlePieceClick : undefined,
          onSquareClick: canInteract ? handleSquareClick : undefined,
          onMouseOverSquare: canInteract ? handleMouseOverSquare : undefined,
          onMouseOutSquare: canInteract ? handleMouseOutSquare : undefined,
          squareStyles: customSquareStyles,
          arrows: engineArrows,
          boardStyle: fixedBoardStyle,
          squareStyle: stableSquareStyle,
          showNotation: true,
          showAnimations: true,
          animationDurationInMs: 190,
          darkSquareStyle: { backgroundColor: 'var(--color-board-dark)', ...stableSquareStyle },
          lightSquareStyle: { backgroundColor: 'var(--color-board-light)', ...stableSquareStyle },
          dropSquareStyle: { boxShadow: 'inset 0 0 0 3px var(--color-board-last-move)' },
          draggingPieceStyle: { filter: 'drop-shadow(0 10px 12px rgba(0,0,0,.35))', transform: 'scale(1.03)' },
          darkSquareNotationStyle: { color: 'var(--color-board-light)', opacity: 0.58, fontWeight: 800 },
          lightSquareNotationStyle: { color: 'var(--color-board-dark)', opacity: 0.58, fontWeight: 800 },
          ariaLabel: 'Bàn cờ vua',
        }}
      />
    </div>
  );
}
