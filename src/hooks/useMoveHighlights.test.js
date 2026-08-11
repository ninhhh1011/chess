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
      backgroundColor: 'var(--color-board-selected)',
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
      {
        startSquare: 'e2',
        endSquare: 'e4',
        color: 'rgba(245,158,11,0.88)',
      },
    ]);
  });
});
