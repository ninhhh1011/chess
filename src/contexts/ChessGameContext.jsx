import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';

const ChessGameContext = createContext(null);

export function useChessGame() {
  const context = useContext(ChessGameContext);
  if (!context) {
    throw new Error('useChessGame must be used within ChessGameProvider');
  }
  return context;
}

const GAME_MODES = {
  LOCAL: 'local',
  BOT: 'bot',
};

const PLAYER_COLORS = {
  WHITE: 'w',
  BLACK: 'b',
};

export function ChessGameProvider({ children }) {
  // Core game state
  const [game, setGame] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);

  // Game mode and settings
  const [gameMode, setGameMode] = useState(GAME_MODES.BOT);
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS.WHITE);
  const [botElo, setBotElo] = useState(1200);

  // Bot state
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botMoveSource, setBotMoveSource] = useState(null);
  const [botRequestId, setBotRequestId] = useState(0);
  const botRequestIdRef = useRef(0);

  // UI state
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [moveHints, setMoveHints] = useState({});
  const [lastMoveSquares, setLastMoveSquares] = useState(null);

  // Engine state
  const [engineHint, setEngineHint] = useState(null);

  // Game status
  const [resultNotice, setResultNotice] = useState(null);
  const [recordedGamePgn, setRecordedGamePgn] = useState(null);
  const [shouldShowGameOverModal, setShouldShowGameOverModal] = useState(false);

  // Move annotations
  const [moveAnnotations, setMoveAnnotations] = useState({});
  const [lastMoveFenPair, setLastMoveFenPair] = useState(null);

  // Promotion state
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Analysis mode
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisGame, setAnalysisGame] = useState(() => new Chess());
  const [analysisMainline, setAnalysisMainline] = useState([]);
  const [analysisPly, setAnalysisPly] = useState(0);

  // Derived state
  const activeGame = analysisMode ? analysisGame : game;
  const currentFen = activeGame.fen();
  const currentPgn = activeGame.pgn();
  const currentTurn = activeGame.turn();
  const moveHistory = activeGame.history();
  const isCheck = activeGame.isCheck();
  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isGameOver = activeGame.isGameOver();

  // Helper functions
  function cloneGame(sourceGame = game) {
    const copy = new Chess();
    const pgn = sourceGame.pgn();
    if (pgn) copy.loadPgn(pgn);
    return copy;
  }

  function getLegalMoves(square) {
    if (!square) return [];
    return activeGame.moves({ square, verbose: true });
  }

  function getKingSquare(color) {
    const files = 'abcdefgh';
    const board = activeGame.board();

    for (let rowIndex = 0; rowIndex < board.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < board[rowIndex].length; columnIndex += 1) {
        const piece = board[rowIndex][columnIndex];
        if (piece?.type === 'k' && piece.color === color) {
          return `${files[columnIndex]}${8 - rowIndex}`;
        }
      }
    }
    return null;
  }

  // Actions
  // options.byBot = true  → được phép đi dù isBotThinking, dù không phải lượt playerColor
  function makeMove(from, to, promotion = 'q', options = {}) {
    const { byBot = false } = options;

    if (!from || !to || from === to) {
      return false;
    }
    if (isGameOver) {
      return false;
    }

    if (!analysisMode) {
      if (!byBot && isBotThinking) {
        return false;
      }
      if (!byBot && gameMode === GAME_MODES.BOT && currentTurn !== playerColor) {
        return false;
      }
      if (byBot && gameMode === GAME_MODES.BOT && currentTurn === playerColor) {
        return false;
      }
    }

    // Check if this is a promotion move
    const piece = activeGame.get(from);
    const isPromotion = piece?.type === 'p' && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    // If promotion and no promotion piece specified, show modal
    if (isPromotion && !promotion) {
      setPendingPromotion({ from, to, color: piece.color });
      return false;
    }

    const beforeFen = activeGame.fen();
    const nextGame = cloneGame(activeGame);

    let move = null;
    try {
      move = nextGame.move({ from, to, promotion });
    } catch {
      return false;
    }

    if (!move) return false;

    // Clear UI state
    setSelectedSquare(null);
    setMoveHints({});
    setEngineHint(null);
    setLastMoveSquares({ from: move.from, to: move.to });

    // Update game state
    if (analysisMode) {
      setAnalysisGame(nextGame);
      setAnalysisPly(nextGame.history().length);
    } else {
      const moveIndex = nextGame.history().length - 1;
      const playedUci = `${move.from}${move.to}${move.promotion || ''}`;

      setGame(nextGame);
      setMoveAnnotations((current) => ({
        ...current,
        [moveIndex]: { symbol: '...', label: 'Đang phân tích', tone: 'pending' },
      }));
      setLastMoveFenPair({
        beforeFen,
        afterFen: nextGame.fen(),
        playedUci,
        moveIndex,
        color: move.color,
        san: move.san,
      });

      // Check if game just ended from this live move
      if (nextGame.isGameOver()) {
        setShouldShowGameOverModal(true);
      }
    }

    return { move, nextGame };
  }

  function selectSquare(square) {
    if (!square) {
      setSelectedSquare(null);
      setMoveHints({});
      return;
    }

    const piece = activeGame.get(square);

    if (!piece || piece.color !== currentTurn) {
      setSelectedSquare(null);
      setMoveHints({});
      return;
    }

    if (!analysisMode && isBotThinking) {
      return;
    }

    if (!analysisMode && gameMode === GAME_MODES.BOT && piece.color !== playerColor) {
      return;
    }

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

    setSelectedSquare(square);
    setMoveHints(hints);
  }

  function clearSelection() {
    setSelectedSquare(null);
    setMoveHints({});
  }

  function newGame() {
    const freshGame = new Chess();
    setGame(freshGame);
    setAnalysisMode(false);
    setAnalysisGame(new Chess());
    setAnalysisMainline([]);
    setAnalysisPly(0);
    setIsBotThinking(false);
    botRequestIdRef.current += 1;
    setBotRequestId(botRequestIdRef.current);
    setBotMoveSource(null);
    setMoveHints({});
    setEngineHint(null);
    setLastMoveSquares(null);
    setSelectedSquare(null);
    setResultNotice(null);
    setRecordedGamePgn(null);
    setMoveAnnotations({});
    setLastMoveFenPair(null);
    setShouldShowGameOverModal(false);
    setBoardKey((k) => k + 1);

    return freshGame;
  }

  function undoMove() {
    if (analysisMode) {
      const nextGame = cloneGame(analysisGame);
      nextGame.undo();
      setAnalysisGame(nextGame);
      setAnalysisPly(nextGame.history().length);
      setEngineHint(null);

      const lastMove = nextGame.history({ verbose: true }).at(-1);
      setLastMoveSquares(lastMove ? { from: lastMove.from, to: lastMove.to } : null);
      clearSelection();
      return nextGame;
    }

    const nextGame = cloneGame();

    if (gameMode === GAME_MODES.BOT) {
      botRequestIdRef.current += 1;

      const lastMove = nextGame.history({ verbose: true }).at(-1);
      if (lastMove?.color !== playerColor) {
        nextGame.undo();
      }

      const previousMove = nextGame.history({ verbose: true }).at(-1);
      if (previousMove?.color === playerColor) {
        nextGame.undo();
      }
    } else {
      nextGame.undo();
    }

    setGame(nextGame);
    setIsBotThinking(false);
    setBotRequestId(botRequestIdRef.current);
    setEngineHint(null);

    const lastMove = nextGame.history({ verbose: true }).at(-1);
    setLastMoveSquares(lastMove ? { from: lastMove.from, to: lastMove.to } : null);

    setMoveAnnotations((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([index]) => Number(index) < nextGame.history().length)
      )
    );
    clearSelection();

    return nextGame;
  }

  function changeGameMode(mode) {
    setGameMode(mode);
    newGame();
  }

  function changePlayerColor(color) {
    setPlayerColor(color);
    newGame();
  }

  function changeBotElo(elo) {
    setBotElo(elo);
  }

  function enterAnalysisMode() {
    const mainline = game.history();
    const analysisCopy = cloneGame(game);
    setAnalysisMode(true);
    setAnalysisMainline(mainline);
    setAnalysisGame(analysisCopy);
    setAnalysisPly(mainline.length);
    setResultNotice(null);
    setShouldShowGameOverModal(false);
    setIsBotThinking(false);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);

    const lastMove = analysisCopy.history({ verbose: true }).at(-1);
    setLastMoveSquares(lastMove ? { from: lastMove.from, to: lastMove.to } : null);
  }

  function exitAnalysisMode() {
    setAnalysisMode(false);
    setAnalysisGame(new Chess());
    setAnalysisMainline([]);
    setAnalysisPly(0);
    setShouldShowGameOverModal(false);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);

    const lastMove = game.history({ verbose: true }).at(-1);
    setLastMoveSquares(lastMove ? { from: lastMove.from, to: lastMove.to } : null);
  }

  function goToAnalysisPly(ply) {
    const boundedPly = Math.max(0, Math.min(ply, analysisMainline.length));
    const replay = new Chess();

    analysisMainline.slice(0, boundedPly).forEach((san) => {
      try {
        replay.move(san);
      } catch {
        // Ignore invalid moves
      }
    });

    setAnalysisGame(replay);
    setAnalysisPly(boundedPly);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);

    const lastMove = replay.history({ verbose: true }).at(-1);
    setLastMoveSquares(lastMove ? { from: lastMove.from, to: lastMove.to } : null);
  }

  const value = {
    // State
    game,
    activeGame,
    currentFen,
    currentPgn,
    currentTurn,
    moveHistory,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver,
    boardKey,

    // Game mode
    gameMode,
    playerColor,
    botElo,
    GAME_MODES,
    PLAYER_COLORS,

    // Bot state
    isBotThinking,
    setIsBotThinking,
    botMoveSource,
    setBotMoveSource,
    botRequestId,
    setBotRequestId,
    botRequestIdRef,

    // UI state
    selectedSquare,
    moveHints,
    lastMoveSquares,
    setLastMoveSquares,

    // Engine
    engineHint,
    setEngineHint,

    // Status
    resultNotice,
    setResultNotice,
    recordedGamePgn,
    setRecordedGamePgn,
    shouldShowGameOverModal,
    setShouldShowGameOverModal,

    // Annotations
    moveAnnotations,
    setMoveAnnotations,
    lastMoveFenPair,
    setLastMoveFenPair,

    // Promotion
    pendingPromotion,
    setPendingPromotion,

    // Analysis mode
    analysisMode,
    analysisGame,
    analysisMainline,
    analysisPly,

    // Actions
    makeMove,
    selectSquare,
    clearSelection,
    getLegalMoves,
    getKingSquare,
    newGame,
    undoMove,
    changeGameMode,
    changePlayerColor,
    changeBotElo,
    enterAnalysisMode,
    exitAnalysisMode,
    goToAnalysisPly,
    cloneGame,
  };

  return <ChessGameContext.Provider value={value}>{children}</ChessGameContext.Provider>;
}
