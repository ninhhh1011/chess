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
  border: '0',
  borderRadius: 'clamp(0.5rem, 2vw, 1rem)',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(2,6,23,.4)',
  touchAction: 'none',
};

const stableSquareStyle = {
  boxSizing: 'border-box',
  border: '0',
  outline: '0',
  boxShadow: 'none',
  transition: 'background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
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

  const [hoverSquare, setHoverSquare] = useState(null);
  const [hoverHints, setHoverHints] = useState({});

  const boardOrientation = playerColor === 'b' ? 'black' : 'white';
  const checkedKingSquare = useMemo(
    () => (activeGame.isCheck() ? getKingSquare(activeGame.turn()) : null),
    [activeGame, getKingSquare]
  );

  const engineMove = useMemo(() => describeEngineMove(engineHint, activeGame), [engineHint, activeGame]);

  // Merge selected hints and hover hints
  const mergedHints = useMemo(() => {
    if (selectedSquare) return moveHints; // Selected takes priority
    return hoverHints;
  }, [selectedSquare, moveHints, hoverHints]);

  const { boardSquareStyles, engineArrows } = useMoveHighlights({
    selectedSquare,
    moveHints: mergedHints,
    lastMoveSquares,
    checkedKingSquare,
    engineMove,
  });

  // v5 API: canDragPiece({ isSparePiece, piece, square })
  // piece is PieceDataType object with pieceType: string like "wP", "bN"
  function canDragPiece({ isSparePiece, piece, square }) {
    if (isSparePiece || isBotThinking || isGameOver || !piece?.pieceType) return false;

    // pieceType is string like "wP", "bN" — first char is color
    const pieceColor = piece.pieceType[0]; // 'w' or 'b'

    if (gameMode === GAME_MODES.BOT) {
      return activeGame.turn() === playerColor && pieceColor === playerColor;
    }

    return pieceColor === activeGame.turn();
  }

  // v5 API: onPieceDrop({ piece, sourceSquare, targetSquare }) => boolean
  function onPieceDrop({ piece, sourceSquare, targetSquare }) {
    // Check if this is a promotion move
    const boardPiece = activeGame.get(sourceSquare);
    const isPromotion = boardPiece?.type === 'p' &&
      ((boardPiece.color === 'w' && targetSquare?.[1] === '8') ||
       (boardPiece.color === 'b' && targetSquare?.[1] === '1'));

    const result = isPromotion
      ? makeMove(sourceSquare, targetSquare, null)
      : makeMove(sourceSquare, targetSquare);

    if (result && result.move) {
      result.move.captured ? playCaptureSound() : playMoveSound();
    }
    return !!result;
  }

  // v5 API: onSquareClick({ piece, square }) => void
  function handleSquareClick({ piece, square }) {
    if (!square) return;

    // If square has legal move hint, execute move
    if (selectedSquare && moveHints[square]) {
      const boardPiece = activeGame.get(selectedSquare);
      const isPromotion = boardPiece?.type === 'p' &&
        ((boardPiece.color === 'w' && square[1] === '8') ||
         (boardPiece.color === 'b' && square[1] === '1'));

      const result = isPromotion
        ? makeMove(selectedSquare, square, null)
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

    clearSelection();
  }

  // v5 API: onPieceClick({ isSparePiece, piece, square }) => void
  function handlePieceClick({ isSparePiece, piece, square }) {
    if (isSparePiece || !square) return;
    selectSquare(square);
  }

  // Hover handlers for desktop legal move preview
  function handleMouseOverSquare({ square }) {
    if (!square || selectedSquare || isBotThinking || isGameOver) return;

    const piece = activeGame.get(square);
    if (!piece || piece.color !== activeGame.turn()) return;

    // In bot mode, only show hover for player's pieces
    if (gameMode === GAME_MODES.BOT && piece.color !== playerColor) return;

    const moves = getLegalMoves(square);
    const hints = moves.reduce((acc, move) => {
      // Check if target square has opponent piece (capture)
      const targetPiece = activeGame.get(move.to);
      const isCapture = targetPiece && targetPiece.color !== piece.color;

      const style = isCapture
        ? { boxShadow: 'inset 0 0 0 4px rgba(234,179,8,0.42)' }
        : {
            backgroundImage: 'radial-gradient(circle, rgba(234,179,8,0.45) 0 18%, transparent 20%)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '100% 100%',
          };
      acc[move.to] = style;
      return acc;
    }, {});

    setHoverSquare(square);
    setHoverHints(hints);
  }

  function handleMouseOutSquare() {
    if (!selectedSquare) {
      setHoverSquare(null);
      setHoverHints({});
    }
  }

  // REMOVE onPieceClick and onPieceDrag - use onSquareClick only

  return (
    <div className="play-board-frame aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 p-2 shadow-[0_18px_48px_rgba(2,6,23,.32)] backdrop-blur box-border sm:p-3">
      <Chessboard
        key={boardKey}
        options={{
          pieces: standardPieces,
          position: currentFen,
          boardOrientation,
          onPieceDrop,
          canDragPiece,
          onPieceClick: handlePieceClick,
          onSquareClick: handleSquareClick,
          onMouseOverSquare: handleMouseOverSquare,
          onMouseOutSquare: handleMouseOutSquare,
          squareStyles: boardSquareStyles,
          arrows: engineArrows,
          boardStyle: fixedBoardStyle,
          squareStyle: stableSquareStyle,
          showNotation: true,
          showAnimations: true,
          animationDurationInMs: 190,
          darkSquareStyle: { backgroundColor: '#334155', ...stableSquareStyle },
          lightSquareStyle: { backgroundColor: '#94a3b8', ...stableSquareStyle },
          dropSquareStyle: { boxShadow: 'inset 0 0 0 3px rgba(245,158,11,.82)' },
          draggingPieceStyle: { filter: 'drop-shadow(0 20px 24px rgba(0,0,0,.5))', transform: 'scale(1.08)' },
          darkSquareNotationStyle: { color: 'rgba(248,250,252,.58)', fontWeight: 800 },
          lightSquareNotationStyle: { color: 'rgba(15,23,42,.58)', fontWeight: 800 },
        }}
      />
    </div>
  );
}
