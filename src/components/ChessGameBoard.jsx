import { useEffect, useRef, useState, useCallback } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useBotMove } from '../hooks/useBotMove';
import { analyzeFen } from '../services/stockfishService';
import { getSanFromUci, classifyMoveLoss } from '../utils/chessMoveUtils';
import { classifyMoveAnnotation } from '../utils/moveQuality';
import { addMistake, updateAfterGame } from '../services/userProfileService';
import { playCheckSound, playVictorySound, playDefeatSound, playDrawSound, playMoveSound, playCaptureSound } from '../utils/sound';
import { BRAND_NAMES, UI_COPY } from '../config/brand';

import GameLayout from './chess/GameLayout';



export default function ChessGameBoard() {
  const {
    game,
    activeGame,
    currentFen,
    currentPgn,
    moveHistory,
    isCheck,
    isGameOver,
    analysisMode,
    isBotThinking,
    setIsBotThinking,
    botElo,
    playerColor,
    gameMode,
    engineHint,
    setEngineHint,
    lastMoveFenPair,
    setLastMoveFenPair,
    moveAnnotations,
    setMoveAnnotations,
    resultNotice,
    setResultNotice,
    recordedGamePgn,
    setRecordedGamePgn,
    setShouldShowGameOverModal,
    setPlayState,
    GAME_MODES,
    makeMove,
    currentTurn,
    playState,
  } = useChessGame();

  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [autoComment, setAutoComment] = useState('');
  const [review, setReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [liveEvalStatus, setLiveEvalStatus] = useState('Đang tải');
  const [showStartNotice, setShowStartNotice] = useState(true);

  // Game generation ID - incremented on new game to invalidate old requests
  const [gameGenId, setGameGenId] = useState(0);
  const gameGenIdRef = useRef(0);

  // Refs
  const liveAnalysisRequestRef = useRef(0);
  const lastCheckFenRef = useRef(null);
  const gameStartFenRef = useRef(null);
  const isBotTurnRef = useRef(false);
  const lastMoveCountRef = useRef(0);

  // Track playState changes to detect new game
  const prevPlayStateRef = useRef(playState);

  // Bot move handler
  const handleBotMoveStart = useCallback(() => {
    setIsBotThinking(true);
  }, [setIsBotThinking]);

  const handleBotMoveComplete = useCallback(
    async (result, responseGameGenId) => {
      setIsBotThinking(false);

      // Check if this response is from the current game
      if (responseGameGenId !== gameGenIdRef.current) {
        // This is a stale response from an old game - ignore it
        return;
      }

      if (!result?.move) {
        // Bot failed - skip silently
        return;
      }

      // Cancel if game ended while bot was thinking
      if (activeGame.isGameOver()) {
        return;
      }

      // Make the bot's move and play sound
      const moveResult = makeMove(result.move.slice(0, 2), result.move.slice(2, 4), result.move[4] || 'q', {
        byBot: true,
        sourceFen: gameStartFenRef.current,
      });

      // Play sound for bot's move
      if (moveResult?.move) {
        if (moveResult.move.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }
    },
    [activeGame, makeMove, setIsBotThinking]
  );

  // Bot move hook
  const { getMove, cancelMove } = useBotMove({
    botElo,
    onMoveStart: handleBotMoveStart,
    onMoveComplete: handleBotMoveComplete,
  });

  // Detect new game - increment game generation ID
  useEffect(() => {
    if (prevPlayStateRef.current === 'playing' && playState !== 'playing') {
      // Game ended or left
    }
    if (prevPlayStateRef.current !== 'lobby' && playState === 'lobby') {
      // Returned to lobby - increment gen ID
      gameGenIdRef.current += 1;
      setGameGenId(gameGenIdRef.current);
    }
    prevPlayStateRef.current = playState;
  }, [playState]);

  // Also increment on newGame
  useEffect(() => {
    if (moveHistory.length === 0 && lastMoveCountRef.current > 0) {
      // Move count went back to 0 (new game started)
      gameGenIdRef.current += 1;
      setGameGenId(gameGenIdRef.current);
    }
    lastMoveCountRef.current = moveHistory.length;
  }, [moveHistory.length]);

  // Trigger bot move when it's bot's turn
  useEffect(() => {
    // Skip in analysis mode, when game is over, or if not bot mode
    if (analysisMode || isGameOver || gameMode !== GAME_MODES.BOT) {
      return;
    }

    // It's bot's turn if the current turn doesn't match player's color
    const isBotTurn = currentTurn !== playerColor;

    // Check if this is a new turn (player just moved) by comparing move count
    const didPlayerJustMove = moveHistory.length > lastMoveCountRef.current;

    // If it's bot's turn and not already thinking
    if (isBotTurn && !isBotThinking) {
      // Check if this is a valid trigger (player moved, or initial position)
      const isInitialPosition = moveHistory.length === 0 && !isBotTurnRef.current;

      if (didPlayerJustMove || isInitialPosition) {
        isBotTurnRef.current = true;
        gameStartFenRef.current = currentFen;
        // Pass current gameGenId so callback can validate
        getMove(currentFen, gameGenIdRef.current);
      }
    } else if (!isBotTurn) {
      isBotTurnRef.current = false;
    }
  }, [currentTurn, playerColor, isGameOver, analysisMode, gameMode, GAME_MODES.BOT, isBotThinking, currentFen, moveHistory.length, getMove]);

  // Cancel bot move on game state changes
  useEffect(() => {
    if (isBotThinking && (isGameOver || analysisMode)) {
      cancelMove();
    }
  }, [isGameOver, analysisMode, isBotThinking, cancelMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelMove();
    };
  }, [cancelMove]);

  // Check sound effect
  useEffect(() => {
    if (!isCheck) {
      lastCheckFenRef.current = null;
      return;
    }

    const currentCheckFen = currentFen;
    if (lastCheckFenRef.current === currentCheckFen) return;

    lastCheckFenRef.current = currentCheckFen;
    playCheckSound();
  }, [isCheck, currentFen]);

  // Live analysis
  useEffect(() => {
    if (!analysisMode && isBotThinking) {
      setLiveEvalStatus(UI_COPY.botThinking);
      return undefined;
    }

    const requestId = liveAnalysisRequestRef.current + 1;
    liveAnalysisRequestRef.current = requestId;
    setLiveEvalStatus('Đang phân tích');

    const timerId = window.setTimeout(() => {
      analyzeFen({ fen: currentFen, depth: 8, movetime: 400, purpose: 'hint' })
        .then((result) => {
          if (liveAnalysisRequestRef.current !== requestId) return;
          setLiveAnalysis(result);
          setLiveEvalStatus(result.source?.startsWith('fallback') ? 'Fallback' : 'Live');
        })
        .catch(() => {
          if (liveAnalysisRequestRef.current !== requestId) return;
          setLiveEvalStatus('Lỗi engine');
        });
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [currentFen, analysisMode, isBotThinking]);

  // Game over handling — only trigger modal for live game, not analysis/replay
  useEffect(() => {
    if (analysisMode) return;
    if (!isGameOver) {
      return;
    }

    const currentPgn = game.pgn();
    if (recordedGamePgn !== currentPgn) {
      const isCheckmate = game.isCheckmate();
      const result = isCheckmate ? (game.turn() === 'w' ? 'black_win' : 'white_win') : 'draw';
      const mistakes = moveHistory.length < 12 ? ['opening_development'] : [];
      updateAfterGame({ result, movesCount: moveHistory.length, mistakes });
      setRecordedGamePgn(currentPgn);

      // Play appropriate sound
      if (isCheckmate) {
        // Determine if player won
        const winner = game.turn() === 'w' ? 'black' : 'white';
        const playerSide = playerColor === 'white' ? 'white' : 'black';
        if (winner === playerSide) {
          playVictorySound();
        } else {
          playDefeatSound();
        }
      } else {
        playDrawSound();
      }
    }

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Đen' : 'Trắng';
      setResultNotice(`${winner} thắng trước ${BRAND_NAMES.bot}.`);
      setPlayState('review');
      return;
    }

    setResultNotice('Ván cờ hòa!');
    setPlayState('review');
  }, [isGameOver, game, recordedGamePgn, moveHistory.length, analysisMode, setResultNotice, setRecordedGamePgn, setPlayState, playerColor]);

  // Move annotation
  useEffect(() => {
    if (!lastMoveFenPair) return;
    let cancelled = false;

    async function analyzeLastMove() {
      try {
        const before = await analyzeFen({ fen: lastMoveFenPair.beforeFen, depth: 8, movetime: 500, purpose: 'annotation' });
        if (cancelled) return;
        const after = await analyzeFen({ fen: lastMoveFenPair.afterFen, depth: 7, movetime: 400, purpose: 'annotation' });
        if (cancelled) return;

        const annotation = classifyMoveAnnotation({
          before,
          after,
          playedUci: lastMoveFenPair.playedUci,
          playedSan: lastMoveFenPair.san,
          color: lastMoveFenPair.color,
        });

        setMoveAnnotations((current) => ({
          ...current,
          [lastMoveFenPair.moveIndex]: annotation,
        }));

        if (!autoAnalyze) return;

        const bestSan = before.bestMove ? getSanFromUci(lastMoveFenPair.beforeFen, before.bestMove) : 'không rõ';
        if (annotation.symbol === '!!' || annotation.symbol === '!') {
          setAutoComment(`${annotation.symbol} Ninh duyệt ${lastMoveFenPair.san}. Nước này giữ thế ổn.`);
        } else {
          setAutoComment(`${annotation.symbol} ${annotation.label} Ninh mách ${bestSan} ngon hơn.`);
        }
      } catch {
        if (!cancelled) {
          setMoveAnnotations((current) => ({
            ...current,
            [lastMoveFenPair.moveIndex]: { symbol: '...', label: 'Chưa phân tích được', tone: 'pending' },
          }));
          if (autoAnalyze) setAutoComment('Ninh chưa mổ được thế này. Thử lại sau vài giây.');
        }
      }
    }

    analyzeLastMove();
    return () => {
      cancelled = true;
    };
  }, [lastMoveFenPair, autoAnalyze, setMoveAnnotations]);

  // Game review
  async function reviewGameWithEngine() {
    const moves = game.history({ verbose: true }).slice(-12);
    if (!moves.length) return;

    setIsReviewing(true);
    const replay = new (await import('chess.js')).Chess();
    const results = [];

    try {
      for (let index = 0; index < moves.length; index += 1) {
        const beforeFen = replay.fen();
        const played = moves[index];
        const before = await analyzeFen({ fen: beforeFen, depth: 6, movetime: 450, purpose: 'review' });
        replay.move(played.san);
        const after = await analyzeFen({ fen: replay.fen(), depth: 5, movetime: 350, purpose: 'review' });
        const classification = classifyMoveLoss(before.evaluation, after.evaluation);
        const bestSan = before.bestMove ? getSanFromUci(beforeFen, before.bestMove) : 'không rõ';
        results.push({ index, playedSan: played.san, bestSan, classification });
      }

      const counts = { good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
      results.forEach((item) => {
        counts[item.classification.type] = (counts[item.classification.type] || 0) + 1;
      });
      const worstMoves = results.filter((item) => item.classification.type !== 'good').slice(-3);

      if (counts.blunder) addMistake('engine_blunder');
      if (counts.mistake || counts.inaccuracy) addMistake('engine_mistake');

      setReview({ total: results.length, counts, worstMoves });
    } finally {
      setIsReviewing(false);
    }
  }

  // Parse engine move for display
  function parseEngineMove(hint) {
    if (!hint?.bestMove || !hint?.fen) return null;
    const uci = hint.bestMove;
    if (uci.length < 4) return null;

    return {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : '',
      san: getSanFromUci(hint.fen, uci),
    };
  }

  // Request hint - analyzes position and sets engine hint
  async function requestHint() {
    try {
      const result = await analyzeFen({ fen: currentFen, depth: 10, movetime: 600, purpose: 'hint' });
      if (result?.bestMove) {
        setEngineHint({
          bestMove: result.bestMove,
          evaluation: result.evaluation?.display || null,
        });
      }
    } catch {
      // Silent fail - hint is optional
    }
  }

  const engineMove = parseEngineMove(engineHint);

  return (
    <GameLayout
      liveAnalysis={liveAnalysis}
      liveEvalStatus={liveEvalStatus}
      engineHint={engineHint}
      setEngineHint={setEngineHint}
      autoAnalyze={autoAnalyze}
      setAutoAnalyze={setAutoAnalyze}
      autoComment={autoComment}
      review={review}
      isReviewing={isReviewing}
      reviewGameWithEngine={reviewGameWithEngine}
      engineMove={engineMove}
      showStartNotice={showStartNotice}
      onRequestHint={requestHint}
    />
  );
}
