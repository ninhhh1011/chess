/**
 * Pure FIDE Elo Rating Calculation Module
 * Implements the official FIDE rating change formulas.
 */

export const INITIAL_PLAYER_ELO = 1000;
export const MIN_PLAYER_ELO = 100;
export const MAX_PLAYER_ELO = 3500;

export type GameOutcomeKind = 'win' | 'lose' | 'draw';

export interface EloDeltaResult {
  oldRating: number;
  newRating: number;
  delta: number;
  expectedScore: number;
  actualScore: number;
  kFactor: number;
}

/**
 * Calculates expected score for player A facing opponent B.
 * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  const exponent = (opponentRating - playerRating) / 400;
  return 1 / (1 + Math.pow(10, exponent));
}

/**
 * Determines K-factor according to standard FIDE criteria:
 * - K = 40 for provisional players (< 30 games)
 * - K = 20 for regular players (>= 30 games, rating <= 2400)
 * - K = 10 for master/high-rated players (> 2400)
 */
export function getKFactor(gamesPlayed = 0, currentRating = INITIAL_PLAYER_ELO): number {
  if (gamesPlayed < 30) return 40;
  if (currentRating > 2400) return 10;
  return 20;
}

/**
 * Calculates Elo rating change following a game outcome.
 */
export function calculateEloDelta(
  playerRating: number,
  opponentRating: number,
  result: GameOutcomeKind,
  gamesPlayed = 0
): EloDeltaResult {
  const safePlayer = Math.max(MIN_PLAYER_ELO, Math.min(MAX_PLAYER_ELO, Math.round(playerRating)));
  const safeOpponent = Math.max(MIN_PLAYER_ELO, Math.min(MAX_PLAYER_ELO, Math.round(opponentRating)));

  const expectedScore = calculateExpectedScore(safePlayer, safeOpponent);
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  const kFactor = getKFactor(gamesPlayed, safePlayer);

  // Raw delta before rounding
  const rawDelta = kFactor * (actualScore - expectedScore);
  const delta = Math.round(rawDelta);

  const newRating = Math.max(MIN_PLAYER_ELO, Math.min(MAX_PLAYER_ELO, safePlayer + delta));

  return {
    oldRating: safePlayer,
    newRating,
    delta: newRating - safePlayer,
    expectedScore,
    actualScore,
    kFactor,
  };
}

export interface EloTierInfo {
  tier: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'master';
  label: string;
  badgeClass: string;
  minElo: number;
  maxElo: number;
}

export function getEloTierLabel(elo: number): EloTierInfo {
  const rating = Math.round(elo);
  if (rating < 1000) {
    return {
      tier: 'novice',
      label: 'Người mới',
      badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
      minElo: 100,
      maxElo: 999,
    };
  }
  if (rating < 1400) {
    return {
      tier: 'beginner',
      label: 'Sơ cấp',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      minElo: 1000,
      maxElo: 1399,
    };
  }
  if (rating < 1800) {
    return {
      tier: 'intermediate',
      label: 'Trung cấp',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      minElo: 1400,
      maxElo: 1799,
    };
  }
  if (rating < 2200) {
    return {
      tier: 'advanced',
      label: 'Nâng cao',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      minElo: 1800,
      maxElo: 2199,
    };
  }
  return {
    tier: 'master',
    label: 'Kiện tướng',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    minElo: 2200,
    maxElo: 3500,
  };
}
