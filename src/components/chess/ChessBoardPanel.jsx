import { useMemo } from 'react';
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
    GAME_MODES,
  } = useChessGame();

  const boardOrientation = playerColor === 'b' ? 'black' : 'white';
  const checkedKingSquare = useMemo(
    () => (activeGame.isCheck() ? getKingSquare(activeGame.turn()) : null),
    [activeGame, getKingSquare]
  );

  const engineMove = useMemo(() => describeEngineMove(engineHint, activeGame), [engineHint, activeGame]);

  const { boardSquareStyles, engineArrows } = useMoveHighlights({
    selectedSquare,
    moveHints,
    lastMoveSquares,
    checkedKingSquare,
    engineMove,
  });

  function canDragPiece({ piece }) {
    if (isBotThinking || isGameOver || !piece?.pieceType) return false;

    const pieceColor = piece.pieceType[0];

    if (gameMode === GAME_MODES.BOT) {
      return activeGame.turn() === playerColor && pieceColor === playerColor;
    }

    return pieceColor === activeGame.turn();
  }

  function onPieceDrop(sourceSquare, targetSquare) {
    const result = makeMove(sourceSquare, targetSquare);
    if (result && result.move) {
      if (result.move.captured) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    }
    return !!result;
  }

  function handleSquareClick(square) {
    if (!square) return;

    // If square has legal move hint, execute move
    if (selectedSquare && moveHints[square]) {
      const result = makeMove(selectedSquare, square);
      if (result && result.move) {
        if (result.move.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }
      return;
    }

    // If clicking same square, deselect
    if (selectedSquare === square) {
      clearSelection();
      return;
    }

    // Select piece if it's player's turn
    const piece = activeGame.get(square);
    if (piece && piece.color === activeGame.turn()) {
      selectSquare(square);
      return;
    }

    // Clear selection if clicking empty square or opponent piece
    clearSelection();
  }

  function handlePieceClick(square) {
    selectSquare(square);
  }

  function handlePieceDrag(square) {
    selectSquare(square);
  }

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
          onPieceDrag: handlePieceDrag,
          onSquareClick: handleSquareClick,
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
