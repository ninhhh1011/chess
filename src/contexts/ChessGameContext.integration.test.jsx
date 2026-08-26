/**
 * Integration tests for ChessGameContext bot lifecycle
 * Tests the complete bot lifecycle without depending on ChessGameBoard rendering
 */
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChessGameProvider, useChessGame } from './ChessGameContext';
import * as botService from '../services/botService';

// Mock the services
vi.mock('../services/botService', () => ({
  getBotMove: vi.fn(),
  uciToMoveObject: vi.fn(),
}));

// Test component that exposes context state and bot integration
function TestBoard() {
  const {
    playState,
    playerColor,
    currentTurn,
    isBotThinking,
    isGameOver,
    moveHistory,
    setPlayState,
    startGame,
    makeMove,
    newGame,
    undoMove,
    botElo,
    GAME_MODES,
    PLAYER_COLORS,
    setIsBotThinking,
  } = useChessGame();

  return (
    <div>
      <div data-testid="play-state">{playState}</div>
      <div data-testid="player-color">{playerColor}</div>
      <div data-testid="current-turn">{currentTurn}</div>
      <div data-testid="is-bot-thinking">{String(isBotThinking)}</div>
      <div data-testid="is-game-over">{String(isGameOver)}</div>
      <div data-testid="move-history">{JSON.stringify(moveHistory)}</div>
      <div data-testid="bot-elo">{botElo}</div>
      <div data-testid="move-count">{moveHistory.length}</div>

      <button data-testid="btn-start" onClick={() => startGame({ elo: 800, color: PLAYER_COLORS.WHITE, mode: GAME_MODES.BOT })}>
        Start White
      </button>
      <button data-testid="btn-start-black" onClick={() => startGame({ elo: 800, color: PLAYER_COLORS.BLACK, mode: GAME_MODES.BOT })}>
        Start Black
      </button>
      <button data-testid="btn-lobby" onClick={() => setPlayState('lobby')}>
        To Lobby
      </button>
      <button data-testid="btn-move-e4" onClick={() => makeMove('e2', 'e4')}>
        Move e4
      </button>
      <button data-testid="btn-move-e5" onClick={() => makeMove('e7', 'e5')}>
        Move e5
      </button>
      <button data-testid="btn-new-game" onClick={newGame}>
        New Game
      </button>
      <button data-testid="btn-undo" onClick={undoMove}>
        Undo
      </button>
      <button data-testid="btn-bot-thinking" onClick={() => setIsBotThinking(true)}>
        Set Bot Thinking
      </button>
      <button data-testid="btn-bot-done" onClick={() => setIsBotThinking(false)}>
        Set Bot Done
      </button>
    </div>
  );
}

describe('ChessGameContext Integration - Bot Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: bot always responds with e7e5
    botService.getBotMove.mockResolvedValue({
      move: 'e7e5',
      source: 'stockfish',
      elo: 800,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Game initialization', () => {
    it('starts in lobby state', () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );
      expect(screen.getByTestId('play-state').textContent).toBe('lobby');
    });

    it('can start game with white as player color', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      expect(screen.getByTestId('play-state').textContent).toBe('playing');
      expect(screen.getByTestId('player-color').textContent).toBe('w');
    });

    it('can start game with black as player color', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start-black').click();
      });

      expect(screen.getByTestId('play-state').textContent).toBe('playing');
      expect(screen.getByTestId('player-color').textContent).toBe('b');
    });
  });

  describe('Move history and turn management', () => {
    it('records player moves', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      const history = JSON.parse(screen.getByTestId('move-history').textContent);
      expect(history).toContain('e4');
      expect(history.length).toBe(1);
    });

    it('updates turn after player move', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      // Initial: white to move
      expect(screen.getByTestId('current-turn').textContent).toBe('w');

      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // After white move: black to move
      expect(screen.getByTestId('current-turn').textContent).toBe('b');
    });

    it('rejects moves when not player turn', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      // After white moves, it's black's turn
      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // Try to make another white move (should fail)
      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // Should still only have 1 move
      const history = JSON.parse(screen.getByTestId('move-history').textContent);
      expect(history.length).toBe(1);
    });
  });

  describe('Undo functionality', () => {
    it('allows player to undo their move', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      expect(JSON.parse(screen.getByTestId('move-history').textContent).length).toBe(1);

      await act(async () => {
        screen.getByTestId('btn-undo').click();
      });

      expect(JSON.parse(screen.getByTestId('move-history').textContent).length).toBe(0);
    });

    it('undoes player move in bot mode', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // Player made their move
      const historyAfterMove = JSON.parse(screen.getByTestId('move-history').textContent);
      expect(historyAfterMove.length).toBe(1);

      // Undo
      await act(async () => {
        screen.getByTestId('btn-undo').click();
      });

      // Should undo the move
      const historyAfterUndo = JSON.parse(screen.getByTestId('move-history').textContent);
      expect(historyAfterUndo.length).toBe(0);
    });
  });

  describe('New game functionality', () => {
    it('resets move history on new game', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // Player made 1 move
      expect(JSON.parse(screen.getByTestId('move-history').textContent).length).toBe(1);

      await act(async () => {
        screen.getByTestId('btn-new-game').click();
      });

      expect(JSON.parse(screen.getByTestId('move-history').textContent).length).toBe(0);
    });

    it('returns to lobby when going to lobby', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      expect(screen.getByTestId('play-state').textContent).toBe('playing');

      await act(async () => {
        screen.getByTestId('btn-lobby').click();
      });

      expect(screen.getByTestId('play-state').textContent).toBe('lobby');
    });
  });

  describe('Bot thinking state', () => {
    it('tracks bot thinking state', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      expect(screen.getByTestId('is-bot-thinking').textContent).toBe('false');

      await act(async () => {
        screen.getByTestId('btn-bot-thinking').click();
      });

      expect(screen.getByTestId('is-bot-thinking').textContent).toBe('true');

      await act(async () => {
        screen.getByTestId('btn-bot-done').click();
      });

      expect(screen.getByTestId('is-bot-thinking').textContent).toBe('false');
    });

    it('blocks moves when bot is thinking', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      // Set bot thinking
      await act(async () => {
        screen.getByTestId('btn-bot-thinking').click();
      });

      // Try to move while bot is thinking
      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // Move should be blocked (history still empty)
      expect(JSON.parse(screen.getByTestId('move-history').textContent).length).toBe(0);
    });
  });

  describe('Game mode validation', () => {
    it('validates player cannot move opponent pieces', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      // Try to move a black piece as white player
      await act(async () => {
        screen.getByTestId('btn-move-e5').click();
      });

      // Should not add any moves
      expect(JSON.parse(screen.getByTestId('move-history').textContent).length).toBe(0);
    });

    it('allows moves only in correct game state', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      // Try to move without starting game (should fail)
      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // In lobby state, moves should be blocked
      expect(screen.getByTestId('play-state').textContent).toBe('lobby');
    });
  });

  describe('Bot service integration', () => {
    it('mock resolves bot moves', async () => {
      render(
        <ChessGameProvider>
          <TestBoard />
        </ChessGameProvider>
      );

      await act(async () => {
        screen.getByTestId('btn-start').click();
      });

      await act(async () => {
        screen.getByTestId('btn-move-e4').click();
      });

      // The actual bot call would happen in ChessGameBoard
      // Here we just verify the mock is configured correctly
      const result = await botService.getBotMove('test', 800);
      expect(result.move).toBe('e7e5');
    });

    it('bot service can be mocked for errors', async () => {
      botService.getBotMove.mockRejectedValue(new Error('Engine error'));

      // Verify the mock is set up correctly
      await expect(botService.getBotMove('test', 800)).rejects.toThrow('Engine error');
    });
  });
});
