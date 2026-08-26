import { useEffect, useCallback } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';

/**
 * Keyboard shortcuts for chess game:
 * - U: Undo move
 * - H: Get hint
 * - F: Flip board
 * - R: Resign (with confirmation)
 * - Escape: Cancel/hide modals
 * - Space: Toggle analysis mode
 */
export function useKeyboardShortcuts({ onHint, onResign, onNewGame }) {
  const { undoMove, flipBoard, playState } = useChessGame();

  const handleKeyDown = useCallback(
    (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Ignore shortcuts when not playing
      if (playState !== 'playing') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'u':
          e.preventDefault();
          undoMove();
          break;
        case 'h':
          e.preventDefault();
          if (onHint) onHint();
          break;
        case 'f':
          e.preventDefault();
          flipBoard();
          break;
        case 'r':
          e.preventDefault();
          if (onResign) onResign();
          break;
        case 'n':
          e.preventDefault();
          if (onNewGame) onNewGame();
          break;
        case 'escape':
          e.preventDefault();
          // Close any open modals
          document.dispatchEvent(new CustomEvent('close-modal'));
          break;
        default:
          break;
      }
    },
    [undoMove, flipBoard, onHint, onResign, onNewGame, playState]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Hook for global shortcuts (work even outside game)
export function useGlobalKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const action = shortcuts[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        action(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
