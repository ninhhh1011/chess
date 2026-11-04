import { describe, it, expect } from 'vitest';
import { formatSevenTagRosterPgn } from './pgnFormat';

describe('Seven Tag Roster PGN Generator', () => {
  it('formats full compliant Seven Tag Roster PGN with headers and moves', () => {
    const pgn = formatSevenTagRosterPgn({
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      white: 'Kỳ thủ',
      black: 'Ninh Lốp Trưởng',
      whiteElo: 1250,
      blackElo: 1200,
      result: 'win',
      playerColor: 'w',
      date: new Date('2026-11-05T00:00:00Z'),
      timeControl: '600',
    });

    expect(pgn).toContain('[Event "Ván đấu với Ninh Lốp Trưởng"]');
    expect(pgn).toContain('[Site "Ninh Chess"]');
    expect(pgn).toContain('[Date "2026.11.05"]');
    expect(pgn).toContain('[Round "1"]');
    expect(pgn).toContain('[White "Kỳ thủ"]');
    expect(pgn).toContain('[Black "Ninh Lốp Trưởng"]');
    expect(pgn).toContain('[Result "1-0"]');
    expect(pgn).toContain('[WhiteElo "1250"]');
    expect(pgn).toContain('[BlackElo "1200"]');
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6 3. Bc4 1-0');
  });

  it('formats draw and black win results accurately', () => {
    const drawPgn = formatSevenTagRosterPgn({
      moves: ['d4', 'd5'],
      white: 'Ninh Bot',
      black: 'Kỳ thủ',
      result: 'draw',
      playerColor: 'b',
    });
    expect(drawPgn).toContain('[Result "1/2-1/2"]');
    expect(drawPgn).toContain('1/2-1/2');

    const blackWinPgn = formatSevenTagRosterPgn({
      moves: ['e4', 'e5'],
      white: 'Ninh Bot',
      black: 'Kỳ thủ',
      result: 'win',
      playerColor: 'b', // Black won!
    });
    expect(blackWinPgn).toContain('[Result "0-1"]');
    expect(blackWinPgn).toContain('0-1');
  });

  it('handles empty moves gracefully', () => {
    const pgn = formatSevenTagRosterPgn({
      moves: [],
      white: 'Bạn',
      black: 'AI',
    });
    expect(pgn).toContain('[Result "*"]');
  });
});
