/**
 * Pure Dual Chess Clock State Manager
 * Handles countdown, increment, flag drop timeout, and time control presets.
 */

export type TimeControlId = 'rapid_10' | 'blitz_5_3' | 'bullet_3' | 'unlimited';

export interface TimeControlConfig {
  id: TimeControlId;
  label: string;
  subLabel: string;
  initialSeconds: number | null;
  incrementSeconds: number;
}

export const TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'rapid_10',
    label: '10 phút',
    subLabel: 'Rapid chuẩn',
    initialSeconds: 600,
    incrementSeconds: 0,
  },
  {
    id: 'blitz_5_3',
    label: '5 + 3s',
    subLabel: 'Blitz có cộng giờ',
    initialSeconds: 300,
    incrementSeconds: 3,
  },
  {
    id: 'bullet_3',
    label: '3 phút',
    subLabel: 'Bullet nhanh',
    initialSeconds: 180,
    incrementSeconds: 0,
  },
  {
    id: 'unlimited',
    label: 'Không giới hạn',
    subLabel: 'Thảnh thơi tính toán',
    initialSeconds: null,
    incrementSeconds: 0,
  },
];

export function getTimeControl(id: string = 'rapid_10'): TimeControlConfig {
  return TIME_CONTROLS.find((tc) => tc.id === id) || TIME_CONTROLS[0];
}

export interface DualClockState {
  timeControl: TimeControlConfig;
  whiteRemainingMs: number | null;
  blackRemainingMs: number | null;
  activeColor: 'w' | 'b' | null;
  lastTickAt: number | null;
  isRunning: boolean;
  isTimeout: boolean;
  timeoutWinner: 'w' | 'b' | null;
}

export function createInitialClock(timeControlId: TimeControlId = 'rapid_10'): DualClockState {
  const timeControl = getTimeControl(timeControlId);
  const initialMs = timeControl.initialSeconds !== null ? timeControl.initialSeconds * 1000 : null;

  return {
    timeControl,
    whiteRemainingMs: initialMs,
    blackRemainingMs: initialMs,
    activeColor: null,
    lastTickAt: null,
    isRunning: false,
    isTimeout: false,
    timeoutWinner: null,
  };
}

export function startClock(state: DualClockState, activeColor: 'w' | 'b', now = Date.now()): DualClockState {
  if (state.isTimeout) return state;

  return {
    ...state,
    activeColor,
    lastTickAt: now,
    isRunning: true,
  };
}

export function tickClock(state: DualClockState, now = Date.now()): DualClockState {
  if (!state.isRunning || !state.activeColor || state.isTimeout || state.lastTickAt === null) {
    return state;
  }

  // Unlimited mode doesn't decrement
  if (state.timeControl.initialSeconds === null) {
    return { ...state, lastTickAt: now };
  }

  const elapsedMs = Math.max(0, now - state.lastTickAt);
  if (elapsedMs === 0) return state;

  const isWhite = state.activeColor === 'w';
  const currentRemaining = isWhite ? state.whiteRemainingMs : state.blackRemainingMs;

  if (currentRemaining === null) return state;

  const nextRemaining = Math.max(0, currentRemaining - elapsedMs);

  if (nextRemaining === 0) {
    return {
      ...state,
      whiteRemainingMs: isWhite ? 0 : state.whiteRemainingMs,
      blackRemainingMs: !isWhite ? 0 : state.blackRemainingMs,
      isRunning: false,
      isTimeout: true,
      timeoutWinner: isWhite ? 'b' : 'w', // Player whose clock reached 0 loses
      lastTickAt: now,
    };
  }

  return {
    ...state,
    whiteRemainingMs: isWhite ? nextRemaining : state.whiteRemainingMs,
    blackRemainingMs: !isWhite ? nextRemaining : state.blackRemainingMs,
    lastTickAt: now,
  };
}

export function switchTurn(state: DualClockState, nextColor: 'w' | 'b', now = Date.now()): DualClockState {
  // First apply elapsed time up to now
  const ticked = tickClock(state, now);
  if (ticked.isTimeout) return ticked;

  const prevColor = ticked.activeColor;
  const incrementMs = ticked.timeControl.incrementSeconds * 1000;

  let nextWhite = ticked.whiteRemainingMs;
  let nextBlack = ticked.blackRemainingMs;

  // Apply increment to previous mover if applicable
  if (incrementMs > 0) {
    if (prevColor === 'w' && nextWhite !== null) nextWhite += incrementMs;
    else if (prevColor === 'b' && nextBlack !== null) nextBlack += incrementMs;
  }

  return {
    ...ticked,
    whiteRemainingMs: nextWhite,
    blackRemainingMs: nextBlack,
    activeColor: nextColor,
    lastTickAt: now,
    isRunning: true,
  };
}

export function pauseClock(state: DualClockState, now = Date.now()): DualClockState {
  const ticked = tickClock(state, now);
  return {
    ...ticked,
    isRunning: false,
    lastTickAt: null,
  };
}

export function formatClockTime(remainingMs: number | null): string {
  if (remainingMs === null) return '∞';
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
