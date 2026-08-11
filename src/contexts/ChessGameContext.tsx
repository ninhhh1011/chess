import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Chess, type Move, type Square, type Color } from 'chess.js';

interface ChessGameState {
  game: Chess;
  activeGame: Chess;
  currentFen: string;
  currentPgn: string;
  currentTurn: Color;
  moveHistory: string[];
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  boardKey: number;
  gameMode: string;
  playerColor: Color;
  botElo: number;
  gameGoal: string;
  setGameGoal: (goal: string) => void;
  timeControl: string;
  setTimeControl: (tc: string) => void;
  GAME_MODES: Record<string, string>;
  PLAYER_COLORS: Record<string, Color>;
  isBotThinking: boolean;
  setIsBotThinking: (thinking: boolean) => void;
  botMoveSource: { from: string; to: string } | null;
  setBotMoveSource: (source: { from: string; to: string } | null) => void;
  botRequestId: number;
  setBotRequestId: (id: number) => void;
  botRequestIdRef: React.MutableRefObject<number>;
  selectedSquare: Square | null;
  moveHints: Record<string, React.CSSProperties>;
  lastMoveSquares: { from: string; to: string } | null;
  setLastMoveSquares: (squares: { from: string; to: string } | null) => void;
  boardOrientation: 'white' | 'black';
  setBoardOrientation: (orientation: 'white' | 'black') => void;
  engineHint: { bestMove: string; evaluation: string } | null;
  setEngineHint: (hint: { bestMove: string; evaluation: string } | null) => void;
  resultNotice: string | null;
  setResultNotice: (notice: string | null) => void;
  recordedGamePgn: string | null;
  setRecordedGamePgn: (pgn: string | null) => void;
  shouldShowGameOverModal: boolean;
  setShouldShowGameOverModal: (show: boolean) => void;
  playState: string;
  setPlayState: (state: string) => void;
  moveAnnotations: Record<number, { symbol: string; label: string; tone: string }>;
  setMoveAnnotations: (annotations: Record<number, { symbol: string; label: string; tone: string }>) => void;
  lastMoveFenPair: {
    beforeFen: string;
    afterFen: string;
    playedUci: string;
    moveIndex: number;
    color: Color;
    san: string;
  } | null;
  setLastMoveFenPair: (pair: {
    beforeFen: string;
    afterFen: string;
    playedUci: string;
    moveIndex: number;
    color: Color;
    san: string;
  } | null) => void;
  pendingPromotion: { from: Square; to: Square } | null;
  setPendingPromotion: (promotion: { from: Square; to: Square } | null) => void;
  analysisMode: boolean;
  analysisGame: Chess;
  analysisMainline: string[];
  analysisPly: number;
  makeMove: (from: string, to: string, promotion?: string, options?: { byBot?: boolean; sourceFen?: string | null }) => { move: Move; nextGame: Chess } | false;
  selectSquare: (square: Square) => void;
  clearSelection: () => void;
  getLegalMoves: (square: Square) => Move[];
  getKingSquare: (color: Color) => Square | null;
  newGame: () => Chess;
  startGame: (options: { elo?: number; color?: Color; mode?: string; gameGoal?: string; timeControl?: string }) => void;
  undoMove: () => Chess | null;
  changeGameMode: (mode: string) => void;
  changePlayerColor: (color: Color) => void;
  changeBotElo: (elo: number) => void;
  enterAnalysisMode: () => void;
  exitAnalysisMode: () => void;
  goToAnalysisPly: (ply: number) => void;
  cloneGame: (sourceGame?: Chess) => Chess;
  flipBoard: () => void;
  resignGame: () => void;
  restartGameWithCurrentSettings: () => void;
}

const ChessGameContext = createContext<ChessGameState | null>(null);

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

const PLAYER_COLORS: Record<string, Color> = {
  WHITE: 'w' as Color,
  BLACK: 'b' as Color,
};

const DEBUG_MOVES = import.meta.env.DEV;

function failMove(reason: string, data: Record<string, unknown> = {}): false {
  if (DEBUG_MOVES) {
    console.warn('[MOVE] rejected:', reason, data);
  }
  return false;
}

interface ChessGameProviderProps {
  children: ReactNode;
}

export function ChessGameProvider({ children }: ChessGameProviderProps) {
  // Core game state
  const [game, setGame] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);

  // Play state: 'lobby', 'playing', 'review'
  const [playState, setPlayState] = useState('lobby');

  // Game mode and settings
  const [gameMode, setGameMode] = useState(GAME_MODES.BOT);
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS.WHITE);
  const [botElo, setBotElo] = useState(1200);
  const [gameGoal, setGameGoal] = useState('fun');
  const [timeControl, setTimeControl] = useState('unlimited');

  // Bot state
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botMoveSource, setBotMoveSource] = useState<{ from: string; to: string } | null>(null);
  const [botRequestId, setBotRequestId] = useState(0);
  const botRequestIdRef = useRef(0);

  // UI state
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [moveHints, setMoveHints] = useState<Record<string, React.CSSProperties>>({});
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Engine state
  const [engineHint, setEngineHint] = useState<{ bestMove: string; evaluation: string } | null>(null);

  // Game status
  const [resultNotice, setResultNotice] = useState<string | null>(null);
  const [recordedGamePgn, setRecordedGamePgn] = useState<string | null>(null);
  const [shouldShowGameOverModal, setShouldShowGameOverModal] = useState(false);

  // Move annotations
  const [moveAnnotations, setMoveAnnotations] = useState<Record<number, { symbol: string; label: string; tone: string }>>({});
  const [lastMoveFenPair, setLastMoveFenPair] = useState<{
    beforeFen: string;
    afterFen: string;
    playedUci: string;
    moveIndex: number;
    color: Color;
    san: string;
  } | null>(null);

  // Promotion state
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Analysis mode
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisGame, setAnalysisGame] = useState(() => new Chess());
  const [analysisMainline, setAnalysisMainline] = useState<string[]>([]);
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

  function getLegalMoves(square: Square): Move[] {
    if (!square) return [];
    return activeGame.moves({ square, verbose: true });
  }

  function getKingSquare(color: Color): Square | null {
    const files = 'abcdefgh';
    const board = activeGame.board();

    for (let rowIndex = 0; rowIndex < board.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < board[rowIndex].length; columnIndex += 1) {
        const piece = board[rowIndex][columnIndex];
        if (piece?.type === 'k' && piece.color === color) {
          return `${files[columnIndex]}${8 - rowIndex}` as Square;
        }
      }
    }
    return null;
  }

  // Actions
  // options.byBot = true  → được phép đi dù isBotThinking, dù không phải lượt playerColor
  function makeMove(from: string, to: string, promotion = 'q', options: { byBot?: boolean; sourceFen?: string | null } = {}): { move: Move; nextGame: Chess } | false {
    const { byBot = false, sourceFen = null } = options;
    const gameToUse = activeGame;

    if (!from || !to) {
      return failMove('invalid from/to', { from, to });
    }
    if (from === to) {
      return false;
    }
    if (isGameOver) {
      return failMove('game over', { from, to });
    }

    if (!analysisMode) {
      if (!byBot && isBotThinking) {
        return failMove('bot thinking', { from, to });
      }
      if (!byBot && gameMode === GAME_MODES.BOT && currentTurn !== playerColor) {
        return failMove('not player turn', { currentTurn, playerColor });
      }
      if (byBot && gameMode === GAME_MODES.BOT && currentTurn === playerColor) {
        return failMove('not bot turn', { currentTurn, playerColor });
      }
      if (byBot && sourceFen && gameToUse.fen() !== sourceFen) {
        return failMove('stale sourceFen', {
          sourceFen,
          currentFen: gameToUse.fen(),
          from,
          to,
          promotion,
        });
      }
    }

    // Check if this is a promotion move
    const piece = gameToUse.get(from as Square);
    const isPromotion = piece?.type === 'p' && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    // Default promotion to queen if not specified
    const safePromotion = isPromotion ? (promotion || 'q') : promotion;

    const beforeFen = gameToUse.fen();
    const nextGame = cloneGame(gameToUse);

    let move = null;
    try {
      move = nextGame.move({ from, to, promotion: safePromotion });
    } catch (error) {
      return failMove('chess.js threw move error', {
        from,
        to,
        promotion: safePromotion,
        fen: gameToUse.fen(),
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!move) {
      return failMove('chess.js rejected move', { from, to, promotion: safePromotion, fen: gameToUse.fen() });
    }

    // Clear UI state
    setSelectedSquare(null);
    setMoveHints({});
    setEngineHint(null);
    setLastMoveSquares({ from: move.from as string, to: move.to as string });

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
      } as {
        beforeFen: string;
        afterFen: string;
        playedUci: string;
        moveIndex: number;
        color: Color;
        san: string;
      });

      // Check if game just ended from this live move
      if (nextGame.isGameOver()) {
        setShouldShowGameOverModal(true);
      }
    }

    return { move, nextGame };
  }

  function selectSquare(square: Square) {
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

    const hints = moves.reduce<Record<string, React.CSSProperties>>((acc, move) => {
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
      acc[move.to as string] = style;
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

  function startGame({ elo = 1200, color = PLAYER_COLORS.WHITE, mode = GAME_MODES.BOT, gameGoal = 'fun', timeControl = 'unlimited' }: { elo?: number; color?: Color; mode?: string; gameGoal?: string; timeControl?: string }) {
    setBotElo(elo ?? 1200);
    setPlayerColor(color ?? PLAYER_COLORS.WHITE);
    setBoardOrientation(color === PLAYER_COLORS.BLACK ? 'black' : 'white');
    setGameMode(mode ?? GAME_MODES.BOT);
    setGameGoal(gameGoal ?? 'fun');
    setTimeControl(timeControl ?? 'unlimited');
    newGame();
    setPlayState('playing');
  }

  function restartGameWithCurrentSettings() {
    newGame();
    setBoardOrientation(playerColor === PLAYER_COLORS.BLACK ? 'black' : 'white');
    setPlayState('playing');
  }

  function undoMove() {
    if (analysisMode) {
      const nextGame = cloneGame(analysisGame);
      nextGame.undo();
      setAnalysisGame(nextGame);
      setAnalysisPly(nextGame.history().length);
      setEngineHint(null);

      const lastMove = nextGame.history({ verbose: true }).at(-1) as Move | undefined;
      setLastMoveSquares(lastMove ? { from: lastMove.from as string, to: lastMove.to as string } : null);
      clearSelection();
      return nextGame;
    }

    const nextGame = cloneGame();

    if (gameMode === GAME_MODES.BOT) {
      botRequestIdRef.current += 1;

      const lastMove = nextGame.history({ verbose: true }).at(-1) as Move | undefined;
      if (lastMove?.color !== playerColor) {
        nextGame.undo();
      }

      const previousMove = nextGame.history({ verbose: true }).at(-1) as Move | undefined;
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
    setResultNotice(null);
    setRecordedGamePgn(null);
    setShouldShowGameOverModal(false);
    setPlayState('playing');

    const lastMoveAfterSet = nextGame.history({ verbose: true }).at(-1) as Move | undefined;
    setLastMoveSquares(lastMoveAfterSet ? { from: lastMoveAfterSet.from as string, to: lastMoveAfterSet.to as string } : null);

    setMoveAnnotations((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([index]) => Number(index) < nextGame.history().length)
      )
    );
    clearSelection();

    return nextGame;
  }

  function changeGameMode(mode: string) {
    setGameMode(mode);
    newGame();
  }

  function changePlayerColor(color: Color) {
    setPlayerColor(color);
    newGame();
  }

  function changeBotElo(elo: number) {
    setBotElo(elo);
  }

  function enterAnalysisMode() {
    const mainline = game.history();
    const analysisCopy = cloneGame(game);
    setAnalysisMode(true);
    setAnalysisMainline(mainline);
    setAnalysisGame(analysisCopy);
    setAnalysisPly(mainline.length);
    setShouldShowGameOverModal(false);
    setIsBotThinking(false);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);

    const lastMove = analysisCopy.history({ verbose: true }).at(-1) as Move | undefined;
    setLastMoveSquares(lastMove ? { from: lastMove.from as string, to: lastMove.to as string } : null);
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

    const lastMove = game.history({ verbose: true }).at(-1) as Move | undefined;
    setLastMoveSquares(lastMove ? { from: lastMove.from as string, to: lastMove.to as string } : null);
  }

  function goToAnalysisPly(ply: number) {
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

    const lastMove = replay.history({ verbose: true }).at(-1) as Move | undefined;
    setLastMoveSquares(lastMove ? { from: lastMove.from as string, to: lastMove.to as string } : null);
  }

  function flipBoard() {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }

  function resignGame() {
    const winner = playerColor === PLAYER_COLORS.WHITE ? 'Đen' : 'Trắng';
    setResultNotice(`${winner} thắng do bạn đầu hàng.`);
    setIsBotThinking(false);
    botRequestIdRef.current += 1;
    setBotRequestId(botRequestIdRef.current);
    setShouldShowGameOverModal(false);
    setPlayState('review');
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
    gameGoal,
    setGameGoal,
    timeControl,
    setTimeControl,
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
    boardOrientation,
    setBoardOrientation,

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
    playState,
    setPlayState,

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
    startGame,
    undoMove,
    changeGameMode,
    changePlayerColor,
    changeBotElo,
    enterAnalysisMode,
    exitAnalysisMode,
    goToAnalysisPly,
    cloneGame,
    flipBoard,
    resignGame,
    restartGameWithCurrentSettings,
  };

  return <ChessGameContext.Provider value={value}>{children}</ChessGameContext.Provider>;
}
