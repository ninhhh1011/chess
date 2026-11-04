import { useEffect, useRef, useState, useCallback } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useBotMove } from '../hooks/useBotMove';
import { useGameTimer } from '../hooks/useGameTimer';
import { analyzeFen } from '../services/stockfishService';
import { analyzeGame } from '../services/analysis/gameAnalyzer';
import { getAnalysisFactEvidenceId } from '../services/analysis/analysisFact';
import { getSanFromUci } from '../utils/chessMoveUtils';
import { classifyMoveAnnotation } from '../utils/moveQuality';
import { recordGameReview, updateAfterGame, recordPlayedGame, getUserProfile } from '../services/userProfileService';
import { playCheckSound, playVictorySound, playDefeatSound, playDrawSound, playMoveSound, playCaptureSound } from '../utils/sound';
import { recordGameResult } from '../hooks/useGameStats';
import { UI_COPY } from '../config/brand';

const noop = () => {};

import GameLayout from './chess/GameLayout';



export default function ChessGameBoard({ boardOrientation = 'white', flipBoard = noop }) {
  const {
    game,
    activeGame,
    currentFen,
    currentPgn,
    moveHistory,
    isCheck,
    isGameOver,
    analysisMode,
    gameGeneration,
    botElo,
    playerColor,
    pendingLiveMoveAnalysis,
    resolveMoveAnnotation,
    failMoveAnnotation,
    moveAnnotations,
    gameResult,
    claimGameResultRecording,
    enterReview,
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
  const [engineHint, setEngineHint] = useState(null);
  const hintRequestRef = useRef({ id: 0, fen: null, playState: null });
  const manualHintControllerRef = useRef(null);
  const [liveEvalStatus, setLiveEvalStatus] = useState('Đang tải');
  const [showStartNotice, setShowStartNotice] = useState(true);

  // Refs
  const liveAnalysisRequestRef = useRef(0);
  const lastCheckFenRef = useRef(null);
  const gameStartFenRef = useRef(null);
  const botPositionKeyRef = useRef(null);

  useEffect(() => {
    hintRequestRef.current.id += 1;
    manualHintControllerRef.current?.abort();
    manualHintControllerRef.current = null;
    setEngineHint(null);
  }, [currentFen, playState]);

  // Game timer
  const { elapsed: gameTime } = useGameTimer(playState === 'playing');

  // Bot move handler
  const handleBotMoveComplete = useCallback(
    async (result) => {
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
    [activeGame, makeMove]
  );

  // Bot move hook
  const { getMove, cancelMove, isThinking } = useBotMove({
    botElo,
    onMoveComplete: handleBotMoveComplete,
  });

  useEffect(() => {
    if (playState !== 'playing' || analysisMode || isGameOver || currentTurn === playerColor) {
      botPositionKeyRef.current = null;
      cancelMove();
      return;
    }

    const positionKey = `${gameGeneration}:${currentFen}`;

    if (botPositionKeyRef.current === positionKey) return;

    cancelMove();
    botPositionKeyRef.current = positionKey;
    gameStartFenRef.current = currentFen;
    getMove(currentFen);
  }, [playState, currentTurn, playerColor, isGameOver, analysisMode, isThinking, currentFen, gameGeneration, getMove, cancelMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hintRequestRef.current.id += 1;
      manualHintControllerRef.current?.abort();
      manualHintControllerRef.current = null;
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
    if (!analysisMode && isThinking) {
      setLiveEvalStatus(UI_COPY.botThinking);
      return undefined;
    }

    const requestId = liveAnalysisRequestRef.current + 1;
    liveAnalysisRequestRef.current = requestId;
    setLiveEvalStatus('Đang phân tích');

    const controller = new AbortController();
    let cancelled = false;

    const timerId = window.setTimeout(() => {
      analyzeFen({ fen: currentFen, depth: 8, movetime: 400, purpose: 'hint', signal: controller.signal })
        .then((result) => {
          if (cancelled || liveAnalysisRequestRef.current !== requestId) return;
          setLiveAnalysis(result);
          setLiveEvalStatus(result.source?.startsWith('fallback') ? 'Fallback' : 'Live');
        })
        .catch((error) => {
          if (cancelled || liveAnalysisRequestRef.current !== requestId || error?.name === 'AbortError') return;
          setLiveEvalStatus('Lỗi engine');
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [currentFen, analysisMode, isThinking]);

  // Game over handling — only trigger modal for live game, not analysis/replay
  useEffect(() => {
    if (!gameResult) return;
    if (analysisMode) return;

    const currentPgn = game.pgn();
    const gameKey = `${gameGeneration}:${currentPgn}`;
    if (!claimGameResultRecording(gameKey)) return;

    const mistakes = moveHistory.length < 12 ? ['opening_development'] : [];
    const updatedProfile = updateAfterGame({ result: gameResult, movesCount: moveHistory.length, mistakes, botElo });

    // Save full played game archive
    recordPlayedGame({
      pgn: currentPgn,
      result: gameResult,
      botElo,
      playerColor,
      eloDelta: updatedProfile.lastEloDelta || 0,
      movesCount: moveHistory.length,
      timeControl: 'rapid_10',
    });

    // Record game stats
    recordGameResult(gameResult, moveHistory.length, gameTime);

    if (gameResult === 'win') playVictorySound();
    else if (gameResult === 'lose') playDefeatSound();
    else playDrawSound();

    enterReview();
  }, [gameResult, game, gameGeneration, moveHistory.length, analysisMode, claimGameResultRecording, enterReview, gameTime]);

  // Move annotation
  useEffect(() => {
    if (!pendingLiveMoveAnalysis) return;
    const move = pendingLiveMoveAnalysis;
    const controller = new AbortController();
    let cancelled = false;

    async function analyzeLastMove() {
      try {
        const before = await analyzeFen({ fen: move.beforeFen, depth: 8, movetime: 500, purpose: 'annotation', signal: controller.signal });
        if (cancelled || controller.signal.aborted) return;
        const after = await analyzeFen({ fen: move.afterFen, depth: 7, movetime: 400, purpose: 'annotation', signal: controller.signal });
        if (cancelled || controller.signal.aborted) return;

        const annotation = classifyMoveAnnotation({
          before,
          after,
          playedUci: move.playedUci,
          playedSan: move.san,
          color: move.color,
        });

        if (!annotation) {
          failMoveAnnotation(move.requestId);
          return;
        }

        resolveMoveAnnotation(move.requestId, annotation);

        if (!autoAnalyze) return;

        const bestSan = before.bestMove ? getSanFromUci(move.beforeFen, before.bestMove) : 'không rõ';
        if (annotation.symbol === '!!' || annotation.symbol === '!') {
          setAutoComment(`${annotation.symbol} Ninh duyệt ${move.san}. Nước này giữ thế ổn.`);
        } else {
          setAutoComment(`${annotation.symbol} ${annotation.label} Ninh mách ${bestSan} ngon hơn.`);
        }
      } catch (error) {
        if (!cancelled && error?.name !== 'AbortError') {
          failMoveAnnotation(move.requestId);
          if (autoAnalyze) setAutoComment('Ninh chưa mổ được thế này. Thử lại sau vài giây.');
        }
      }
    }

    analyzeLastMove();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pendingLiveMoveAnalysis, autoAnalyze, resolveMoveAnnotation, failMoveAnnotation]);

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
  function onAnalysisRequestStart() {
    manualHintControllerRef.current?.abort();
    manualHintControllerRef.current = null;
    const requestId = hintRequestRef.current.id + 1;
    hintRequestRef.current = { id: requestId, fen: currentFen, playState };
    return requestId;
  }

  function onBestMove(result, requestId) {
    const request = hintRequestRef.current;
    if (
      request.id !== requestId ||
      request.fen !== currentFen ||
      request.playState !== playState ||
      (result?.fen && result.fen !== request.fen)
    ) return;
    if (!result?.bestMove) return;

    setEngineHint({
      bestMove: result.bestMove,
      evaluation: result.evaluation?.display || null,
      fen: request.fen,
      playState: request.playState,
    });
  }

  async function requestHint() {
    const requestId = onAnalysisRequestStart();
    const controller = new AbortController();
    manualHintControllerRef.current = controller;
    try {
      const result = await analyzeFen({ fen: currentFen, depth: 10, movetime: 600, purpose: 'hint', signal: controller.signal });
      if (controller.signal.aborted) return;
      onBestMove(result, requestId);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      // Silent fail - hint is optional
    } finally {
      if (manualHintControllerRef.current === controller) manualHintControllerRef.current = null;
    }
  }

  const visibleEngineHint = engineHint?.fen === currentFen && engineHint?.playState === playState ? engineHint : null;
  const engineMove = parseEngineMove(visibleEngineHint);

  return (
    <GameLayout
      liveAnalysis={liveAnalysis}
      boardOrientation={boardOrientation}
      flipBoard={flipBoard}
      liveEvalStatus={liveEvalStatus}
      engineHint={visibleEngineHint}
      onAnalysisRequestStart={onAnalysisRequestStart}
      onBestMove={onBestMove}
      autoAnalyze={autoAnalyze}
      setAutoAnalyze={setAutoAnalyze}
      autoComment={autoComment}
      review={review}
      isReviewing={isReviewing}
      reviewGameWithEngine={reviewGameWithEngine}
      engineMove={engineMove}
      showStartNotice={showStartNotice}
      isThinking={isThinking}
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
