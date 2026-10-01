import { useEffect, useRef, useState, useCallback } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useBotMove } from '../hooks/useBotMove';
import { useGameTimer } from '../hooks/useGameTimer';
import { analyzeFen } from '../services/stockfishService';
import { analyzeGame } from '../services/analysis/gameAnalyzer';
import { getAnalysisFactEvidenceId } from '../services/analysis/analysisFact';
import { getSanFromUci } from '../utils/chessMoveUtils';
import { classifyMoveAnnotation } from '../utils/moveQuality';
import { recordGameReview, updateAfterGame } from '../services/userProfileService';
import { playCheckSound, playVictorySound, playDefeatSound, playDrawSound, playMoveSound, playCaptureSound } from '../utils/sound';
import { recordGameResult } from '../hooks/useGameStats';
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
    botRequestId,
    botRequestIdRef,
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
    goToAnalysisPly,
  } = useChessGame();

  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [autoComment, setAutoComment] = useState('');
  const [review, setReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [liveEvalStatus, setLiveEvalStatus] = useState('Đang tải');
  const [showStartNotice, setShowStartNotice] = useState(true);

  // Refs
  const liveAnalysisRequestRef = useRef(0);
  const lastCheckFenRef = useRef(null);
  const gameStartFenRef = useRef(null);
  const botPositionKeyRef = useRef(null);

  // Game timer
  const { elapsed: gameTime } = useGameTimer(playState === 'playing');

  // Bot move handler
  const handleBotMoveStart = useCallback(() => {
    setIsBotThinking(true);
  }, [setIsBotThinking]);

  const handleBotMoveComplete = useCallback(
    async (result, responseGameGenId) => {
      setIsBotThinking(false);

      // Check if this response is from the current game
      if (responseGameGenId !== botRequestIdRef.current) {
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
    [activeGame, botRequestIdRef, makeMove, setIsBotThinking]
  );

  // Bot move hook
  const { getMove, cancelMove } = useBotMove({
    botElo,
    onMoveStart: handleBotMoveStart,
    onMoveComplete: handleBotMoveComplete,
  });

  const previousBotRequestIdRef = useRef(botRequestId);
  useEffect(() => {
    if (previousBotRequestIdRef.current === botRequestId) return;
    previousBotRequestIdRef.current = botRequestId;
    botPositionKeyRef.current = null;
    cancelMove();
  }, [botRequestId, cancelMove]);

  // Trigger bot move when it's bot's turn
  useEffect(() => {
    // Skip in analysis mode, when game is over, or if not bot mode
    if (analysisMode || isGameOver || gameMode !== GAME_MODES.BOT) {
      return;
    }

    // It's bot's turn if the current turn doesn't match player's color
    const isBotTurn = currentTurn !== playerColor;

    const positionKey = `${botRequestId}:${currentFen}`;

    if (isBotTurn && !isBotThinking && botPositionKeyRef.current !== positionKey) {
      botPositionKeyRef.current = positionKey;
      gameStartFenRef.current = currentFen;
      getMove(currentFen, botRequestId);
    }
  }, [currentTurn, playerColor, isGameOver, analysisMode, gameMode, GAME_MODES.BOT, isBotThinking, currentFen, botRequestId, getMove]);

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
      const isPlayerWin = isCheckmate && ((game.turn() === 'w' && playerColor === 'black') || (game.turn() === 'black' && playerColor === 'white'));
      const result = isCheckmate ? (isPlayerWin ? 'win' : 'lose') : 'draw';
      const mistakes = moveHistory.length < 12 ? ['opening_development'] : [];
      updateAfterGame({ result, movesCount: moveHistory.length, mistakes });
      setRecordedGamePgn(currentPgn);

      // Record game stats
      recordGameResult(result, moveHistory.length, gameTime);

      // Play appropriate sound
      if (isCheckmate) {
        if (isPlayerWin) {
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
  }, [isGameOver, game, recordedGamePgn, moveHistory.length, analysisMode, setResultNotice, setRecordedGamePgn, setPlayState, playerColor, gameTime]);

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
    if (!moveHistory.length) return;

    setIsReviewing(true);

    try {
      const gameId = `game:${globalThis.crypto.randomUUID()}`;
      const analysis = await analyzeGame({
        gameId,
        pgn: currentPgn || game.pgn(),
        playerSide: playerColor,
        options: { maxDepth: 10, movetimeMs: 450, multiPv: 1, analyzeTopMistakes: 3 },
      });
      const counts = { good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
      const topMistakes = analysis.topMistakes
        .map(ply => analysis.analysis.find(fact => fact.ply === Number(ply)))
        .filter(Boolean);

      topMistakes.forEach((fact) => { counts[fact.classification] += 1; });
      counts.good = analysis.summary.totalMoves - topMistakes.length;
      const worstMoves = topMistakes.map(fact => ({
        evidenceId: getAnalysisFactEvidenceId(fact),
        engineSource: fact.engine.source,
        skillTags: fact.skillTags,
        turn: fact.turn,
        centipawnLoss: fact.centipawnLoss,
        evalBefore: `${fact.evalBefore.type}:${fact.evalBefore.value}`,
        evalAfter: `${fact.evalAfter.type}:${fact.evalAfter.value}`,
        index: fact.ply - 1,
        playedUci: fact.playedMove.uci,
        bestUci: fact.bestMove.uci,
        playedSan: fact.playedMove.san,
        bestSan: fact.bestMove.san || 'không rõ',
        classification: {
          type: fact.classification,
          label: fact.classification === 'blunder' ? 'Blunder' : fact.classification === 'mistake' ? 'Sai lầm' : 'Thiếu chính xác',
          loss: (fact.centipawnLoss || 0) / 100,
        },
      }));

      if (topMistakes.length) {
        recordGameReview({
          reviewId: `review:${globalThis.crypto.randomUUID()}`,
          gameId: analysis.gameId,
          facts: topMistakes,
        });
      }

      setReview({
        total: analysis.summary.totalMoves,
        counts,
        worstMoves,
        analysis: analysis.analysis,
        topMistakes: analysis.topMistakes,
        playerSide: analysis.playerSide || playerColor,
        focusedPly: null,
        focusedEvidenceId: null,
      });
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
      onReviewFact={(item) => {
        setReview((current) => current ? {
          ...current,
          focusedPly: item.index + 1,
          focusedEvidenceId: item.evidenceId,
        } : current);
        goToAnalysisPly(item.index + 1);
      }}
    />
  );
}
