import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { Chess, type Move, type Square, type Color } from 'chess.js';
import { gameSessionReducer, createInitialGameSession, type GameSession } from '../domain/game/gameSession';
import { getPlayerResult, type GameOutcome } from '../domain/game/gameOutcome';
import type { GameEvent, GamePhase } from '../domain/game/gameLifecycle';
import { createReviewSession, getGameRootFen, reviewSessionReducer, type LiveMoveAnalysis, type MoveAnnotation } from '../domain/game/reviewSession';
import {
  createInitialClock,
  startClock,
  tickClock,
  switchTurn,
  pauseClock,
  type DualClockState,
  type TimeControlId,
} from '../domain/clock/chessClock';

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
  gameGeneration: number;
  playerColor: Color;
  botElo: number;
  timeControl: TimeControlId;
  clock: DualClockState;
  PLAYER_COLORS: Record<string, Color>;
  outcome: GameOutcome | null;
  gameResult: ReturnType<typeof getPlayerResult>;
  claimGameResultRecording: (key: string) => boolean;
  playState: GamePhase;
  enterReview: () => void;
  returnToLobby: () => void;
  moveAnnotations: Record<number, { symbol: string; label: string; tone: string }>;
  pendingLiveMoveAnalysis: LiveMoveAnalysis | null;
  resolveMoveAnnotation: (requestId: number, annotation: MoveAnnotation) => void;
  failMoveAnnotation: (requestId: number) => void;
  pendingPromotion: GameSession['pendingPromotion'];
  analysisMode: boolean;
  analysisGame: Chess;
  analysisMainline: string[];
  analysisPly: number;
  makeMove: (from: string, to: string, promotion?: string, options?: { byBot?: boolean; sourceFen?: string | null }) => { move: Move; nextGame: Chess } | false;
  attemptMove: (from: Square, to: Square) => { status: 'promotion_required'; from: Square; to: Square; color: Color } | { status: 'moved'; move: Move; nextGame: Chess } | { status: 'rejected' };
  choosePromotion: (piece: 'q' | 'r' | 'b' | 'n') => { move: Move; nextGame: Chess } | false;
  cancelPromotion: () => void;
  getLegalMoves: (square: Square) => Move[];
  getKingSquare: (color: Color) => Square | null;
  newGame: () => Chess;
  startGame: (options?: { elo?: number; color?: Color; timeControl?: TimeControlId }) => void;
  undoMove: () => Chess | null;
  changePlayerColor: (color: Color) => void;
  changeBotElo: (elo: number) => void;
  enterAnalysisMode: () => void;
  exitAnalysisMode: () => void;
  goToAnalysisPly: (ply: number) => void;
  cloneGame: (sourceGame?: Chess) => Chess;
  resignGame: () => void;
  offerDraw: (currentCentipawns?: number | null) => { accepted: boolean; reason: string };
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
  const [session, dispatchSession] = useReducer(gameSessionReducer, undefined, createInitialGameSession);
  const { game, phase: playState, playerColor, generation: gameGeneration, pendingPromotion, outcome } = session;

  // Bot and game settings
  const [botElo, setBotElo] = useState(1200);
  const [timeControl, setTimeControl] = useState<TimeControlId>('rapid_10');
  const [clock, setClock] = useState<DualClockState>(() => createInitialClock('rapid_10'));

  // Clock countdown ticker
  useEffect(() => {
    if (playState !== 'playing' || outcome !== null) {
      setClock((prev) => (prev.isRunning ? pauseClock(prev) : prev));
      return;
    }

    const intervalId = window.setInterval(() => {
      setClock((prev) => {
        if (!prev.isRunning || prev.isTimeout) return prev;
        const next = tickClock(prev);
        if (next.isTimeout && next.timeoutWinner) {
          dispatchSession({ type: 'TIMEOUT', winner: next.timeoutWinner });
        }
        return next;
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [playState, outcome]);

  // Game status
  const gameResultRecordingKeyRef = useRef<string | null>(null);

  const claimGameResultRecording = useCallback((key: string) => {
    if (gameResultRecordingKeyRef.current === key) return false;
    gameResultRecordingKeyRef.current = key;
    return true;
  }, []);

  // Move annotations
  const moveAnnotationRequestIdRef = useRef(0);

  // Analysis mode
  const [reviewSession, dispatchReviewSession] = useReducer(reviewSessionReducer, undefined, createReviewSession);
  const { game: analysisGame, mainline: analysisMainline, ply: analysisPly } = reviewSession;
  const { annotations: moveAnnotations, pendingLiveMoveAnalysis } = reviewSession;

  const resolveMoveAnnotation = useCallback((requestId: number, annotation: MoveAnnotation) => {
    dispatchReviewSession({ type: 'LIVE_MOVE_ANALYZED', requestId, annotation });
  }, []);

  const failMoveAnnotation = useCallback((requestId: number) => {
    dispatchReviewSession({ type: 'LIVE_MOVE_FAILED', requestId });
  }, []);

  function dispatchGameEvent(event: GameEvent) {
    dispatchSession({ type: 'EVENT', event });
  }

  // Derived state
  const analysisMode = playState === 'analysis';
  const activeGame = analysisMode ? analysisGame : game;
  const currentFen = activeGame.fen();
  const currentPgn = activeGame.pgn();
  const currentTurn = activeGame.turn();
  const moveHistory = activeGame.history();
  const isCheck = activeGame.isCheck();
  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isGameOver = analysisMode ? activeGame.isGameOver() : outcome !== null;
  const gameResult = getPlayerResult(outcome, playerColor);

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
  function makeMove(from: string, to: string, promotion?: string, options: { byBot?: boolean; sourceFen?: string | null } = {}): { move: Move; nextGame: Chess } | false {
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
      if (!byBot && currentTurn !== playerColor) {
        return failMove('not player turn', { currentTurn, playerColor });
      }
      if (byBot && currentTurn === playerColor) {
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

    if (isPromotion && !promotion) {
      return failMove('promotion choice required', { from, to });
    }

    const safePromotion = promotion;

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

    dispatchSession({ type: 'PROMOTION_CANCELLED' });

    // Update game state
    if (analysisMode) {
      dispatchReviewSession({ type: 'POSITION_REPLACED', game: nextGame });
    } else {
      const moveIndex = nextGame.history().length - 1;
      const playedUci = `${move.from}${move.to}${move.promotion || ''}`;

      dispatchSession({ type: 'MOVE_COMMITTED', game: nextGame });
      setClock((prev) => switchTurn(prev, nextGame.turn()));
      moveAnnotationRequestIdRef.current += 1;
      dispatchReviewSession({ type: 'LIVE_MOVE_PENDING', requestId: moveAnnotationRequestIdRef.current, move: {
        beforeFen,
        afterFen: nextGame.fen(),
        playedUci,
        moveIndex,
        color: move.color,
        san: move.san,
      } });

    }

    return { move, nextGame };
  }

  function attemptMove(from: Square, to: Square) {
    if (isGameOver || (!analysisMode && currentTurn !== playerColor)) {
      return { status: 'rejected' as const };
    }

    const legalMove = getLegalMoves(from).find((move) => move.to === to);
    if (!legalMove) return { status: 'rejected' as const };

    if (legalMove.promotion) {
      const promotion = { from, to, color: activeGame.turn() };
      dispatchSession({ type: 'PROMOTION_REQUESTED', promotion });
      return { status: 'promotion_required' as const, ...promotion };
    }

    const result = makeMove(from, to);
    return result ? { status: 'moved' as const, ...result } : { status: 'rejected' as const };
  }

  function choosePromotion(piece: 'q' | 'r' | 'b' | 'n') {
    if (!pendingPromotion || !['q', 'r', 'b', 'n'].includes(piece)) return false;
    return makeMove(pendingPromotion.from, pendingPromotion.to, piece);
  }

  function cancelPromotion() {
    dispatchSession({ type: 'PROMOTION_CANCELLED' });
  }

  function newGame() {
    const freshGame = new Chess();
    gameResultRecordingKeyRef.current = null;
    dispatchSession({ type: 'RESET_POSITION', game: freshGame });
    dispatchReviewSession({ type: 'RESET' });

    return freshGame;
  }

  function startGame(options: { elo?: number; color?: Color; timeControl?: TimeControlId } = {}) {
    const { elo = 1200, color = PLAYER_COLORS.WHITE, timeControl: tc = 'rapid_10' } = options;
    setBotElo(elo ?? 1200);
    setTimeControl(tc);
    const freshGame = newGame();
    dispatchSession({ type: 'START_GAME', game: freshGame, playerColor: color ?? PLAYER_COLORS.WHITE });
    const freshClock = createInitialClock(tc);
    setClock(startClock(freshClock, 'w'));
  }

  function restartGameWithCurrentSettings() {
    const freshGame = newGame();
    dispatchSession({ type: 'START_GAME', game: freshGame, playerColor });
    const freshClock = createInitialClock(timeControl);
    setClock(startClock(freshClock, 'w'));
  }

  function offerDraw(currentCentipawns: number | null = null) {
    if (playState !== 'playing' || outcome !== null) {
      return { accepted: false, reason: 'Ván cờ chưa bắt đầu.' };
    }
    const moves = activeGame.history();
    if (moves.length < 20) {
      return { accepted: false, reason: 'Ván cờ mới bắt đầu (dưới 20 nước), Quân sư Ninh muốn tiếp tục thi đấu!' };
    }
    const cp = currentCentipawns ?? 0;
    if (Math.abs(cp) <= 75) {
      dispatchSession({ type: 'OFFER_DRAW_ACCEPTED' });
      return { accepted: true, reason: 'Thế cờ cân bằng, Quân sư Ninh đồng ý hòa cờ!' };
    }
    return {
      accepted: false,
      reason: cp > 75
        ? 'Quân sư Ninh đang chiếm ưu thế nên từ chối lời đề nghị hòa!'
        : 'Thế cờ còn nhiều cơ hội, Quân sư Ninh muốn đấu tiếp!',
    };
  }

  function undoMove() {
    if (analysisMode) {
      dispatchSession({ type: 'PROMOTION_CANCELLED' });
      const nextGame = cloneGame(analysisGame);
      nextGame.undo();
      dispatchReviewSession({ type: 'POSITION_REPLACED', game: nextGame });

      return nextGame;
    }

    const nextGame = cloneGame();
    const lastMove = nextGame.history({ verbose: true }).at(-1) as Move | undefined;
    if (lastMove?.color !== playerColor) {
      nextGame.undo();
    }

    const previousMove = nextGame.history({ verbose: true }).at(-1) as Move | undefined;
    if (previousMove?.color === playerColor) {
      nextGame.undo();
    }

    if (!nextGame.isGameOver()) gameResultRecordingKeyRef.current = null;

    dispatchSession({ type: 'UNDO', game: nextGame });

    dispatchReviewSession({ type: 'TRIM_ANNOTATIONS', retainedPly: nextGame.history().length });
    return nextGame;
  }

  function changePlayerColor(color: Color) {
    dispatchSession({ type: 'SET_PLAYER_COLOR', playerColor: color });
    newGame();
  }

  function changeBotElo(elo: number) {
    setBotElo(elo);
  }

  function enterAnalysisMode() {
    const mainline = game.history();
    const analysisCopy = cloneGame(game);
    dispatchReviewSession({ type: 'ENTER', game: analysisCopy, mainline, rootFen: getGameRootFen(game) });

    dispatchGameEvent('ENTER_ANALYSIS');
  }

  function exitAnalysisMode() {
    dispatchReviewSession({ type: 'EXIT' });

    dispatchGameEvent('EXIT_ANALYSIS');
  }

  function goToAnalysisPly(ply: number) {
    dispatchSession({ type: 'PROMOTION_CANCELLED' });
    dispatchReviewSession({ type: 'NAVIGATE', ply });
  }

  function resignGame() {
    if (playState !== 'playing') return;
    dispatchGameEvent('RESIGN');
    dispatchGameEvent('ENTER_REVIEW');
  }

  function enterReview() {
    dispatchGameEvent('GAME_END');
    dispatchGameEvent('ENTER_REVIEW');
  }

  function returnToLobby() {
    newGame();
    dispatchGameEvent('RESET');
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
    gameGeneration,

    // Game mode
    playerColor,
    botElo,
    timeControl,
    clock,
    PLAYER_COLORS,

    // Status
    outcome,
    gameResult,
    claimGameResultRecording,
    playState,
    enterReview,
    returnToLobby,

    // Annotations
    moveAnnotations,
    pendingLiveMoveAnalysis,
    resolveMoveAnnotation,
    failMoveAnnotation,

    // Promotion
    pendingPromotion,

    // Analysis mode
    analysisMode,
    analysisGame,
    analysisMainline,
    analysisPly,

    // Actions
    makeMove,
    attemptMove,
    choosePromotion,
    cancelPromotion,
    getLegalMoves,
    getKingSquare,
    newGame,
    startGame,
    undoMove,
    changePlayerColor,
    changeBotElo,
    enterAnalysisMode,
    exitAnalysisMode,
    goToAnalysisPly,
    cloneGame,
    resignGame,
    offerDraw,
    restartGameWithCurrentSettings,
  };

  return <ChessGameContext.Provider value={value}>{children}</ChessGameContext.Provider>;
}
