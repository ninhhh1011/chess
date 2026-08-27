import { useEffect, useCallback } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';

/**
 * Keyboard navigation for chess board
 * - Arrow keys: move selection around the board
 * - Enter/Space: select piece or execute move
 * - Escape: deselect
 * - Tab: cycle through legal moves
 */
export function useKeyboardNavigation() {
  const {
    activeGame,
    selectedSquare,
    moveHints,
    selectSquare,
    makeMove,
    clearSelection,
    gameMode,
    playerColor,
    isBotThinking,
    isGameOver,
    playState,
    GAME_MODES,
  } = useChessGame();

  const getSquareFromIndex = useCallback((file, rank) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return files[file] + ranks[rank];
  }, []);

  const getIndexFromSquare = useCallback((square) => {
    if (!square) return null;
    const file = square.charCodeAt(0) - 97; // 'a' = 0
    const rank = 8 - parseInt(square[1]); // '8' = 0, '1' = 7
    return { file, rank };
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Only work during gameplay
    if (playState !== 'playing' || isBotThinking || isGameOver) return;

    // In bot mode, only respond when it's player's turn
    if (gameMode === GAME_MODES.BOT && activeGame.turn() !== playerColor) return;

    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const { key } = e;

    // Get current position
    let currentFile = null;
    let currentRank = null;
    if (selectedSquare) {
      const idx = getIndexFromSquare(selectedSquare);
      if (idx) {
        currentFile = idx.file;
        currentRank = idx.rank;
      }
    }

    // Arrow key navigation
    if (key === 'ArrowUp') {
      e.preventDefault();
      if (selectedSquare) {
        const newRank = Math.min(7, currentRank + 1);
        selectSquare(getSquareFromIndex(currentFile, newRank));
      }
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      if (selectedSquare) {
        const newRank = Math.max(0, currentRank - 1);
        selectSquare(getSquareFromIndex(currentFile, newRank));
      }
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      if (selectedSquare) {
        const newFile = Math.max(0, currentFile - 1);
        selectSquare(getSquareFromIndex(newFile, currentRank));
      }
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      if (selectedSquare) {
        const newFile = Math.min(7, currentFile + 1);
        selectSquare(getSquareFromIndex(newFile, currentRank));
      }
    } else if (key === 'Escape') {
      e.preventDefault();
      clearSelection();
    } else if ((key === 'Enter' || key === ' ') && selectedSquare) {
      e.preventDefault();

      // If selected square has legal moves, try to execute first one
      const hints = Object.keys(moveHints);
      if (hints.length > 0) {
        const targetSquare = hints[0];
        const result = makeMove(selectedSquare, targetSquare);
        if (result) {
          clearSelection();
          // Select the moved piece's new position for quick follow-up
          setTimeout(() => selectSquare(targetSquare), 50);
        }
      }
    } else if (key === 'Tab') {
      e.preventDefault();
      if (selectedSquare && moveHints && Object.keys(moveHints).length > 0) {
        // Cycle through legal moves
        const hints = Object.keys(moveHints);
        const currentIndex = hints.indexOf(selectedSquare);
        // Tab goes to next square, or wraps around
        const nextIndex = (currentIndex + 1) % hints.length;
        // Visual feedback - briefly highlight target
        const target = hints[nextIndex];
        // Move cursor to target
        const idx = getIndexFromSquare(target);
        if (idx) {
          selectSquare(target);
        }
      }
    }
  }, [
    selectedSquare,
    moveHints,
    selectSquare,
    makeMove,
    clearSelection,
    getSquareFromIndex,
    getIndexFromSquare,
    gameMode,
    activeGame.turn,
    playerColor,
    isBotThinking,
    isGameOver,
    playState,
    GAME_MODES,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
