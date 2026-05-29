import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMoveHighlights } from './useMoveHighlights';

describe('useMoveHighlights', () => {
  it('returns empty objects when no inputs provided', () => {
    const { result } = renderHook(() =>
      useMoveHighlights({
        selectedSquare: null,
        moveHints: {},
        lastMoveSquares: null,
        checkedKingSquare: null,
        engineMove: null,
      })
    );

    expect(result.current.boardSquareStyles).toEqual({});
    expect(result.current.engineArrows).toEqual([]);
  });

  it('highlights selected square', () => {
    const { result } = renderHook(() =>
      useMoveHighlights({
        selectedSquare: 'e2',
        moveHints: {},
        lastMoveSquares: null,
        checkedKingSquare: null,
        engineMove: null,
      })
    );

    expect(result.current.boardSquareStyles).toHaveProperty('e2');
    expect(result.current.boardSquareStyles.e2).toMatchObject({
      backgroundColor: 'rgba(56, 189, 248, 0.4)',
    });
  });

  it('highlights last move squares', () => {
    const { result } = renderHook(() =>
      useMoveHighlights({
        selectedSquare: null,
        moveHints: {},
        lastMoveSquares: { from: 'e2', to: 'e4' },
        checkedKingSquare: null,
        engineMove: null,
      })
    );

    expect(result.current.boardSquareStyles).toHaveProperty('e2');
    expect(result.current.boardSquareStyles).toHaveProperty('e4');
  });

  it('returns engine arrow', () => {
    const { result } = renderHook(() =>
      useMoveHighlights({
        selectedSquare: null,
        moveHints: {},
        lastMoveSquares: null,
        checkedKingSquare: null,
        engineMove: { from: 'e2', to: 'e4' },
      })
    );

    expect(result.current.engineArrows).toEqual([
      ['e2', 'e4', 'rgba(16, 185, 129, 0.6)'],
    ]);
  });
});
