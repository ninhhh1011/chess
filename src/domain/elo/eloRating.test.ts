import { describe, it, expect } from 'vitest';
import {
  calculateExpectedScore,
  getKFactor,
  calculateEloDelta,
  getEloTierLabel,
  INITIAL_PLAYER_ELO,
} from './eloRating';

describe('eloRating domain module', () => {
  it('calculates symmetrical expected scores for equal ratings', () => {
    const expected = calculateExpectedScore(1200, 1200);
    expect(expected).toBeCloseTo(0.5, 4);
  });

  it('calculates higher expected score for higher rated player', () => {
    const higher = calculateExpectedScore(1600, 1200);
    const lower = calculateExpectedScore(1200, 1600);
    expect(higher).toBeGreaterThan(0.5);
    expect(lower).toBeLessThan(0.5);
    expect(higher + lower).toBeCloseTo(1.0, 4);
  });

  it('determines appropriate K-factor based on games played and rating', () => {
    expect(getKFactor(10, 1200)).toBe(40); // Provisional (< 30 games)
    expect(getKFactor(35, 1400)).toBe(20); // Regular
    expect(getKFactor(100, 2500)).toBe(10); // Master level (> 2400)
  });

  it('calculates correct rating deltas on win against higher bot', () => {
    // 1200 player defeats 1600 bot (upset win)
    const result = calculateEloDelta(1200, 1600, 'win', 10);
    expect(result.delta).toBeGreaterThan(25); // Large gain
    expect(result.newRating).toBe(1200 + result.delta);
  });

  it('calculates modest rating deltas on win against weaker bot', () => {
    // 1600 player defeats 400 bot
    const result = calculateEloDelta(1600, 400, 'win', 35);
    expect(result.delta).toBeLessThanOrEqual(2);
    expect(result.newRating).toBe(1600 + result.delta);
  });

  it('calculates negative delta on loss', () => {
    const result = calculateEloDelta(1200, 1200, 'lose', 10);
    expect(result.delta).toBeLessThan(0);
    expect(result.newRating).toBe(1200 + result.delta);
  });

  it('handles draws according to rating differences', () => {
    // Lower rated player drawing against much higher bot gains rating
    const lowerDraw = calculateEloDelta(1000, 1600, 'draw', 35);
    expect(lowerDraw.delta).toBeGreaterThan(0);

    // Higher rated player drawing against much lower bot loses rating
    const higherDraw = calculateEloDelta(1600, 1000, 'draw', 35);
    expect(higherDraw.delta).toBeLessThan(0);
  });

  it('respects minimum rating floor of 100', () => {
    const result = calculateEloDelta(110, 2000, 'lose', 10);
    expect(result.newRating).toBeGreaterThanOrEqual(100);
  });

  it('returns appropriate tier labels for various Elo ranges', () => {
    expect(getEloTierLabel(800).label).toBe('Người mới');
    expect(getEloTierLabel(1200).label).toBe('Sơ cấp');
    expect(getEloTierLabel(1500).label).toBe('Trung cấp');
    expect(getEloTierLabel(1900).label).toBe('Nâng cao');
    expect(getEloTierLabel(2300).label).toBe('Kiện tướng');
  });

  it('exports sensible default initial Elo', () => {
    expect(INITIAL_PLAYER_ELO).toBe(1000);
  });
});
