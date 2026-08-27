import { useCallback } from 'react';

/**
 * useShare - Share game results or position
 */
export function useShare() {
  const shareText = useCallback(async (text, title = 'Ninh Lốp Trưởng Chess') => {
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
        });
        return true;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
        return false;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const shareGameResult = useCallback((result, moves) => {
    const resultText = result === 'win'
      ? '🏆 Chiến thắng!'
      : result === 'lose'
      ? '😔 Thua rồi'
      : '🤝 Hòa';

    const text = `Ninh Lốp Trưởng Chess\n${resultText}\n${moves} nước\n\n#NinhChess #CờVua`;
    return shareText(text, 'Kết quả ván cờ');
  }, [shareText]);

  const sharePosition = useCallback((fen) => {
    const text = `Xem thế cờ này!\nFEN: ${fen}\n\n#NinhChess #CờVua`;
    return shareText(text, 'Thế cờ');
  }, [shareText]);

  return { shareText, shareGameResult, sharePosition };
}
