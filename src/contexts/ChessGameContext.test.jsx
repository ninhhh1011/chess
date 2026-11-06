import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChessGameProvider, useChessGame } from './ChessGameContext';
import { useState } from 'react';

const TestComponent = () => {
  const context = useChessGame();
  const { game, activeGame, analysisPly, analysisMainline, moveAnnotations, pendingLiveMoveAnalysis, enterReview, enterAnalysisMode, exitAnalysisMode, goToAnalysisPly, newGame, startGame, makeMove, attemptMove, choosePromotion, cancelPromotion, pendingPromotion } = context;
  const [, refresh] = useState(0);

  return (
    <div>
      <span data-testid="fen">{game.fen()}</span>
      <span data-testid="active-fen">{activeGame.fen()}</span>
      <span data-testid="review-ply">{analysisPly}</span>
      <span data-testid="review-mainline">{JSON.stringify(analysisMainline)}</span>
      <span data-testid="move-annotations">{JSON.stringify(moveAnnotations)}</span>
      <span data-testid="pending-live-analysis">{pendingLiveMoveAnalysis?.requestId ?? ''}</span>
      <span data-testid="pending-promotion">{pendingPromotion ? `${pendingPromotion.from}-${pendingPromotion.to}` : ''}</span>
      <span data-testid="has-forbidden-state">{String('gameMode' in context || 'GAME_MODES' in context || 'selectedSquare' in context || 'moveHints' in context)}</span>
      <button onClick={() => makeMove('e2', 'e4')}>Move e4</button>
      <button onClick={() => makeMove('e7', 'e5')}>Move e5</button>
      <button onClick={newGame}>New Game</button>
      <button onClick={() => startGame({})}>Start Game</button>
      <button onClick={enterReview}>Mark Review</button>
      <button onClick={enterAnalysisMode}>Enter Review</button>
      <button onClick={() => goToAnalysisPly(0)}>Review Start</button>
      <button onClick={exitAnalysisMode}>Exit Review</button>
      <button onClick={() => { game.load('7k/P7/8/8/8/8/8/7K w - - 0 1'); refresh((value) => value + 1); }}>Prepare promotion</button>
      <button onClick={() => attemptMove('a7', 'a8')}>Attempt promotion</button>
      <button onClick={() => choosePromotion('q')}>Promote q</button>
      <button onClick={() => choosePromotion('r')}>Promote r</button>
      <button onClick={() => choosePromotion('b')}>Promote b</button>
      <button onClick={() => choosePromotion('n')}>Promote n</button>
      <button onClick={cancelPromotion}>Cancel promotion</button>
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
    expect(screen.getByTestId('fen').textContent).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');

    // New game
    act(() => {
      screen.getByText('New Game').click();
    });

    // Back to initial FEN
    expect(screen.getByTestId('fen').textContent).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('exposes no multiplayer mode or board selection state', () => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);
    expect(screen.getByTestId('has-forbidden-state').textContent).toBe('false');
  });

  it('routes review navigation through an independent snapshot and resets on exit', () => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);
    act(() => screen.getByText('Start Game').click());
    act(() => screen.getByText('Move e4').click());
    const liveFen = screen.getByTestId('fen').textContent;

    act(() => screen.getByText('Mark Review').click());
    act(() => screen.getByText('Enter Review').click());
    expect(screen.getByTestId('review-mainline').textContent).toBe('["e4"]');
    expect(screen.getByTestId('review-ply').textContent).toBe('1');
    expect(screen.getByTestId('active-fen').textContent).toBe(liveFen);

    act(() => screen.getByText('Review Start').click());
    expect(screen.getByTestId('review-ply').textContent).toBe('0');
    expect(screen.getByTestId('active-fen').textContent).toContain(' w KQkq - 0 1');
    expect(screen.getByTestId('fen').textContent).toBe(liveFen);

    act(() => screen.getByText('Exit Review').click());
    expect(screen.getByTestId('review-mainline').textContent).toBe('[]');
    expect(screen.getByTestId('active-fen').textContent).toBe(liveFen);
  });

  it('records annotation work for live moves, skips analysis moves, and clears it on reset', () => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);
    act(() => screen.getByText('Start Game').click());
    act(() => screen.getByText('Move e4').click());

    expect(JSON.parse(screen.getByTestId('move-annotations').textContent)).toEqual({
      0: { symbol: '...', label: 'Đang phân tích', tone: 'pending' },
    });
    expect(screen.getByTestId('pending-live-analysis').textContent).toBe('1');

    act(() => screen.getByText('Mark Review').click());
    act(() => screen.getByText('Enter Review').click());
    act(() => screen.getByText('Move e5').click());
    expect(Object.keys(JSON.parse(screen.getByTestId('move-annotations').textContent))).toEqual(['0']);

    act(() => screen.getByText('New Game').click());
    expect(screen.getByTestId('move-annotations').textContent).toBe('{}');
    expect(screen.getByTestId('pending-live-analysis').textContent).toBe('');
  });

  it('does not commit a promotion before the player chooses a piece', () => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);

    act(() => screen.getByText('Prepare promotion').click());
    const promotionFen = screen.getByTestId('fen').textContent;

    act(() => screen.getByText('Attempt promotion').click());

    expect(screen.getByTestId('fen').textContent).toBe(promotionFen);
    expect(screen.getByTestId('pending-promotion').textContent).toBe('a7-a8');
  });

  it.each([
    ['queen', 'q', 'Q'],
    ['rook', 'r', 'R'],
    ['bishop', 'b', 'B'],
    ['knight', 'n', 'N'],
  ])('commits promotion as a %s only after selection', (_name, choice, symbol) => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);

    act(() => screen.getByText('Prepare promotion').click());
    act(() => screen.getByText('Attempt promotion').click());
    act(() => screen.getByText(`Promote ${choice}`).click());

    expect(screen.getByTestId('fen').textContent).toMatch(new RegExp(`^${symbol}6k/`));
    expect(screen.getByTestId('pending-promotion').textContent).toBe('');
  });

  it('cancels a pending promotion without changing the position', () => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);

    act(() => screen.getByText('Prepare promotion').click());
    const promotionFen = screen.getByTestId('fen').textContent;
    act(() => screen.getByText('Attempt promotion').click());
    act(() => screen.getByText('Cancel promotion').click());

    expect(screen.getByTestId('fen').textContent).toBe(promotionFen);
    expect(screen.getByTestId('pending-promotion').textContent).toBe('');
  });

  it('invalidates a pending promotion when the game resets', () => {
    render(<ChessGameProvider><TestComponent /></ChessGameProvider>);

    act(() => screen.getByText('Prepare promotion').click());
    act(() => screen.getByText('Attempt promotion').click());
    act(() => screen.getByText('New Game').click());

    expect(screen.getByTestId('pending-promotion').textContent).toBe('');
    expect(screen.getByTestId('fen').textContent).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });
});
