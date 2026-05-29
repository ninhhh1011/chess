import { useEffect, useRef } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { getBotMove, uciToMoveObject } from '../services/botService';
import { playCaptureSound, playMoveSound } from '../utils/sound';

const BOT_TIMEOUT_MS = 3000;
const DEBUG_BOT_MOVES = import.meta.env.DEV;

function debugBotMove(...args) {
  if (DEBUG_BOT_MOVES) {
    console.log(...args);
  }
}

function warnBotMove(...args) {
  if (DEBUG_BOT_MOVES) {
    console.warn(...args);
  }
}

function moveToObject(move) {
  if (!move) return null;
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion || undefined,
  };
}

function isSameMove(legalMove, moveObj) {
  const requestedPromotion = moveObj.promotion || undefined;
  const legalPromotion = legalMove.promotion || undefined;

  return (
    legalMove.from === moveObj.from &&
    legalMove.to === moveObj.to &&
    (legalPromotion === requestedPromotion || !legalPromotion)
  );
}

function pickRandomLegalMove(currentGame) {
  const legalMoves = currentGame.moves({ verbose: true });
  if (!legalMoves.length) return null;
  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return moveToObject(randomMove);
}

function getLegalMoveOnSnapshot(currentGame, moveObj, fen) {
  const legalMoves = currentGame.moves({ verbose: true });
  if (!legalMoves.length) return null;

  if (moveObj) {
    const matchingMove = legalMoves.find((legalMove) => isSameMove(legalMove, moveObj));
    if (matchingMove) return moveToObject(matchingMove);

    warnBotMove('[BOT] move is illegal on snapshot, fallback random', { moveObj, fen });
  }

  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return moveToObject(randomMove);
}

function playMoveAudio(moveResult) {
  if (!moveResult?.move) return;
  moveResult.move.captured ? playCaptureSound() : playMoveSound();
}

export function useBotMove() {
  const {
    game,
    gameMode,
    playerColor,
    botElo,
    isBotThinking,
    setIsBotThinking,
    setBotMoveSource,
    botRequestIdRef,
    setBotRequestId,
    pendingPromotion,
    isGameOver,
    makeMove,
    GAME_MODES,
  } = useChessGame();

  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (gameMode !== GAME_MODES.BOT) return;
    if (isGameOver) return;
    if (pendingPromotion) return;

    const botColor = playerColor === 'w' ? 'b' : 'w';
    if (game.turn() !== botColor) return;
    if (game.isGameOver()) return;

    triggerBotMove(game);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameMode, playerColor, isGameOver, pendingPromotion]);

  async function triggerBotMove(currentGame) {
    if (gameMode !== GAME_MODES.BOT) return;
    if (isProcessingRef.current) {
      debugBotMove('[BOT] already processing, skip');
      return;
    }

    const botColor = playerColor === 'w' ? 'b' : 'w';
    if (currentGame.turn() !== botColor) {
      debugBotMove('[BOT] not bot turn, skip', { turn: currentGame.turn(), botColor });
      return;
    }
    if (currentGame.isGameOver()) {
      debugBotMove('[BOT] game over, skip');
      return;
    }

    isProcessingRef.current = true;
    setIsBotThinking(true);
    setBotMoveSource(null);

    botRequestIdRef.current += 1;
    const currentRequestId = botRequestIdRef.current;
    setBotRequestId(currentRequestId);

    const fen = currentGame.fen();
    debugBotMove('[BOT] triggerBotMove called', { fen, turn: currentGame.turn(), botColor, botElo });

    try {
      const result = await Promise.race([
        getBotMove({ fen, botElo }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('BOT_TIMEOUT')), BOT_TIMEOUT_MS)
        ),
      ]);

      if (currentRequestId !== botRequestIdRef.current) {
        debugBotMove('[BOT] stale request, abort', { currentRequestId, latest: botRequestIdRef.current });
        return;
      }

      debugBotMove('[BOT] getBotMove result', result);

      const requestedMove = uciToMoveObject(result?.move);
      const moveObj = getLegalMoveOnSnapshot(currentGame, requestedMove, fen);

      if (!moveObj) {
        warnBotMove('[BOT] no legal bot move available', { fen });
        return;
      }

      setBotMoveSource(requestedMove ? result.source : 'snapshot_random');

      if (currentGame.isGameOver()) {
        debugBotMove('[BOT] game ended before bot could move');
        return;
      }
      if (currentRequestId !== botRequestIdRef.current) {
        debugBotMove('[BOT] request invalidated before applying move');
        return;
      }

      const moveResult = makeMove(
        moveObj.from,
        moveObj.to,
        moveObj.promotion || 'q',
        { byBot: true, sourceFen: fen }
      );

      if (moveResult?.move) {
        playMoveAudio(moveResult);
        return;
      }

      warnBotMove('[BOT] makeMove rejected; bot move skipped', { moveObj, sourceFen: fen });
    } catch (error) {
      if (currentRequestId !== botRequestIdRef.current) return;

      if (error.message === 'BOT_TIMEOUT') {
        console.warn('[BOT] timeout; falling back to random move');
        const fallbackMove = pickRandomLegalMove(currentGame);
        if (!fallbackMove) return;

        const fallbackResult = makeMove(
          fallbackMove.from,
          fallbackMove.to,
          fallbackMove.promotion || 'q',
          { byBot: true, sourceFen: fen }
        );

        if (fallbackResult?.move) {
          setBotMoveSource('timeout_random');
          playMoveAudio(fallbackResult);
        } else {
          warnBotMove('[BOT] timeout fallback move rejected; bot move skipped', { fallbackMove, sourceFen: fen });
        }
      } else {
        console.error('[BOT] error', error);
      }
    } finally {
      isProcessingRef.current = false;
      if (currentRequestId === botRequestIdRef.current) {
        setIsBotThinking(false);
      }
    }
  }

  return { triggerBotMove, isBotThinking };
}
