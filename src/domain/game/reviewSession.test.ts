import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { reviewSessionReducer, createReviewSession } from './reviewSession';

function playedGame(...moves: string[]) {
  const game = new Chess();
  moves.forEach((move) => game.move(move));
  return game;
}

function cloneGame(game: Chess) {
  const copy = new Chess();
  copy.loadPgn(game.pgn());
  return copy;
}

describe('reviewSessionReducer', () => {
  it('enters from a completed game snapshot at its final ply', () => {
    const game = playedGame('e4', 'e5', 'Nf3');
    const state = reviewSessionReducer(createReviewSession(), {
      type: 'ENTER', game, mainline: game.history(), rootFen: new Chess().fen(),
    });

    expect(state.game.fen()).toBe(game.fen());
    expect(state.mainline).toEqual(['e4', 'e5', 'Nf3']);
    expect(state.ply).toBe(3);
  });

  it('tracks ephemeral analysis move and undo positions without changing the mainline', () => {
    const base = playedGame('e4', 'e5');
    const entered = reviewSessionReducer(createReviewSession(), { type: 'ENTER', game: base, mainline: base.history(), rootFen: new Chess().fen() });
    const moved = cloneGame(entered.game);
    moved.move('Nf3');
    const afterMove = reviewSessionReducer(entered, { type: 'POSITION_REPLACED', game: moved });
    const undone = cloneGame(afterMove.game);
    undone.undo();
    const afterUndo = reviewSessionReducer(afterMove, { type: 'POSITION_REPLACED', game: undone });

    expect(afterMove.ply).toBe(3);
    expect(afterMove.mainline).toEqual(['e4', 'e5']);
    expect(afterUndo.ply).toBe(2);
    expect(afterUndo.game.fen()).toBe(base.fen());
  });

  it('clamps navigation and replays only the bounded mainline prefix', () => {
    const base = playedGame('e4', 'e5', 'Nf3');
    const entered = reviewSessionReducer(createReviewSession(), { type: 'ENTER', game: base, mainline: base.history(), rootFen: new Chess().fen() });
    const start = reviewSessionReducer(entered, { type: 'NAVIGATE', ply: -5 });
    const end = reviewSessionReducer(start, { type: 'NAVIGATE', ply: 99 });

    expect(start.ply).toBe(0);
    expect(start.game.history()).toEqual([]);
    expect(end.ply).toBe(3);
    expect(end.game.history()).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('resets the review session', () => {
    const base = playedGame('e4');
    const entered = reviewSessionReducer(createReviewSession(), { type: 'ENTER', game: base, mainline: base.history(), rootFen: new Chess().fen() });
    const reset = reviewSessionReducer(entered, { type: 'RESET' });

    expect(reset.ply).toBe(0);
    expect(reset.mainline).toEqual([]);
    expect(reset.game.history()).toEqual([]);
  });

  it('keeps independent copies of games passed to ENTER and POSITION_REPLACED', () => {
    const source = playedGame('e4');
    const entered = reviewSessionReducer(createReviewSession(), {
      type: 'ENTER', game: source, mainline: source.history(), rootFen: new Chess().fen(),
    });
    source.move('e5');
    expect(entered.game.history()).toEqual(['e4']);

    const replacement = cloneGame(entered.game);
    replacement.move('c5');
    const replaced = reviewSessionReducer(entered, { type: 'POSITION_REPLACED', game: replacement });
    replacement.move('Nf3');
    expect(replaced.game.history()).toEqual(['e4', 'c5']);
  });

  it('replays navigation from a custom starting FEN', () => {
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
    const game = new Chess(rootFen);
    game.move('e4');
    const entered = reviewSessionReducer(createReviewSession(), {
      type: 'ENTER', game, mainline: game.history(), rootFen,
    });
    const root = reviewSessionReducer(entered, { type: 'NAVIGATE', ply: 0 });
    const afterMove = reviewSessionReducer(root, { type: 'NAVIGATE', ply: 1 });

    expect(entered.rootFen).toBe(rootFen);
    expect(root.game.fen()).toBe(rootFen);
    expect(afterMove.game.history()).toEqual(['e4']);
    expect(afterMove.game.fen()).toBe(game.fen());
  });

  it('clears annotations and pending analysis on reset', () => {
    const pending = reviewSessionReducer(createReviewSession(), {
      type: 'LIVE_MOVE_PENDING', requestId: 4,
      move: { beforeFen: 'before', afterFen: 'after', playedUci: 'e2e4', moveIndex: 0, color: 'w', san: 'e4' },
    });
    const reset = reviewSessionReducer(pending, { type: 'RESET' });
    expect(reset.annotations).toEqual({});
    expect(reset.pendingLiveMoveAnalysis).toBeNull();
  });

  it('settles analysis with an explicit unavailable annotation when evaluation is missing', () => {
    const pending = reviewSessionReducer(createReviewSession(), {
      type: 'LIVE_MOVE_PENDING', requestId: 4,
      move: { beforeFen: 'before', afterFen: 'after', playedUci: 'e2e4', moveIndex: 0, color: 'w', san: 'e4' },
    });
    const failed = reviewSessionReducer(pending, { type: 'LIVE_MOVE_FAILED', requestId: 4 });

    expect(failed.pendingLiveMoveAnalysis).toBeNull();
    expect(failed.annotations[0]).toEqual({ symbol: '...', label: 'Chưa phân tích được', tone: 'pending' });
  });

  it('copies annotations passed to LIVE_MOVE_ANALYZED', () => {
    const pending = reviewSessionReducer(createReviewSession(), {
      type: 'LIVE_MOVE_PENDING', requestId: 1,
      move: { beforeFen: 'before', afterFen: 'after', playedUci: 'e2e4', moveIndex: 0, color: 'w', san: 'e4' },
    });
    const annotation = { symbol: '!', label: 'Good', tone: 'good' };
    const analyzed = reviewSessionReducer(pending, { type: 'LIVE_MOVE_ANALYZED', requestId: 1, annotation });
    annotation.label = 'mutated';

    expect(analyzed.annotations[0]).toEqual({ symbol: '!', label: 'Good', tone: 'good' });
  });

  it('trims undone move annotations and ignores stale analysis results after a new move', () => {
    const first = reviewSessionReducer(createReviewSession(), {
      type: 'LIVE_MOVE_PENDING', requestId: 1,
      move: { beforeFen: 'before-1', afterFen: 'after-1', playedUci: 'e2e4', moveIndex: 0, color: 'w', san: 'e4' },
    });
    const second = reviewSessionReducer(first, {
      type: 'LIVE_MOVE_PENDING', requestId: 2,
      move: { beforeFen: 'before-2', afterFen: 'after-2', playedUci: 'd2d4', moveIndex: 1, color: 'w', san: 'd4' },
    });
    expect(second.annotations[0]).toEqual({ symbol: '...', label: 'Chưa phân tích được', tone: 'pending' });
    expect(second.pendingLiveMoveAnalysis?.requestId).toBe(2);
    const stale = reviewSessionReducer(second, {
      type: 'LIVE_MOVE_ANALYZED', requestId: 1, annotation: { symbol: '!', label: 'Good', tone: 'good' },
    });
    const analyzed = reviewSessionReducer(stale, {
      type: 'LIVE_MOVE_ANALYZED', requestId: 2, annotation: { symbol: '!!', label: 'Great', tone: 'great' },
    });
    const undone = reviewSessionReducer(analyzed, { type: 'TRIM_ANNOTATIONS', retainedPly: 1 });

    expect(stale.annotations[0]).toEqual({ symbol: '...', label: 'Chưa phân tích được', tone: 'pending' });
    expect(stale.pendingLiveMoveAnalysis?.requestId).toBe(2);
    expect(analyzed.annotations[1]).toEqual({ symbol: '!!', label: 'Great', tone: 'great' });
    expect(undone.annotations).toEqual({ 0: { symbol: '...', label: 'Chưa phân tích được', tone: 'pending' } });
    expect(undone.pendingLiveMoveAnalysis).toBeNull();
  });

  it('preserves annotations when leaving a review session', () => {
    const pending = reviewSessionReducer(createReviewSession(), {
      type: 'LIVE_MOVE_PENDING', requestId: 1,
      move: { beforeFen: 'before', afterFen: 'after', playedUci: 'e2e4', moveIndex: 0, color: 'w', san: 'e4' },
    });
    const annotated = reviewSessionReducer(pending, {
      type: 'LIVE_MOVE_ANALYZED', requestId: 1, annotation: { symbol: '!', label: 'Good', tone: 'good' },
    });
    const secondPending = reviewSessionReducer(annotated, {
      type: 'LIVE_MOVE_PENDING', requestId: 2,
      move: { beforeFen: 'before-2', afterFen: 'after-2', playedUci: 'g1f3', moveIndex: 1, color: 'w', san: 'Nf3' },
    });
    const exited = reviewSessionReducer(secondPending, { type: 'EXIT' });

    expect(exited.annotations[0]).toEqual({ symbol: '!', label: 'Good', tone: 'good' });
    expect(exited.pendingLiveMoveAnalysis?.requestId).toBe(2);
  });
});
