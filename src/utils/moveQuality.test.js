import { describe, it, expect } from 'vitest';
import { classifyMoveAnnotation } from './moveQuality';

describe('moveQuality', () => {
  describe('classifyMoveAnnotation', () => {
    it('classifies best move (playedBestMove is true)', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: 100 }, bestMove: 'e2e4', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        after: { evaluation: { type: 'cp', value: 110 } }, // +0.1 change
        playedUci: 'e2e4',
        playedSan: 'e4',
        color: 'w',
      });
      // Loss is small, played best move -> 'great' or 'best' depending on delta, but our logic says: 
      // if (playedBestMove && loss < 0.15) -> great. Wait, logic is:
      // if ((playedBestMove && delta >= 1.5) || delta >= 2.2) -> brilliant
      // else if (playedBestMove || loss < 0.15) -> great
      expect(annotation.tone).toBe('great');
    });

    it('classifies blunder for huge loss', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: 100 } },
        after: { evaluation: { type: 'cp', value: -300 } }, // -4 pawns
        playedUci: 'e2e4', // not best
        playedSan: 'e4',
        color: 'w',
      });
      expect(annotation.tone).toBe('blunder');
    });

    it('classifies brilliant for huge gain', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: -100 } },
        after: { evaluation: { type: 'cp', value: 300 } }, // +4 pawns delta
        playedUci: 'e2e4',
        playedSan: 'e4',
        color: 'w',
      });
      expect(annotation.tone).toBe('brilliant');
    });

    it('classifies inaccuracy for moderate loss', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: 100 } },
        after: { evaluation: { type: 'cp', value: 20 } }, // -0.8 loss
        playedUci: 'e2e4',
        playedSan: 'e4',
        color: 'w',
      });
      expect(annotation.tone).toBe('inaccuracy');
    });
  });
});
