import { useEffect, useRef } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { getBotMove, uciToMoveObject } from '../services/botService';
import { playCaptureSound, playMoveSound } from '../utils/sound';

const BOT_TIMEOUT_MS = 3000; // 3 giây – nếu Stockfish chậm thì fallback

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

  // Tự động trigger bot sau mỗi lần game state thay đổi
  useEffect(() => {
    if (gameMode !== GAME_MODES.BOT) return;
    if (isGameOver) return;
    if (pendingPromotion) return; // Đợi người chơi chọn quân phong cấp

    const botColor = playerColor === 'w' ? 'b' : 'w';
    if (game.turn() !== botColor) return; // Chưa đến lượt bot
    if (game.isGameOver()) return;

    // Trigger bot move
    triggerBotMove(game);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameMode, playerColor, isGameOver, pendingPromotion]);

  async function triggerBotMove(currentGame) {
    if (gameMode !== GAME_MODES.BOT) return;
    if (isProcessingRef.current) {
      console.log('[BOT] already processing, skip');
      return;
    }

    const botColor = playerColor === 'w' ? 'b' : 'w';
    if (currentGame.turn() !== botColor) {
      console.log('[BOT] not bot turn, skip', { turn: currentGame.turn(), botColor });
      return;
    }
    if (currentGame.isGameOver()) {
      console.log('[BOT] game over, skip');
      return;
    }

    isProcessingRef.current = true;
    setIsBotThinking(true);
    setBotMoveSource(null);

    // Tăng requestId để huỷ request cũ nếu newGame được gọi
    botRequestIdRef.current += 1;
    const currentRequestId = botRequestIdRef.current;
    setBotRequestId(currentRequestId);

    const fen = currentGame.fen();
    console.log('[BOT] triggerBotMove called', { fen, turn: currentGame.turn(), botColor, botElo });

    try {
      // Race giữa getBotMove và timeout 3s
      const result = await Promise.race([
        getBotMove({ fen, botElo }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('BOT_TIMEOUT')), BOT_TIMEOUT_MS)
        ),
      ]);

      // Kiểm tra request còn hợp lệ không (newGame có thể đã được gọi)
      if (currentRequestId !== botRequestIdRef.current) {
        console.log('[BOT] stale request, abort', { currentRequestId, latest: botRequestIdRef.current });
        return;
      }

      console.log('[BOT] getBotMove result', result);

      if (!result?.move) {
        console.warn('[BOT] no move returned');
        return;
      }

      setBotMoveSource(result.source);

      const moveObj = uciToMoveObject(result.move);
      console.log('[BOT] moveObj', moveObj);

      if (!moveObj) {
        console.warn('[BOT] invalid moveObj from UCI', result.move);
        return;
      }

      // Kiểm tra lại game chưa kết thúc và request vẫn valid
      if (currentGame.isGameOver()) {
        console.log('[BOT] game ended before bot could move');
        return;
      }
      if (currentRequestId !== botRequestIdRef.current) {
        console.log('[BOT] request invalidated before applying move');
        return;
      }

      // Apply bot move với byBot = true để bypass guards
      const moveResult = makeMove(
        moveObj.from,
        moveObj.to,
        moveObj.promotion || 'q',
        { byBot: true }
      );

      console.log('[BOT] makeMove result', moveResult);

      if (moveResult && moveResult.move) {
        moveResult.move.captured ? playCaptureSound() : playMoveSound();
      } else {
        console.warn('[BOT] makeMove returned false – move may be illegal', moveObj);
      }
    } catch (error) {
      if (currentRequestId !== botRequestIdRef.current) return; // newGame already called
      if (error.message === 'BOT_TIMEOUT') {
        console.warn('[BOT] timeout – falling back to random move');
        // Fallback: random legal move
        const moves = currentGame.moves({ verbose: true });
        if (moves.length > 0 && currentRequestId === botRequestIdRef.current) {
          const rnd = moves[Math.floor(Math.random() * moves.length)];
          const fallbackResult = makeMove(rnd.from, rnd.to, rnd.promotion || 'q', { byBot: true });
          if (fallbackResult?.move) {
            fallbackResult.move.captured ? playCaptureSound() : playMoveSound();
          }
        }
      } else {
        console.error('[BOT] error', error);
      }
    } finally {
      // Luôn reset, kể cả khi có lỗi – tránh kẹt isBotThinking = true
      if (currentRequestId === botRequestIdRef.current) {
        isProcessingRef.current = false;
        setIsBotThinking(false);
      } else {
        // newGame đã clear, chỉ reset local flag
        isProcessingRef.current = false;
      }
    }
  }

  return { triggerBotMove, isBotThinking };
}
