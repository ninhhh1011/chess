import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBotMove } from './useBotMove';
import * as ChessGameContext from '../contexts/ChessGameContext';
import * as botService from '../services/botService';
import { Chess } from 'chess.js';

vi.mock('../services/botService', () => ({
  getBotMove: vi.fn(),
  uciToMoveObject: vi.fn(),
}));

describe('useBotMove', () => {
  const mockMakeMove = vi.fn();
  const mockSetIsBotThinking = vi.fn();
  const mockSetBotMoveSource = vi.fn();
  const mockSetBotRequestId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers bot move correctly', async () => {
    const game = new Chess(); // White to move
    game.move('e4'); // Now Black to move

    vi.spyOn(ChessGameContext, 'useChessGame').mockReturnValue({
      game,
      gameMode: 'bot',
      playerColor: 'w',
      botElo: 1200,
      isBotThinking: false,
      setIsBotThinking: mockSetIsBotThinking,
      setBotMoveSource: mockSetBotMoveSource,
      botRequestIdRef: { current: 0 },
      setBotRequestId: mockSetBotRequestId,
      pendingPromotion: false,
      isGameOver: false,
      makeMove: mockMakeMove,
      GAME_MODES: { BOT: 'bot' },
    });

    botService.getBotMove.mockResolvedValueOnce({ move: 'e7e5', source: 'stockfish' });
    botService.uciToMoveObject.mockReturnValueOnce({ from: 'e7', to: 'e5', promotion: '' });

    renderHook(() => useBotMove());

    await waitFor(() => {
      expect(mockSetIsBotThinking).toHaveBeenCalledWith(true);
      expect(mockMakeMove).toHaveBeenCalledWith('e7', 'e5', 'q', { byBot: true, sourceFen: game.fen() });
      expect(mockSetIsBotThinking).toHaveBeenCalledWith(false);
    });
  });

  it('does not trigger if not bot turn', () => {
    const game = new Chess(); // White to move

    vi.spyOn(ChessGameContext, 'useChessGame').mockReturnValue({
      game,
      gameMode: 'bot',
      playerColor: 'w', // Bot is black
      botElo: 1200,
      isBotThinking: false,
      setIsBotThinking: mockSetIsBotThinking,
      setBotMoveSource: mockSetBotMoveSource,
      botRequestIdRef: { current: 0 },
      setBotRequestId: mockSetBotRequestId,
      pendingPromotion: false,
      isGameOver: false,
      makeMove: mockMakeMove,
      GAME_MODES: { BOT: 'bot' },
    });

    renderHook(() => useBotMove());

    expect(mockSetIsBotThinking).not.toHaveBeenCalled();
    expect(botService.getBotMove).not.toHaveBeenCalled();
  });
});
