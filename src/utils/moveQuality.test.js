import { describe, it, expect } from 'vitest';
import { classifyMoveAnnotation } from './moveQuality';

describe('moveQuality', () => {
  describe('classifyMoveAnnotation', () => {
    it('does not classify a move when either evaluation is missing', () => {
      expect(classifyMoveAnnotation({ before: {}, after: {}, playedUci: 'e2e4', playedSan: 'e4', color: 'w' }))
        .toBeNull();
      expect(classifyMoveAnnotation({ before: { evaluation: { type: 'cp', value: 0 } }, after: {}, playedUci: 'e2e4', playedSan: 'e4', color: 'w' }))
        .toBeNull();
    });

    it('uses the canonical review classification for live annotations', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: 100 }, bestMove: 'e2e4', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        after: { evaluation: { type: 'cp', value: 110 } }, // +0.1 change
        playedUci: 'e2e4',
        playedSan: 'e4',
        color: 'w',
      });
      expect(annotation.tone).toBe('best');
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

    it('measures a black move from Black’s perspective using White POV evaluations', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: 100 } },
        after: { evaluation: { type: 'cp', value: 0 } },
        playedUci: 'g8f6',
        playedSan: 'Nf6',
        color: 'b',
      });
      expect(annotation.loss).toBe(0);
      expect(annotation.tone).toBe('best');
    });

    it('keeps different winning mate distances in the same live quality band', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'mate', value: 3 } },
        after: { evaluation: { type: 'mate', value: 1 } },
        playedUci: 'e2e4',
        playedSan: 'e4',
        color: 'w',
      });
      expect(annotation.loss).toBe(0);
      expect(annotation.tone).toBe('best');
    });

    it('uses best classification for a move that improves the mover position', () => {
      const annotation = classifyMoveAnnotation({
        before: { evaluation: { type: 'cp', value: -100 } },
        after: { evaluation: { type: 'cp', value: 300 } }, // +4 pawns delta
        playedUci: 'e2e4',
        playedSan: 'e4',
        color: 'w',
      });
      expect(annotation.tone).toBe('best');
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
