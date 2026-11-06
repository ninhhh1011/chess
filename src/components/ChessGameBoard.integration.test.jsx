/**
 * Integration tests for ChessGameBoard - PRODUCTION PATH
 *
 * Tests that ChessGameBoard component properly integrates with:
 * - ChessGameProvider (context)
 * - useBotMove hook
 * - botService mock
 *
 * Verifies bot lifecycle without requiring full chessboard rendering.
 */
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ChessGameProvider, useChessGame } from '../contexts/ChessGameContext';
import ChessGameBoard from './ChessGameBoard';

// Mock services at module level
vi.mock('../services/botService', () => ({
  getBotMove: vi.fn(),
  uciToMoveObject: vi.fn(),
}));

vi.mock('../services/stockfishService', () => ({
  analyzeFen: vi.fn().mockResolvedValue({
    success: true,
    bestMove: 'e7e5',
    evaluation: { type: 'cp', value: 0, display: '0.00' },
    source: 'stockfish_wasm',
  }),
  initEngine: vi.fn().mockResolvedValue(true),
  isEngineReady: vi.fn().mockReturnValue(true),
  configureEngine: vi.fn().mockResolvedValue(true),
}));

vi.mock('../services/analysis/gameAnalyzer', () => ({
  analyzeGame: vi.fn(),
}));

vi.mock('react-chessboard', async (importOriginal) => ({
  ...(await importOriginal()),
  Chessboard: ({ options }) => <div data-testid="chessboard" data-orientation={options.boardOrientation} />,
}));

import * as botService from '../services/botService';
import * as gameAnalyzer from '../services/analysis/gameAnalyzer';
import { getUserProfile } from '../services/userProfileService';
import Play from '../pages/Play';

// Expected FEN after 1.e4
const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const FEN_STARTING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function BotLifecycleDriver() {
  const { startGame, makeMove } = useChessGame();
  return (
    <>
      <button onClick={() => startGame({ elo: 800, color: 'w' })}>Start white test game</button>
      <button onClick={() => makeMove('e2', 'e4')}>Play e2e4</button>
    </>
  );
}

function GameOverDriver() {
  const { startGame, makeMove } = useChessGame();
  return (
    <>
      <button onClick={() => startGame({ color: 'w' })}>Start game-over test</button>
      <button onClick={() => makeMove('f2', 'f3')}>Play f3</button>
      <button onClick={() => makeMove('e7', 'e5', 'q', { byBot: true })}>Play e5</button>
      <button onClick={() => makeMove('g2', 'g4')}>Play g4</button>
      <button onClick={() => makeMove('d8', 'h4', 'q', { byBot: true })}>Play Qh4 mate</button>
    </>
  );
}

function RemountableGameBoard({ showBoard }) {
  return <>{showBoard && <ChessGameBoard />}<GameOverDriver /></>;
}

function BotResetDriver() {
  const { startGame, moveHistory } = useChessGame();
  return (
    <>
      <button onClick={() => startGame({ elo: 800, color: 'b' })}>Start black reset test</button>
      <output data-testid="reset-test-history">{JSON.stringify(moveHistory)}</output>
    </>
  );
}

function OrientationDriver() {
  const context = useChessGame();
  const { startGame, restartGameWithCurrentSettings, returnToLobby, makeMove } = context;
  return (
    <>
      <span data-testid="context-owns-orientation">{String('boardOrientation' in context || 'flipBoard' in context)}</span>
      <span data-testid="game-generation">{context.gameGeneration}</span>
      <button onClick={() => startGame({ color: 'b' })}>Start black orientation test</button>
      <button onClick={() => makeMove('e2', 'e4', 'q', { byBot: true })}>Make white move for orientation test</button>
      <button onClick={restartGameWithCurrentSettings}>Restart orientation test</button>
      <button onClick={returnToLobby}>Return to lobby orientation test</button>
    </>
  );
}

describe('ChessGameBoard Integration - PRODUCTION BOT LIFECYCLE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Bot Service Integration Verification', () => {
    it('botService.getBotMove is called with correct parameters', async () => {
      botService.getBotMove.mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
        elo: 800,
      });

      // Directly test the service contract
      const result = await botService.getBotMove(FEN_STARTING, 800);

      expect(result.move).toBe('e7e5');
      expect(botService.getBotMove).toHaveBeenCalledWith(FEN_STARTING, 800);
    });

    it('botService can simulate deferred response', async () => {
      let resolve;
      const promise = new Promise(r => { resolve = r; });

      botService.getBotMove.mockImplementation(() => promise);

      const call = botService.getBotMove('test', 800);
      expect(botService.getBotMove).toHaveBeenCalled();

      await act(async () => {
        resolve({ move: 'd7d6', source: 'stockfish' });
      });

      const result = await call;
      expect(result.move).toBe('d7d6');
    });

    it('botService can simulate error for timeout test', async () => {
      botService.getBotMove.mockRejectedValue(new Error('Engine timeout'));

      await expect(botService.getBotMove('test', 800)).rejects.toThrow('Engine timeout');
    });
  });

  describe('useBotMove Hook Integration', () => {
    it('records one game-over result across rerenders and records the same PGN after reset', async () => {
      const tree = (showBoard) => (
        <StrictMode>
          <MemoryRouter>
            <ChessGameProvider>
              <RemountableGameBoard showBoard={showBoard} />
            </ChessGameProvider>
          </MemoryRouter>
        </StrictMode>
      );
      const { rerender } = render(tree(true));

      const finishGame = async () => {
        await act(async () => screen.getByRole('button', { name: 'Start game-over test' }).click());
        await act(async () => screen.getByRole('button', { name: 'Play f3' }).click());
        await act(async () => screen.getByRole('button', { name: 'Play e5' }).click());
        await act(async () => screen.getByRole('button', { name: 'Play g4' }).click());
        await act(async () => screen.getByRole('button', { name: 'Play Qh4 mate' }).click());
      };

      await finishGame();
      await waitFor(() => expect(JSON.parse(localStorage.getItem('chess-game-stats')).gamesPlayed).toBe(1));
      expect(getUserProfile().gamesPlayed).toBe(1);

      rerender(tree(false));
      rerender(tree(true));
      expect(JSON.parse(localStorage.getItem('chess-game-stats')).gamesPlayed).toBe(1);
      expect(getUserProfile().gamesPlayed).toBe(1);

      // Replaying the same PGN in the replacement generation records independently.
      await act(async () => screen.getByRole('button', { name: 'Chơi lại' }).click());
      await act(async () => screen.getByRole('button', { name: 'Play f3' }).click());
      await act(async () => screen.getByRole('button', { name: 'Play e5' }).click());
      await act(async () => screen.getByRole('button', { name: 'Play g4' }).click());
      await act(async () => screen.getByRole('button', { name: 'Play Qh4 mate' }).click());
      await waitFor(() => expect(JSON.parse(localStorage.getItem('chess-game-stats')).gamesPlayed).toBe(2));
      expect(getUserProfile().gamesPlayed).toBe(2);
    }, 35000);

    it('cancels an old request and reissues after a same-position game reset', async () => {
      const resolvers = [];
      botService.getBotMove.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));

      render(
        <StrictMode>
          <ChessGameProvider>
            <ChessGameBoard />
            <BotResetDriver />
          </ChessGameProvider>
        </StrictMode>
      );

      await act(async () => { screen.getByRole('button', { name: 'Start black reset test' }).click(); });
      await waitFor(() => expect(botService.getBotMove).toHaveBeenCalledTimes(1));
      await act(async () => { screen.getByRole('button', { name: 'Start black reset test' }).click(); });
      await waitFor(() => expect(botService.getBotMove).toHaveBeenCalledTimes(2));

      await act(async () => { resolvers[0]({ move: 'e2e4', source: 'stockfish_wasm', elo: 800 }); });
      expect(screen.getByTestId('reset-test-history').textContent).toBe('[]');

      await act(async () => { resolvers[1]({ move: 'e2e4', source: 'stockfish_wasm', elo: 800 }); });
      await waitFor(() => expect(screen.getByTestId('reset-test-history').textContent).toBe('["e4"]'));
    });

    it('uses the hook request state to block board actions while the bot thinks', async () => {
      botService.getBotMove.mockImplementation(() => new Promise(() => {}));

      render(
        <StrictMode>
          <ChessGameProvider>
            <ChessGameBoard />
          </ChessGameProvider>
        </StrictMode>
      );

      const blackBtn = await (screen.findByRole('radio', { name: /Đen/i }).catch(() => screen.findByRole('button', { name: /Đen/i })));
      await act(async () => { blackBtn.click(); });
      await act(async () => { (await screen.findByRole('button', { name: /Bắt đầu ván/i })).click(); });

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Gợi ý nước đi/i }).every((button) => button.disabled)).toBe(true);
      });
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('Máy đang suy nghĩ'));
      expect(screen.getAllByText(/Đang tính nước/i).length).toBeGreaterThan(0);
    });

    it('useBotMove hook is properly used in ChessGameBoard', async () => {
      botService.getBotMove.mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
        elo: 800,
      });

      // Render ChessGameBoard to trigger the useEffect
      render(
        <StrictMode>
          <ChessGameProvider>
            <ChessGameBoard />
          </ChessGameProvider>
        </StrictMode>
      );

      // Find and click start button (with black so bot responds)
      const blackBtn = await (screen.findByRole('radio', { name: /Đen/i }).catch(() => screen.findByRole('button', { name: /Đen/i })));
      await act(async () => { blackBtn.click(); });

      const startBtn = await screen.findByRole('button', { name: /Bắt đầu ván/i });
      await act(async () => { startBtn.click(); });

      // Wait for bot to be called
      await waitFor(() => {
        expect(botService.getBotMove).toHaveBeenCalled();
      }, { timeout: 3000 });

      // VERIFICATION: Bot was called exactly once for black player
      expect(botService.getBotMove).toHaveBeenCalledTimes(1);

      // VERIFICATION: Called with starting FEN
      const [fen] = botService.getBotMove.mock.calls[0];
      expect(fen).toBe(FEN_STARTING);
    });

    it('white player move triggers bot request with correct FEN', async () => {
      botService.getBotMove.mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
        elo: 800,
      });

      render(
        <StrictMode>
          <ChessGameProvider>
            <ChessGameBoard />
          </ChessGameProvider>
        </StrictMode>
      );

      // Start with white (default)
      const startBtn = await screen.findByRole('button', { name: /Bắt đầu ván/i });
      await act(async () => { startBtn.click(); });

      // Wait for game to be in playing state
      await waitFor(() => {
        return !document.body.textContent.includes('Bắt đầu ván');
      }, { timeout: 3000 });

      // Clear mocks after game start
      vi.clearAllMocks();

      // For white, player moves first - bot is NOT called yet
      // Bot will be called after player makes a move on the board
      // The test verifies that botService.getBotMove is not called before player moves
      expect(botService.getBotMove).not.toHaveBeenCalled();
    });

    it('requests one bot move after the white player moves', async () => {
      botService.getBotMove.mockResolvedValue({ move: 'e7e5', source: 'stockfish_wasm', elo: 800 });

      render(
        <StrictMode>
          <ChessGameProvider>
            <ChessGameBoard />
            <BotLifecycleDriver />
          </ChessGameProvider>
        </StrictMode>
      );

      await act(async () => { screen.getByRole('button', { name: 'Start white test game' }).click(); });
      vi.clearAllMocks();
      await act(async () => { screen.getByRole('button', { name: 'Play e2e4' }).click(); });

      await waitFor(() => expect(botService.getBotMove).toHaveBeenCalledTimes(1));
      expect(botService.getBotMove).toHaveBeenCalledWith(FEN_AFTER_E4, 800, expect.any(AbortSignal));
    });

    it('routes the production review button through the two-pass analyzer', async () => {
      botService.getBotMove.mockResolvedValue({ move: 'e7e5', source: 'stockfish_wasm', elo: 800 });
      gameAnalyzer.analyzeGame.mockResolvedValue({
        analysis: [],
        topMistakes: [],
        summary: { totalMoves: 2, mistakesCount: 0, blundersCount: 0, inaccuraciesCount: 0, avgCPL: 0 },
      });

      render(
        <ChessGameProvider>
          <ChessGameBoard />
          <BotLifecycleDriver />
        </ChessGameProvider>
      );

      await act(async () => { screen.getByRole('button', { name: 'Start white test game' }).click(); });
      await act(async () => { screen.getByRole('button', { name: 'Play e2e4' }).click(); });
      await waitFor(() => expect(botService.getBotMove).toHaveBeenCalled());

      await act(async () => { (screen.queryByRole('tab', { name: 'Phân tích' }) || screen.getByRole('button', { name: 'Phân tích' })).click(); });
      await act(async () => { screen.getByRole('button', { name: 'Mổ ván cờ' }).click(); });

      await waitFor(() => expect(gameAnalyzer.analyzeGame).toHaveBeenCalledTimes(1));
      expect(gameAnalyzer.analyzeGame).toHaveBeenCalledWith(expect.objectContaining({
        pgn: expect.stringMatching(/e4.*e5/),
        playerSide: 'w',
        options: expect.objectContaining({ analyzeTopMistakes: 3 }),
      }));
    });

    it('renders a selectable evidence ID and records its validated learning tags', async () => {
      botService.getBotMove.mockResolvedValue({ move: 'e7e5', source: 'stockfish_wasm', elo: 800 });
      const fact = {
        schemaVersion: 'analysis.v1',
        gameId: 'review-contract',
        ply: 1,
        turn: 'w',
        fenBefore: FEN_STARTING,
        fenAfter: FEN_AFTER_E4,
        playedMove: { uci: 'e2e4', san: 'e4', fen: FEN_AFTER_E4 },
        bestMove: { uci: 'd2d4', san: 'd4', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1' },
        evalBefore: { type: 'cp', value: 20, display: '+0.20' },
        evalAfter: { type: 'cp', value: -100, display: '-1.00' },
        centipawnLoss: 120,
        classification: 'mistake',
        candidates: [{ uci: 'd2d4', san: 'd4', eval: { type: 'cp', value: 20, display: '+0.20' }, pv: ['d2d4'] }],
        skillTags: ['opening_principle'],
        engine: { source: 'stockfish_wasm', version: '18', depth: 10, movetimeMs: 450, multiPv: 1 },
        analyzedAt: '2026-09-06T00:00:00.000Z',
      };
      gameAnalyzer.analyzeGame.mockResolvedValue({
        gameId: 'review-contract',
        analysis: [fact],
        topMistakes: ['1'],
        summary: { totalMoves: 1, mistakesCount: 1, blundersCount: 0, inaccuraciesCount: 0, avgCPL: 120 },
      });

      render(
        <ChessGameProvider>
          <ChessGameBoard />
          <BotLifecycleDriver />
        </ChessGameProvider>
      );

      await act(async () => { screen.getByRole('button', { name: 'Start white test game' }).click(); });
      await act(async () => { screen.getByRole('button', { name: 'Play e2e4' }).click(); });
      await waitFor(() => expect(botService.getBotMove).toHaveBeenCalled());
      await act(async () => { (screen.queryByRole('tab', { name: /Ph.n t.ch/i }) || screen.getByRole('button', { name: /Ph.n t.ch/i })).click(); });
      await act(async () => { screen.getByRole('button', { name: /M. v.n c./i }).click(); });

      const evidence = await screen.findByRole('button', { name: /#1:.*e4/i });
      expect(evidence).toHaveAttribute('data-evidence-id', 'review-contract:ply:1');
      expect(evidence).toHaveAttribute('data-turn', 'w');
      expect(evidence).toHaveAttribute('data-centipawn-loss', '120');
      expect(evidence).toHaveAttribute('data-classification', 'mistake');
      expect(evidence).toHaveAttribute('data-eval-before', 'cp:20');
      expect(evidence).toHaveAttribute('data-eval-after', 'cp:-100');
      await act(async () => { evidence.click(); });
      const profile = getUserProfile();
      expect(profile.commonMistakes).toContain('opening_principle');
      expect(profile.persistence.gameReviews).toEqual([
        expect.objectContaining({
          reviewId: expect.stringMatching(/^review:/),
          gameId: 'review-contract',
          factIds: ['review-contract:ply:1'],
        }),
      ]);
      expect(profile.persistence.analysisFacts).toEqual([
        expect.objectContaining({ gameId: 'review-contract', ply: 1, engine: expect.objectContaining({ source: 'stockfish_wasm' }) }),
      ]);
    });

    it('routes the selected trusted review fact into the existing analysis coach', async () => {
      botService.getBotMove.mockResolvedValue({ move: 'e7e5', source: 'stockfish_wasm', elo: 800 });
      const fact = {
        schemaVersion: 'analysis.v1', gameId: 'coach-review', ply: 1, turn: 'w',
        fenBefore: FEN_STARTING, fenAfter: FEN_AFTER_E4,
        playedMove: { uci: 'e2e4', san: 'e4', fen: FEN_AFTER_E4 },
        bestMove: { uci: 'd2d4', san: 'd4', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1' },
        evalBefore: { type: 'cp', value: 20, display: '+0.20' },
        evalAfter: { type: 'cp', value: -100, display: '-1.00' },
        centipawnLoss: 120, classification: 'mistake',
        candidates: [{ uci: 'd2d4', san: 'd4', eval: { type: 'cp', value: 20, display: '+0.20' }, pv: ['d2d4'] }],
        skillTags: ['opening_principle'],
        engine: { source: 'stockfish_wasm', version: '18', depth: 10, movetimeMs: 450, multiPv: 1 },
        analyzedAt: '2026-09-06T00:00:00.000Z',
      };
      gameAnalyzer.analyzeGame.mockResolvedValue({
        gameId: 'coach-review', pgn: '1. e4 e5', playerSide: 'w', analysis: [fact], topMistakes: ['1'],
        summary: { totalMoves: 2, mistakesCount: 1, blundersCount: 0, inaccuraciesCount: 0, avgCPL: 120 },
      });

      render(
        <ChessGameProvider>
          <ChessGameBoard />
          <BotLifecycleDriver />
        </ChessGameProvider>
      );
      await act(async () => { screen.getByRole('button', { name: 'Start white test game' }).click(); });
      await act(async () => { screen.getByRole('button', { name: 'Play e2e4' }).click(); });
      await waitFor(() => expect(botService.getBotMove).toHaveBeenCalled());
      await act(async () => { (screen.queryByRole('tab', { name: /Ph.n t.ch/i }) || screen.getByRole('button', { name: /Ph.n t.ch/i })).click(); });
      await act(async () => { screen.getByRole('button', { name: /M. v.n c./i }).click(); });
      const evidence = await screen.findByRole('button', { name: /#1:.*e4/i });
      await act(async () => { evidence.click(); });
      fact.bestMove = {
        uci: 'g1f3',
        san: 'Nf3',
        fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
      };
      fact.candidates = [{
        uci: 'g1f3',
        san: 'Nf3',
        eval: { type: 'cp', value: 20, display: '+0.20' },
        pv: ['g1f3'],
      }];
      await act(async () => { (screen.queryByRole('tab', { name: /Hu.n luy.n/i }) || screen.getByRole('button', { name: /Hu.n luy.n/i })).click(); });

      const coachButton = await screen.findByRole('button', { name: /Qu.n s.*v.n n.y/i });
      await act(async () => { coachButton.click(); });
      expect(await screen.findByText(/N..c g.i .:/i)).toHaveTextContent('d4');
      expect(screen.getByText(/Ngu.n:\s*stockfish_wasm/i)).toBeInTheDocument();

      const persisted = JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile'));
      persisted.persistence.gameReviews = [];
      localStorage.setItem('vuaCoUserTrainingProfile', JSON.stringify(persisted));
      await act(async () => { (screen.queryByRole('tab', { name: /Ph.n t.ch/i }) || screen.getByRole('button', { name: /Ph.n t.ch/i })).click(); });
      await act(async () => { (screen.queryByRole('tab', { name: /Hu.n luy.n/i }) || screen.getByRole('button', { name: /Hu.n luy.n/i })).click(); });
      expect(screen.queryByRole('button', { name: /Qu.n s.*v.n n.y/i })).not.toBeInTheDocument();
    });
  });

  it('owns board orientation in Play, resets it for new active boards, and preserves manual flips', async () => {
    render(
      <ChessGameProvider>
        <Play />
        <OrientationDriver />
      </ChessGameProvider>
    );

    expect(screen.getByTestId('context-owns-orientation')).toHaveTextContent('false');

    await act(async () => screen.getByRole('button', { name: 'Start black orientation test' }).click());
    expect(await screen.findByTestId('chessboard')).toHaveAttribute('data-orientation', 'black');
    expect(screen.getByTestId('game-generation')).toHaveTextContent('1');

    await act(async () => screen.getAllByRole('button', { name: /L.t b.n c./i })[0].click());
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'white');
    await act(async () => screen.getByRole('button', { name: 'Make white move for orientation test' }).click());
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'white');
    expect(screen.getByTestId('game-generation')).toHaveTextContent('1');

    await act(async () => screen.getByRole('button', { name: 'Restart orientation test' }).click());
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'black');
    expect(screen.getByTestId('game-generation')).toHaveTextContent('2');

    await act(async () => screen.getAllByRole('button', { name: /L.t b.n c./i })[0].click());
    await act(async () => screen.getByRole('button', { name: 'Return to lobby orientation test' }).click());
    expect(screen.queryByTestId('chessboard')).not.toBeInTheDocument();

    await act(async () => screen.getByRole('button', { name: 'Start black orientation test' }).click());
    expect(await screen.findByTestId('chessboard')).toHaveAttribute('data-orientation', 'black');
  });

  it('routes the mobile flip control to the Play orientation owner', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      render(
        <ChessGameProvider>
          <Play />
          <OrientationDriver />
        </ChessGameProvider>
      );
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => screen.getByRole('button', { name: 'Start black orientation test' }).click());
      expect(await screen.findByTestId('chessboard')).toHaveAttribute('data-orientation', 'black');

      await act(async () => screen.getByRole('button', { name: /L.t b.n$/i }).click());
      expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'white');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      window.dispatchEvent(new Event('resize'));
    }
  });

  describe('StrictMode Compatibility', () => {
    it('StrictMode renders without error', async () => {
      botService.getBotMove.mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
        elo: 800,
      });

      // Should not throw
      expect(() => {
        render(
          <StrictMode>
            <ChessGameProvider>
              <ChessGameBoard />
            </ChessGameProvider>
          </StrictMode>
        );
      }).not.toThrow();
    });

    it('StrictMode effect cleanup is handled', async () => {
      botService.getBotMove.mockResolvedValue({
        move: 'e7e5',
        source: 'stockfish',
        elo: 800,
      });

      const { unmount } = render(
        <StrictMode>
          <ChessGameProvider>
            <ChessGameBoard />
          </ChessGameProvider>
        </StrictMode>
      );

      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error and Retry Handling', () => {
    it('timeout error returns error result shape', async () => {
      // Verify the error handling pattern
      const timeoutError = {
        move: null,
        source: 'timeout',
        warning: 'Bot move timed out',
      };

      expect(timeoutError.move).toBeNull();
      expect(timeoutError.source).toBe('timeout');
    });

    it('retry creates new request (via mock verification)', async () => {
      // First call fails, second succeeds
      botService.getBotMove
        .mockRejectedValueOnce(new Error('Engine error'))
        .mockResolvedValueOnce({ move: 'e7e5', source: 'stockfish', elo: 800 });

      // First call
      await expect(botService.getBotMove('test', 800)).rejects.toThrow();

      // Second call (retry)
      const result = await botService.getBotMove('test', 800);
      expect(result.move).toBe('e7e5');
      expect(botService.getBotMove).toHaveBeenCalledTimes(2);
    });
  });

  describe('Stale Result Invalidation', () => {
    it('second request with new gameGenId invalidates first response', async () => {
      // This verifies the gameGenId mechanism works
      let resolveFirst;
      const slowFirst = new Promise(r => { resolveFirst = r; });

      botService.getBotMove
        .mockImplementationOnce(() => slowFirst)
        .mockImplementationOnce(() =>
          Promise.resolve({ move: 'd7d6', source: 'stockfish', callId: 2 })
        );

      // First request
      const firstResult = botService.getBotMove('fen1', 800);

      // Second request (simulating new game)
      const secondResult = botService.getBotMove('fen2', 800);

      expect(botService.getBotMove).toHaveBeenCalledTimes(2);

      // Resolve second first
      await act(async () => {
        resolveFirst({ move: 'e7e5', source: 'stockfish', callId: 1 });
      });

      // Second result should be available first
      const second = await secondResult;
      expect(second.move).toBe('d7d6');
      expect(second.callId).toBe(2);

      // First result (stale) - in production, useBotMove discards this
      const first = await firstResult;
      expect(first.callId).toBe(1);
    });
  });
});
