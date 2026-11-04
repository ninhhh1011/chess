import { describe, it, expect } from 'vitest';
import {
  TIME_CONTROLS,
  getTimeControl,
  createInitialClock,
  startClock,
  tickClock,
  switchTurn,
  pauseClock,
  formatClockTime,
} from './chessClock';

describe('Dual Chess Clock Module', () => {
  it('provides standard time control presets', () => {
    expect(TIME_CONTROLS.length).toBeGreaterThanOrEqual(4);
    expect(getTimeControl('rapid_10').initialSeconds).toBe(600);
    expect(getTimeControl('blitz_5_3').incrementSeconds).toBe(3);
    expect(getTimeControl('bullet_3').initialSeconds).toBe(180);
    expect(getTimeControl('unlimited').initialSeconds).toBeNull();
  });

  it('initializes dual clock with correct remaining milliseconds', () => {
    const clock = createInitialClock('rapid_10');
    expect(clock.whiteRemainingMs).toBe(600_000);
    expect(clock.blackRemainingMs).toBe(600_000);
    expect(clock.isRunning).toBe(false);
    expect(clock.isTimeout).toBe(false);
  });

  it('ticks down active player time accurately', () => {
    const clock = createInitialClock('rapid_10');
    const started = startClock(clock, 'w', 1000);
    expect(started.isRunning).toBe(true);

    // 2.5 seconds elapse
    const ticked = tickClock(started, 3500);
    expect(ticked.whiteRemainingMs).toBe(600_000 - 2500);
    expect(ticked.blackRemainingMs).toBe(600_000); // Black untouched
    expect(ticked.isTimeout).toBe(false);
  });

  it('switches turn and applies increment to previous player', () => {
    const clock = createInitialClock('blitz_5_3'); // 300s initial, 3s increment
    const started = startClock(clock, 'w', 1000);

    // White thinks for 5 seconds
    const moved = switchTurn(started, 'b', 6000);
    // 300_000 - 5000 + 3000 = 298_000
    expect(moved.whiteRemainingMs).toBe(298_000);
    expect(moved.activeColor).toBe('b');
    expect(moved.blackRemainingMs).toBe(300_000);
  });

  it('detects timeout flag drop and awards victory to opponent', () => {
    const clock = createInitialClock('bullet_3');
    // Set low time
    clock.whiteRemainingMs = 500;
    const started = startClock(clock, 'w', 1000);

    // 1 second elapses (exceeding 500ms remaining)
    const timeout = tickClock(started, 2000);
    expect(timeout.whiteRemainingMs).toBe(0);
    expect(timeout.isTimeout).toBe(true);
    expect(timeout.timeoutWinner).toBe('b'); // Black wins on White timeout
    expect(timeout.isRunning).toBe(false);
  });

  it('does not tick down in unlimited mode', () => {
    const clock = createInitialClock('unlimited');
    const started = startClock(clock, 'w', 1000);
    const ticked = tickClock(started, 5000);
    expect(ticked.whiteRemainingMs).toBeNull();
    expect(ticked.isTimeout).toBe(false);
  });

  it('pauses and resumes without leaking time', () => {
    const clock = createInitialClock('rapid_10');
    const started = startClock(clock, 'w', 1000);
    const paused = pauseClock(started, 3000);
    expect(paused.isRunning).toBe(false);
    expect(paused.whiteRemainingMs).toBe(600_000 - 2000);

    // Resume later
    const resumed = startClock(paused, 'w', 10000);
    expect(resumed.isRunning).toBe(true);
    const ticked = tickClock(resumed, 11000);
    expect(ticked.whiteRemainingMs).toBe(600_000 - 3000);
  });

  it('formats clock display string gracefully', () => {
    expect(formatClockTime(600_000)).toBe('10:00');
    expect(formatClockTime(65_000)).toBe('01:05');
    expect(formatClockTime(9_500)).toBe('00:09');
    expect(formatClockTime(0)).toBe('00:00');
    expect(formatClockTime(null)).toBe('∞');
  });
});
