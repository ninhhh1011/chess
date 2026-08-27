import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'chess-game-stats';

const defaultStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesDrawn: 0,
  totalMoves: 0,
  totalPlayTime: 0, // in seconds
  favoriteOpening: null,
  lastPlayed: null,
};

// Singleton state outside component for cross-component access
let globalStats = null;
let listeners = [];

function notifyListeners() {
  listeners.forEach(fn => fn(globalStats));
}

function loadStats() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
  } catch {
    return defaultStats;
  }
}

function saveStats(stats) {
  globalStats = stats;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  notifyListeners();
}

export function useGameStats() {
  const [stats, setStats] = useState(() => {
    if (!globalStats) {
      globalStats = loadStats();
    }
    return globalStats;
  });

  useEffect(() => {
    listeners.push(setStats);
    return () => {
      listeners = listeners.filter(fn => fn !== setStats);
    };
  }, []);

  const recordGame = useCallback((result, moveCount, playTime) => {
    const newStats = { ...globalStats };
    newStats.gamesPlayed += 1;
    newStats.totalMoves += moveCount;
    newStats.totalPlayTime += playTime;
    newStats.lastPlayed = Date.now();

    if (result === 'win') newStats.gamesWon += 1;
    else if (result === 'lose') newStats.gamesLost += 1;
    else if (result === 'draw') newStats.gamesDrawn += 1;

    saveStats(newStats);
  }, []);

  const resetStats = useCallback(() => {
    saveStats({ ...defaultStats, lastPlayed: null });
  }, []);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  return {
    stats,
    recordGame,
    resetStats,
    winRate,
    formatPlayTime: (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    },
  };
}

// Export for use outside components
export function recordGameResult(result, moveCount, playTime) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.totalMoves += moveCount;
  stats.totalPlayTime += playTime;
  stats.lastPlayed = Date.now();

  if (result === 'win') stats.gamesWon += 1;
  else if (result === 'lose') stats.gamesLost += 1;
  else if (result === 'draw') stats.gamesDrawn += 1;

  saveStats(stats);
}
