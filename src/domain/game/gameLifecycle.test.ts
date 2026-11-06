import { describe, expect, it } from 'vitest';
import { transitionGamePhase } from './gameLifecycle';

describe('transitionGamePhase', () => {
  it.each([
    ['lobby', 'START_GAME', 'playing'],
    ['analysis', 'START_GAME', 'playing'],
    ['playing', 'GAME_END', 'game_over'],
    ['playing', 'RESIGN', 'game_over'],
    ['game_over', 'ENTER_REVIEW', 'review'],
    ['review', 'ENTER_ANALYSIS', 'analysis'],
    ['analysis', 'EXIT_ANALYSIS', 'review'],
    ['playing', 'RESET', 'lobby'],
    ['review', 'RESET', 'lobby'],
  ] as const)('%s + %s -> %s', (phase, event, expected) => {
    expect(transitionGamePhase(phase, event)).toBe(expected);
  });

  it('keeps the phase when an event is invalid for that phase', () => {
    expect(transitionGamePhase('lobby', 'ENTER_ANALYSIS')).toBe('lobby');
    expect(transitionGamePhase('analysis', 'GAME_END')).toBe('analysis');
  });
});
