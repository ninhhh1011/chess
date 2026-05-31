import { useMemo, useState } from 'react';
import { useChessGame } from '../../contexts/ChessGameContext';
import { Chessboard } from 'react-chessboard';
import { standardPieces } from './standardPieces';
import { useMoveHighlights } from '../../hooks/useMoveHighlights';
import { playCaptureSound, playMoveSound } from '../../utils/sound';

const fixedBoardStyle = {
  width: '100%',
  height: '100%',
  aspectRatio: '1 / 1',
  border: '1px solid #334155',
  borderRadius: 'clamp(0.5rem, 2vw, 0.75rem)',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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

export default function ChessBoardPanel({ engineHint }) {
  const {
    activeGame,
    currentFen,
    boardKey,
    playerColor,
    boardOrientation,
    gameMode,
    isBotThinking,
    isGameOver,
    selectedSquare,
    moveHints,
    lastMoveSquares,
    makeMove,
    selectSquare,
    clearSelection,
    getKingSquare,
    getLegalMoves,
    GAME_MODES,
  } = useChessGame();

  // FIX BUG 3: Remove hover hints state - only show hints on selection
  const [hoveredSquare, setHoveredSquare] = useState(null);

  const checkedKingSquare = useMemo(
    () => (activeGame.isCheck() ? getKingSquare(activeGame.turn()) : null),
    [activeGame, getKingSquare]
  );

  const engineMove = useMemo(() => describeEngineMove(engineHint, activeGame), [engineHint, activeGame]);

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
    if (hoveredSquare && !selectedSquare && !isBotThinking && !isGameOver) {
      const piece = activeGame.get(hoveredSquare);
      if (piece && piece.color === activeGame.turn()) {
        if (gameMode === GAME_MODES.BOT && piece.color !== playerColor) {
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
  }, [boardSquareStyles, hoveredSquare, selectedSquare, isBotThinking, isGameOver, activeGame, gameMode, playerColor, GAME_MODES]);

  function canDragPiece({ isSparePiece, piece, square }) {
    if (isSparePiece || isBotThinking || isGameOver || !piece?.pieceType) return false;

    const pieceColor = piece.pieceType[0];

    if (gameMode === GAME_MODES.BOT) {
      return activeGame.turn() === playerColor && pieceColor === playerColor;
    }

    return pieceColor === activeGame.turn();
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

    const boardPiece = activeGame.get(sourceSquare);
    const isPromotion = boardPiece?.type === 'p' &&
      ((boardPiece.color === 'w' && targetSquare?.[1] === '8') ||
       (boardPiece.color === 'b' && targetSquare?.[1] === '1'));

    const result = isPromotion
      ? makeMove(sourceSquare, targetSquare, 'q')
      : makeMove(sourceSquare, targetSquare);

    if (result && result.move) {
      result.move.captured ? playCaptureSound() : playMoveSound();
    }

    // Clear selection after drop attempt
    clearSelection();

    return !!result;
  }

  // FIX BUG 3: Click selects piece and shows hints
  function handleSquareClick({ piece, square }) {
    if (!square) return;

    // If square has legal move hint, execute move
    if (selectedSquare && moveHints[square]) {
      const boardPiece = activeGame.get(selectedSquare);
      const isPromotion = boardPiece?.type === 'p' &&
        ((boardPiece.color === 'w' && square[1] === '8') ||
         (boardPiece.color === 'b' && square[1] === '1'));

      const result = isPromotion
        ? makeMove(selectedSquare, square, 'q')
        : makeMove(selectedSquare, square);

      if (result && result.move) {
        result.move.captured ? playCaptureSound() : playMoveSound();
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
    if (!square || selectedSquare || isBotThinking || isGameOver) return;

    const piece = activeGame.get(square);
    if (!piece || piece.color !== activeGame.turn()) return;

    // In bot mode, only allow hover on player's pieces
    if (gameMode === GAME_MODES.BOT && piece.color !== playerColor) return;

    setHoveredSquare(square);
  }

  function handleMouseOutSquare() {
    setHoveredSquare(null);
  }

  return (
    <div className="chess-board-container">
      <Chessboard
        key={boardKey}
        options={{
          pieces: standardPieces,
          position: currentFen,
          boardOrientation,
          onPieceDrop,
          canDragPiece,
          onPieceDragBegin: handlePieceDragBegin,
          onPieceDragEnd: handlePieceDragEnd,
          onPieceClick: handlePieceClick,
          onSquareClick: handleSquareClick,
          onMouseOverSquare: handleMouseOverSquare,
          onMouseOutSquare: handleMouseOutSquare,
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
