import { useEffect, useRef } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { getBotMove } from '../services/botService';
import { getSafeFallbackMove } from '../services/heuristicBotEngine';
import { getLegalMoveFromUci, moveToUci } from '../utils/chessMoveValidation';
import { playCaptureSound, playMoveSound } from '../utils/sound';

const BOT_TIMEOUT_MS = 3000;
const DEBUG_BOT_MOVES = (() => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;

  try {
    return window.localStorage?.getItem('debugBotMoves') === '1';
  } catch {
    return false;
  }
})();

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

function playMoveAudio(moveResult) {
  if (!moveResult?.move) return;
  moveResult.move.captured ? playCaptureSound() : playMoveSound();
}

function getFallbackSource(botElo) {
  return botElo <= 800 ? 'fallback_random_weak' : 'fallback_heuristic';
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
  const lastIllegalWarnFenRef = useRef(null);

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

      let moveToPlay = getLegalMoveFromUci(currentGame, result?.move);
      let moveSource = result?.source || 'none';

      if (!moveToPlay) {
        if (result?.move && lastIllegalWarnFenRef.current !== fen) {
          warnBotMove('[BOT] engine move illegal on snapshot, using heuristic fallback', {
            move: result.move,
            source: result.source,
            fen,
            turn: currentGame.turn(),
          });
          lastIllegalWarnFenRef.current = fen;
        }

        const fallbackUci = getSafeFallbackMove(fen, botElo);
        moveToPlay = getLegalMoveFromUci(currentGame, fallbackUci);
        moveSource = fallbackUci ? getFallbackSource(botElo) : 'none';
      }

      if (!moveToPlay) {
        warnBotMove('[BOT] no legal bot move available', { fen });
        return;
      }

      if (currentGame.isGameOver()) {
        debugBotMove('[BOT] game ended before bot could move');
        return;
      }
      if (currentRequestId !== botRequestIdRef.current) {
        debugBotMove('[BOT] request invalidated before applying move');
        return;
      }

      setBotMoveSource(moveSource);

      const moveResult = makeMove(
        moveToPlay.from,
        moveToPlay.to,
        moveToPlay.promotion || 'q',
        { byBot: true, sourceFen: fen }
      );

      if (moveResult?.move) {
        debugBotMove('[BOT] applied move', {
          move: moveToUci(moveToPlay),
          source: moveSource,
          fen,
        });
        playMoveAudio(moveResult);
        return;
      }

      warnBotMove('[BOT] makeMove rejected; bot move skipped', { moveToPlay, sourceFen: fen });
    } catch (error) {
      if (currentRequestId !== botRequestIdRef.current) return;

      if (error.message === 'BOT_TIMEOUT') {
        warnBotMove('[BOT] timeout; using heuristic fallback', { fen, botElo });
        const fallbackUci = getSafeFallbackMove(fen, botElo);
        const fallbackMove = getLegalMoveFromUci(currentGame, fallbackUci);
        if (!fallbackMove) {
          warnBotMove('[BOT] no legal timeout fallback move available', { fen });
          return;
        }

        const moveSource = fallbackUci ? getFallbackSource(botElo) : 'none';

        const fallbackResult = makeMove(
          fallbackMove.from,
          fallbackMove.to,
          fallbackMove.promotion || 'q',
          { byBot: true, sourceFen: fen }
        );

        if (fallbackResult?.move) {
          setBotMoveSource(moveSource);
          debugBotMove('[BOT] applied move', {
            move: moveToUci(fallbackMove),
            source: moveSource,
            fen,
          });
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
