import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChessGameProvider, useChessGame } from '../contexts/ChessGameContext';
import ChessGameBoard from './ChessGameBoard';

const { analyzeFenMock } = vi.hoisted(() => ({ analyzeFenMock: vi.fn() }));

vi.mock('../services/stockfishService', () => ({ analyzeFen: analyzeFenMock }));

vi.mock('./chess/GameLayout', () => ({
  default: ({ engineHint, onRequestHint, onAnalysisRequestStart, onBestMove }) => {
    const [panelRequestId, setPanelRequestId] = useState(null);
    return (
      <>
        <output data-testid="hint">{engineHint ? JSON.stringify(engineHint) : 'none'}</output>
        <button onClick={onRequestHint}>Request analysis hint</button>
        <button onClick={() => setPanelRequestId(onAnalysisRequestStart())}>Start panel request</button>
        <button onClick={() => onBestMove({ bestMove: 'd2d4', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' }, panelRequestId)}>
          Complete panel request
        </button>
      </>
    );
  },
}));

function GameDriver() {
  const { startGame, makeMove, returnToLobby } = useChessGame();
  return (
    <>
      <button onClick={() => startGame({})}>Start game</button>
      <button onClick={() => makeMove('e2', 'e4')}>Make move</button>
      <button onClick={returnToLobby}>Return to lobby</button>
    </>
  );
}

function renderBoard() {
  return render(
    <ChessGameProvider>
      <GameDriver />
      <ChessGameBoard />
    </ChessGameProvider>
  );
}

describe('ChessGameBoard engine hint ownership', () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    analyzeFenMock.mockReset();
    analyzeFenMock.mockImplementation(async ({ fen }) => ({
      bestMove: 'e7e5',
      fen,
      evaluation: { display: '0.2' },
    }));
  });

  it('stores the analyzed position with the manual hint', async () => {
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    analyzeFenMock.mockResolvedValue({
      bestMove: 'e2e4',
      fen: startingFen,
      evaluation: { display: '0.2' },
    });
    renderBoard();

    await act(async () => fireEvent.click(screen.getByText('Request analysis hint')));

    expect(screen.getByTestId('hint')).toHaveTextContent(startingFen);
  });

  it('does not restore a delayed hint after the position changes', async () => {
    let resolveHint;
    analyzeFenMock.mockReturnValue(new Promise((resolve) => { resolveHint = resolve; }));
    renderBoard();
    await act(async () => fireEvent.click(screen.getByText('Start game')));
    await act(async () => fireEvent.click(screen.getByText('Request analysis hint')));
    const hintSignal = analyzeFenMock.mock.calls.at(-1)[0].signal;
    expect(hintSignal).toBeInstanceOf(AbortSignal);
    await act(async () => fireEvent.click(screen.getByText('Make move')));
    expect(hintSignal.aborted).toBe(true);

    await act(async () => resolveHint({
      bestMove: 'e2e4',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      evaluation: { display: '0.2' },
    }));

    expect(screen.getByTestId('hint')).toHaveTextContent('none');
  });

  it('does not restore a delayed hint after the game lifecycle changes', async () => {
    let resolveHint;
    analyzeFenMock.mockReturnValue(new Promise((resolve) => { resolveHint = resolve; }));
    renderBoard();
    await act(async () => fireEvent.click(screen.getByText('Start game')));
    await act(async () => fireEvent.click(screen.getByText('Request analysis hint')));
    await act(async () => fireEvent.click(screen.getByText('Return to lobby')));

    await act(async () => resolveHint({
      bestMove: 'e2e4',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      evaluation: { display: '0.2' },
    }));

    expect(screen.getByTestId('hint')).toHaveTextContent('none');
  });

  it('does not let an older panel result overwrite a newer manual hint', async () => {
    renderBoard();
    fireEvent.click(screen.getByText('Start panel request'));
    await act(async () => fireEvent.click(screen.getByText('Request analysis hint')));
    expect(screen.getByTestId('hint')).toHaveTextContent('e7e5');

    fireEvent.click(screen.getByText('Complete panel request'));

    expect(screen.getByTestId('hint')).toHaveTextContent('e7e5');
  });

  it('does not display a panel result after the game lifecycle changes', async () => {
    renderBoard();
    await act(async () => fireEvent.click(screen.getByText('Start game')));
    fireEvent.click(screen.getByText('Start panel request'));
    fireEvent.click(screen.getByText('Return to lobby'));

    fireEvent.click(screen.getByText('Complete panel request'));

    expect(screen.getByTestId('hint')).toHaveTextContent('none');
  });

  it('does not display a panel result after the position changes', async () => {
    renderBoard();
    fireEvent.click(screen.getByText('Start game'));
    fireEvent.click(screen.getByText('Start panel request'));
    await act(async () => fireEvent.click(screen.getByText('Make move')));

    fireEvent.click(screen.getByText('Complete panel request'));

    expect(screen.getByTestId('hint')).toHaveTextContent('none');
  });

  it('accepts an analysis hint and clears it when the position changes', async () => {
    renderBoard();
    fireEvent.click(screen.getByText('Start game'));
    await act(async () => fireEvent.click(screen.getByText('Request analysis hint')));
    expect(screen.getByTestId('hint')).toHaveTextContent('e7e5');

    fireEvent.click(screen.getByText('Make move'));
    expect(screen.getByTestId('hint')).toHaveTextContent('none');
  });

  it('clears an analysis hint when game lifecycle changes', async () => {
    renderBoard();
    fireEvent.click(screen.getByText('Start game'));
    await act(async () => fireEvent.click(screen.getByText('Request analysis hint')));
    expect(screen.getByTestId('hint')).toHaveTextContent('e7e5');

    fireEvent.click(screen.getByText('Return to lobby'));
    expect(screen.getByTestId('hint')).toHaveTextContent('none');
  });

  it('passes a signal to live evaluation and aborts it when the position changes', async () => {
    vi.useFakeTimers();
    renderBoard();
    fireEvent.click(screen.getByText('Start game'));
    await act(async () => vi.advanceTimersByTimeAsync(400));
    const liveRequest = analyzeFenMock.mock.calls.findLast(([config]) => config.purpose === 'hint');
    expect(liveRequest[0].signal).toBeInstanceOf(AbortSignal);

    await act(async () => fireEvent.click(screen.getByText('Make move')));
    expect(liveRequest[0].signal.aborted).toBe(true);
  });

  it('passes a signal to move annotation and aborts it on unmount', async () => {
    let annotationRequest;
    analyzeFenMock.mockImplementation(({ fen, purpose }) => {
      if (purpose === 'annotation') return new Promise(() => {});
      return Promise.resolve({ bestMove: 'e7e5', fen, evaluation: { display: '0.2' } });
    });
    const view = renderBoard();
    fireEvent.click(screen.getByText('Start game'));
    fireEvent.click(screen.getByText('Make move'));
    await waitFor(() => {
      annotationRequest = analyzeFenMock.mock.calls.find(([config]) => config.purpose === 'annotation')?.[0];
      expect(annotationRequest).toBeDefined();
    });
    expect(annotationRequest.signal).toBeInstanceOf(AbortSignal);

    view.unmount();
    expect(annotationRequest.signal.aborted).toBe(true);
  });
});
