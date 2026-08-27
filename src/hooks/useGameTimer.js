import { useState, useEffect, useRef } from 'react';

/**
 * Game timer hook - tracks time spent playing
 */
export function useGameTimer(isActive) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      accumulatedRef.current += Date.now() - startRef.current;
      return;
    }

    startRef.current = Date.now();
    const interval = setInterval(() => {
      const total = accumulatedRef.current + (Date.now() - startRef.current);
      setElapsed(Math.floor(total / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  return {
    elapsed,
    formatted: formatTime(elapsed),
  };
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Format time for display (MM:SS)
 */
export function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
