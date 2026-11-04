import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChessGameProvider, useChessGame } from '../../contexts/ChessGameContext';
import ChessBoardPanel from './ChessBoardPanel';

vi.mock('react-chessboard', async (importOriginal) => ({
  ...(await importOriginal()),
  Chessboard: ({ options }) => (
    <div>
      <output data-testid="square-styles">{JSON.stringify(options.squareStyles)}</output>
      <button onClick={() => options.onPieceDrop({ sourceSquare: 'a7', targetSquare: 'a8' })}>Drag promote</button>
      <button onClick={() => options.onPieceClick({ square: 'a7' })}>Select pawn</button>
      <button onClick={() => options.onSquareClick({ square: 'a8' })}>Click target</button>
    </div>
  ),
}));

function Driver() {
  const { game, activeGame, pendingPromotion, getLegalMoves, startGame, makeMove, undoMove, enterReview, enterAnalysisMode, goToAnalysisPly, exitAnalysisMode } = useChessGame();
  const [, refresh] = useState(0);
  const [selection, setSelection] = useState({ square: null, hints: {} });
  const clearSelection = () => setSelection({ square: null, hints: {} });
  const selectSquare = (square) => setSelection({
    square,
    hints: Object.fromEntries(getLegalMoves(square).map((move) => [move.to, {}])),
  });

  return (
    <>
      <button onClick={() => { game.load('7k/P7/8/8/8/8/8/7K w - - 0 1'); refresh((value) => value + 1); }}>Prepare promotion</button>
      <button onClick={() => startGame({})}>Start game</button>
      <button onClick={() => makeMove('e2', 'e4')}>Move e4</button>
      <button onClick={undoMove}>Undo move</button>
      <button onClick={() => { enterReview(); enterAnalysisMode(); }}>Enter review</button>
      <button onClick={() => goToAnalysisPly(0)}>Review start</button>
      <button onClick={exitAnalysisMode}>Exit review</button>
      <span data-testid="fen">{game.fen()}</span>
      <span data-testid="active-fen">{activeGame.fen()}</span>
      <span data-testid="pending">{pendingPromotion ? `${pendingPromotion.from}-${pendingPromotion.to}` : ''}</span>
      <ChessBoardPanel
        selectedSquare={selection.square}
        moveHints={selection.hints}
        selectSquare={selectSquare}
        clearSelection={clearSelection}
      />
    </>
  );
}

describe('ChessBoardPanel promotion input parity', () => {
  it('click input waits for explicit promotion choice', () => {
    render(<ChessGameProvider><Driver /></ChessGameProvider>);

    act(() => screen.getByText('Prepare promotion').click());
    const beforeFen = screen.getByTestId('fen').textContent;
    act(() => screen.getByText('Select pawn').click());
    act(() => screen.getByText('Click target').click());

    expect(screen.getByTestId('fen').textContent).toBe(beforeFen);
    expect(screen.getByTestId('pending').textContent).toBe('a7-a8');
  });

  it('drag input waits for explicit promotion choice', () => {
    render(<ChessGameProvider><Driver /></ChessGameProvider>);

    act(() => screen.getByText('Prepare promotion').click());
    const beforeFen = screen.getByTestId('fen').textContent;
    act(() => screen.getByText('Drag promote').click());

    expect(screen.getByTestId('fen').textContent).toBe(beforeFen);
    expect(screen.getByTestId('pending').textContent).toBe('a7-a8');
  });
});

describe('ChessBoardPanel last-move highlight', () => {
  const styles = () => JSON.parse(screen.getByTestId('square-styles').textContent);

  it('derives highlights from active history through moves, undo, and review navigation', () => {
    render(<ChessGameProvider><Driver /></ChessGameProvider>);

    expect(styles()).not.toHaveProperty('e2');
    expect(styles()).not.toHaveProperty('e4');

    act(() => screen.getByText('Start game').click());
    act(() => screen.getByText('Move e4').click());
    expect(styles()).toHaveProperty('e2');
    expect(styles()).toHaveProperty('e4');

    act(() => screen.getByText('Undo move').click());
    expect(styles()).not.toHaveProperty('e2');
    expect(styles()).not.toHaveProperty('e4');

    act(() => screen.getByText('Move e4').click());
    act(() => screen.getByText('Enter review').click());
    expect(styles()).toHaveProperty('e2');
    expect(styles()).toHaveProperty('e4');

    act(() => screen.getByText('Review start').click());
    expect(screen.getByTestId('active-fen').textContent).toContain(' w KQkq - 0 1');
    expect(styles()).not.toHaveProperty('e2');
    expect(styles()).not.toHaveProperty('e4');

    act(() => screen.getByText('Exit review').click());
    expect(styles()).toHaveProperty('e2');
    expect(styles()).toHaveProperty('e4');

    act(() => screen.getByText('Start game').click());
    expect(styles()).not.toHaveProperty('e2');
    expect(styles()).not.toHaveProperty('e4');
  });
});
