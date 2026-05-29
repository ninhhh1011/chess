import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChessGameProvider, useChessGame } from './ChessGameContext';

const TestComponent = () => {
  const { game, newGame, makeMove } = useChessGame();

  return (
    <div>
      <span data-testid="fen">{game.fen()}</span>
      <button onClick={() => makeMove('e2', 'e4')}>Move e4</button>
      <button onClick={newGame}>New Game</button>
    </div>
  );
};

describe('ChessGameContext', () => {
  it('provides initial state and allows making moves', () => {
    render(
      <ChessGameProvider>
        <TestComponent />
      </ChessGameProvider>
    );

    // Initial FEN
    expect(screen.getByTestId('fen').textContent).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    // Make move
    act(() => {
      screen.getByText('Move e4').click();
    });

    // FEN updated
    expect(screen.getByTestId('fen').textContent).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');

    // New game
    act(() => {
      screen.getByText('New Game').click();
    });

    // Back to initial FEN
    expect(screen.getByTestId('fen').textContent).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });
});
