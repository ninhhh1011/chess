import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChessGameProvider, useChessGame } from '../contexts/ChessGameContext';
import ChessGameBoard from './ChessGameBoard';
import PostGameReview from './chess/PostGameReview';
import { getUserProfile } from '../services/userProfileService';
import { RESULT_COPY } from '../config/brand';
import * as sound from '../utils/sound';

vi.mock('../hooks/useBotMove', () => ({ useBotMove: () => ({ getMove: vi.fn(), cancelMove: vi.fn(), isThinking: false }) }));
vi.mock('../services/stockfishService', () => ({ analyzeFen: vi.fn().mockResolvedValue({}) }));
vi.mock('../utils/sound', () => ({
  playCheckSound: vi.fn(), playVictorySound: vi.fn(), playDefeatSound: vi.fn(),
  playDrawSound: vi.fn(), playMoveSound: vi.fn(), playCaptureSound: vi.fn(),
}));
vi.mock('./chess/GameLayout', () => ({ default: () => null }));

let game;
function Driver() {
  game = useChessGame();
  return game.playState === 'review' ? <PostGameReview /> : null;
}
function tree(showBoard = true) {
  return <StrictMode><MemoryRouter><ChessGameProvider>
    {showBoard && <ChessGameBoard />}<Driver />
  </ChessGameProvider></MemoryRouter></StrictMode>;
}
async function move(from, to) {
  await act(async () => game.makeMove(from, to, undefined, { byBot: game.currentTurn !== game.playerColor }));
}

describe('canonical game result consumers', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('chess-game-stats', JSON.stringify({ gamesPlayed: 0, gamesWon: 0, gamesLost: 0, gamesDrawn: 0, totalMoves: 0, totalPlayTime: 0 }));
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it.each(['w', 'b'])('records a %s player checkmate win and agrees with review and audio', async (color) => {
    render(tree());
    await act(async () => game.startGame({ color }));
    const moves = color === 'b'
      ? ['f2f3', 'e7e5', 'g2g4', 'd8h4']
      : ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7'];
    for (const uci of moves) await move(uci.slice(0, 2), uci.slice(2));

    expect(screen.getByText(RESULT_COPY.win.title)).toBeInTheDocument();
    expect(getUserProfile()).toMatchObject({ gamesPlayed: 1, lastGameResult: 'win' });
    expect(JSON.parse(localStorage.getItem('chess-game-stats'))).toMatchObject({ gamesPlayed: 1, gamesWon: 1, gamesLost: 0, gamesDrawn: 0 });
    expect(sound.playVictorySound).toHaveBeenCalledTimes(1);
    expect(sound.playDefeatSound).not.toHaveBeenCalled();
    expect(sound.playDrawSound).not.toHaveBeenCalled();
  });

  it('records resignation once across rerenders and board remount, agreeing with review and audio', async () => {
    const { rerender } = render(tree());
    await act(async () => game.startGame({ color: 'w' }));
    await act(async () => game.resignGame());
    expect(game.game.isGameOver()).toBe(false);
    expect(screen.getByText(RESULT_COPY.lose.title)).toBeInTheDocument();
    expect(getUserProfile()).toMatchObject({ gamesPlayed: 1, lastGameResult: 'lose' });
    expect(JSON.parse(localStorage.getItem('chess-game-stats'))).toMatchObject({ gamesPlayed: 1, gamesWon: 0, gamesLost: 1, gamesDrawn: 0 });
    expect(sound.playDefeatSound).toHaveBeenCalledTimes(1);
    expect(sound.playVictorySound).not.toHaveBeenCalled();
    expect(sound.playDrawSound).not.toHaveBeenCalled();
    rerender(tree(false));
    rerender(tree(true));
    await act(async () => game.resignGame());
    expect(getUserProfile().gamesPlayed).toBe(1);
    expect(JSON.parse(localStorage.getItem('chess-game-stats')).gamesPlayed).toBe(1);
    expect(sound.playDefeatSound).toHaveBeenCalledTimes(1);
  });
});
