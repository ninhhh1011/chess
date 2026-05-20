import { useEffect, useRef } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { getBotMove, uciToMoveObject } from '../services/botService';
import { playCaptureSound, playMoveSound } from '../utils/sound';

export function useBotMove() {
  const {
    gameMode,
    playerColor,
    botElo,
    isBotThinking,
    setIsBotThinking,
    setBotMoveSource,
    botRequestIdRef,
    setBotRequestId,
    cloneGame,
    makeMove,
    GAME_MODES,
  } = useChessGame();

  const isProcessingRef = useRef(false);

  async function triggerBotMove(afterPlayerGame) {
    // Guard conditions
    if (gameMode !== GAME_MODES.BOT) return;
    if (afterPlayerGame.turn() === playerColor) return;
    if (afterPlayerGame.isGameOver()) return;
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsBotThinking(true);
    setBotMoveSource(null);

    botRequestIdRef.current += 1;
    const currentRequestId = botRequestIdRef.current;
    setBotRequestId(currentRequestId);

    try {
      const fen = afterPlayerGame.fen();
      const result = await getBotMove({ fen, botElo });

      // Check if request is stale
      if (currentRequestId !== botRequestIdRef.current) {
        isProcessingRef.current = false;
        setIsBotThinking(false);
        return;
      }

      if (!result || !result.move) {
        isProcessingRef.current = false;
        setIsBotThinking(false);
        return;
      }

      setBotMoveSource(result.source);

      // Verify game state hasn't changed
      const botGame = cloneGame(afterPlayerGame);
      if (botGame.isGameOver()) {
        isProcessingRef.current = false;
        setIsBotThinking(false);
        return;
      }

      const moveObj = uciToMoveObject(result.move);
      if (!moveObj) {
        isProcessingRef.current = false;
        setIsBotThinking(false);
        return;
      }

      // Execute bot move
      const moveResult = makeMove(moveObj.from, moveObj.to, moveObj.promotion);
      if (moveResult && moveResult.move) {
        if (moveResult.move.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }

      isProcessingRef.current = false;
      setIsBotThinking(false);
    } catch (error) {
      console.error('[useBotMove] Error:', error);
      isProcessingRef.current = false;
      setIsBotThinking(false);
    }
  }

  return {
    triggerBotMove,
    isBotThinking,
  };
}
