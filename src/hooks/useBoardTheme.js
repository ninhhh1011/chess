import { useState, useCallback } from 'react';

export const BOARD_THEMES = {
  classic: {
    name: 'Classic',
    dark: '#769656',
    light: '#EEEED2',
    lastMove: '#BACA44',
  },
  wood: {
    name: 'Wood',
    dark: '#B58863',
    light: '#F0D9B5',
    lastMove: '#CDD26A',
  },
  marble: {
    name: 'Marble',
    dark: '#7D6B5D',
    light: '#E8E2D5',
    lastMove: '#C9B97A',
  },
  minimal: {
    name: 'Minimal',
    dark: '#3D3D3D',
    light: '#FAFAFA',
    lastMove: '#A8B89C',
  },
  blue: {
    name: 'Ocean Blue',
    dark: '#5B8CB8',
    light: '#D4E4F7',
    lastMove: '#8FADD7',
  },
  green: {
    name: 'Forest',
    dark: '#537A4A',
    light: '#C6D9A8',
    lastMove: '#8CB85C',
  },
};

const STORAGE_KEY = 'chess-board-theme';

export function useBoardTheme() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window === 'undefined') return 'classic';
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && BOARD_THEMES[saved] ? saved : 'classic';
  });

  const setTheme = useCallback((themeId) => {
    if (BOARD_THEMES[themeId]) {
      setCurrentTheme(themeId);
      localStorage.setItem(STORAGE_KEY, themeId);
    }
  }, []);

  const theme = BOARD_THEMES[currentTheme];

  return { theme, currentTheme, setTheme, themes: BOARD_THEMES };
}

// CSS variables updater
export function applyBoardTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--color-board-dark', theme.dark);
  document.documentElement.style.setProperty('--color-board-light', theme.light);
  document.documentElement.style.setProperty('--color-board-last-move', theme.lastMove);
}
