import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { createInitialGameSession, gameSessionReducer } from './gameSession';

describe('gameSessionReducer', () => {
  it('starts with generation zero and increments once per replacement position', () => {
    const initial = createInitialGameSession();
    const firstReplacement = gameSessionReducer(initial, { type: 'RESET_POSITION', game: new Chess() });
    const secondReplacement = gameSessionReducer(firstReplacement, { type: 'RESET_POSITION', game: new Chess() });

    expect(initial.generation).toBe(0);
    expect(firstReplacement.generation).toBe(1);
    expect(secondReplacement.generation).toBe(2);
  });

  it('keeps generation unchanged for moves, undo, player color, and lifecycle events', () => {
    const initial = createInitialGameSession();
    const playing = gameSessionReducer(initial, { type: 'START_GAME', game: new Chess(), playerColor: 'w' });
    const moved = gameSessionReducer(playing, { type: 'MOVE_COMMITTED', game: new Chess() });
    const undone = gameSessionReducer(moved, { type: 'UNDO', game: new Chess() });
    const recolored = gameSessionReducer(undone, { type: 'SET_PLAYER_COLOR', playerColor: 'b' });
    const lifecycleChanged = gameSessionReducer(recolored, { type: 'EVENT', event: 'RESIGN' });

    expect([playing.generation, moved.generation, undone.generation, recolored.generation, lifecycleChanged.generation])
      .toEqual([0, 0, 0, 0, 0]);
  });

  it('starts a bot game with one position and player side', () => {
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'START_GAME',
      game: new Chess(),
      playerColor: 'b',
    });

    expect(started).toMatchObject({ phase: 'playing', playerColor: 'b' });
    expect(started.game.fen()).toBe(new Chess().fen());
  });

  it('moves a terminal position into game_over', () => {
    const finished = new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'START_GAME',
      game: new Chess(),
      playerColor: 'w',
    });
    const next = gameSessionReducer(started, {
      type: 'MOVE_COMMITTED',
      game: finished,
    });

    expect(next.phase).toBe('game_over');
    expect(next.game.fen()).toBe(finished.fen());
  });

  it('resets the position and returns the lifecycle to lobby', () => {
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'START_GAME',
      game: new Chess(),
      playerColor: 'w',
    });
    const lobby = gameSessionReducer(started, { type: 'EVENT', event: 'RESET' });

    expect(lobby.phase).toBe('lobby');
    expect(lobby.game.fen()).toBe(new Chess().fen());
  });

  it('owns pending promotion and clears it on cancel or move commit', () => {
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'START_GAME',
      game: new Chess(),
      playerColor: 'w',
    });
    const pending = gameSessionReducer(started, {
      type: 'PROMOTION_REQUESTED',
      promotion: { from: 'a7', to: 'a8', color: 'w' },
    });

    expect(pending.pendingPromotion).toEqual({ from: 'a7', to: 'a8', color: 'w' });
    expect(gameSessionReducer(pending, { type: 'PROMOTION_CANCELLED' }).pendingPromotion).toBeNull();
    expect(gameSessionReducer(pending, { type: 'MOVE_COMMITTED', game: new Chess() }).pendingPromotion).toBeNull();
  });

  it('clears pending promotion when entering or leaving analysis', () => {
    const started = gameSessionReducer(createInitialGameSession(), {
      type: 'START_GAME',
      game: new Chess(),
      playerColor: 'w',
    });
    const pending = gameSessionReducer(started, {
      type: 'PROMOTION_REQUESTED',
      promotion: { from: 'a7', to: 'a8', color: 'w' },
    });
    const gameOver = gameSessionReducer(pending, { type: 'EVENT', event: 'GAME_END' });
    const review = gameSessionReducer(gameOver, { type: 'EVENT', event: 'ENTER_REVIEW' });
    const analysis = gameSessionReducer(review, { type: 'EVENT', event: 'ENTER_ANALYSIS' });
    const resumed = gameSessionReducer(
      gameSessionReducer(analysis, {
        type: 'PROMOTION_REQUESTED',
        promotion: { from: 'a7', to: 'a8', color: 'w' },
      }),
      { type: 'EVENT', event: 'EXIT_ANALYSIS' },
    );

    expect(analysis.pendingPromotion).toBeNull();
    expect(resumed.pendingPromotion).toBeNull();
  });
});

describe('session outcome ownership', () => {
  const start = (playerColor: 'w' | 'b' = 'w') => gameSessionReducer(createInitialGameSession(), { type: 'START_GAME', game: new Chess(), playerColor });
  const finish = () => gameSessionReducer(start(), { type: 'MOVE_COMMITTED', game: new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1') });

  it('derives the live committed position outcome', () => {
    expect(start().outcome).toBeNull();
    expect(gameSessionReducer(start(), { type: 'MOVE_COMMITTED', game: new Chess() }).outcome).toBeNull();
    expect(finish().outcome).toEqual({ reason: 'checkmate', winner: 'w' });
    expect(gameSessionReducer(start(), { type: 'MOVE_COMMITTED', game: new Chess('7k/8/5K2/8/8/8/8/8 w - - 0 1') }).outcome).toEqual({ reason: 'draw', winner: null });
  });

  it.each(['w', 'b'] as const)('records a valid %s resignation as an opponent win', (color) => {
    const resigned = gameSessionReducer(start(color), { type: 'EVENT', event: 'RESIGN' });
    expect(resigned).toMatchObject({ phase: 'game_over', outcome: { reason: 'resignation', winner: color === 'w' ? 'b' : 'w' } });
    expect(resigned.game.isGameOver()).toBe(false);
  });

  it('ignores resignation outside playing and preserves completed outcomes', () => {
    expect(gameSessionReducer(createInitialGameSession(), { type: 'EVENT', event: 'RESIGN' }).outcome).toBeNull();
    let completed = finish();
    for (const event of ['RESIGN', 'ENTER_REVIEW', 'RESIGN', 'ENTER_ANALYSIS', 'RESIGN', 'EXIT_ANALYSIS'] as const) {
      completed = gameSessionReducer(completed, { type: 'EVENT', event });
      expect(completed.outcome).toEqual({ reason: 'checkmate', winner: 'w' });
    }
  });

  it('clears completed outcomes on start, replacement, undo, and reset', () => {
    const completed = finish();
    const actions = [
      { type: 'START_GAME', game: new Chess(), playerColor: 'b' },
      { type: 'RESET_POSITION', game: new Chess() },
      { type: 'UNDO', game: new Chess() },
      { type: 'EVENT', event: 'RESET' },
    ] as const;
    for (const action of actions) expect(gameSessionReducer(completed, action).outcome).toBeNull();
  });
});
