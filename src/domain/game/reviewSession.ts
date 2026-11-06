import { Chess } from 'chess.js';

export interface ReviewSession {
  game: Chess;
  mainline: string[];
  ply: number;
  rootFen: string;
  annotations: Record<number, MoveAnnotation>;
  pendingLiveMoveAnalysis: LiveMoveAnalysis | null;
}

export interface MoveAnnotation {
  symbol: string;
  label: string;
  tone: string;
}

export interface LiveMoveAnalysis {
  requestId: number;
  beforeFen: string;
  afterFen: string;
  playedUci: string;
  moveIndex: number;
  color: 'w' | 'b';
  san: string;
}

export type ReviewSessionAction =
  | { type: 'ENTER'; game: Chess; mainline: string[]; rootFen: string }
  | { type: 'POSITION_REPLACED'; game: Chess }
  | { type: 'NAVIGATE'; ply: number }
  | { type: 'LIVE_MOVE_PENDING'; requestId: number; move: Omit<LiveMoveAnalysis, 'requestId'> }
  | { type: 'LIVE_MOVE_ANALYZED'; requestId: number; annotation: MoveAnnotation }
  | { type: 'LIVE_MOVE_FAILED'; requestId: number }
  | { type: 'TRIM_ANNOTATIONS'; retainedPly: number }
  | { type: 'EXIT' }
  | { type: 'RESET' };

export function createReviewSession(): ReviewSession {
  const game = new Chess();
  return { game, mainline: [], ply: 0, rootFen: game.fen(), annotations: {}, pendingLiveMoveAnalysis: null };
}

function resetPosition(state: ReviewSession, clearPending = true): ReviewSession {
  const fresh = createReviewSession();
  return {
    ...state,
    game: fresh.game,
    mainline: [],
    ply: 0,
    rootFen: fresh.rootFen,
    pendingLiveMoveAnalysis: clearPending ? null : state.pendingLiveMoveAnalysis,
  };
}

export function getGameRootFen(game: Chess): string {
  return game.getHeaders().FEN || (game.history().length === 0 ? game.fen() : new Chess().fen());
}

function copyGame(game: Chess): Chess {
  const copy = new Chess();
  if (game.history().length) copy.loadPgn(game.pgn());
  else copy.load(game.fen());
  return copy;
}

export function reviewSessionReducer(state: ReviewSession, action: ReviewSessionAction): ReviewSession {
  switch (action.type) {
    case 'ENTER':
      return {
        ...state,
        game: copyGame(action.game), mainline: [...action.mainline], ply: action.mainline.length,
        rootFen: action.rootFen,
      };
    case 'POSITION_REPLACED':
      return { ...state, game: copyGame(action.game), ply: action.game.history().length };
    case 'NAVIGATE': {
      const ply = Math.max(0, Math.min(action.ply, state.mainline.length));
      const game = new Chess(state.rootFen);
      state.mainline.slice(0, ply).forEach((san) => {
        try {
          game.move(san);
        } catch {
          // Preserve existing behavior: skip invalid mainline entries.
        }
      });
      return { ...state, game, ply };
    }
    case 'LIVE_MOVE_PENDING': {
      const move = { ...action.move, requestId: action.requestId };
      const annotations = { ...state.annotations };
      if (state.pendingLiveMoveAnalysis) {
        const { moveIndex } = state.pendingLiveMoveAnalysis;
        annotations[moveIndex] = { symbol: '...', label: 'Chưa phân tích được', tone: 'pending' };
      }
      return {
        ...state,
        pendingLiveMoveAnalysis: move,
        annotations: { ...annotations, [move.moveIndex]: { symbol: '...', label: 'Đang phân tích', tone: 'pending' } },
      };
    }
    case 'LIVE_MOVE_ANALYZED': {
      const pending = state.pendingLiveMoveAnalysis;
      if (!pending || pending.requestId !== action.requestId) return state;
      const { moveIndex } = pending;
      return { ...state, pendingLiveMoveAnalysis: null, annotations: { ...state.annotations, [moveIndex]: { ...action.annotation } } };
    }
    case 'LIVE_MOVE_FAILED': {
      const pending = state.pendingLiveMoveAnalysis;
      if (!pending || pending.requestId !== action.requestId) return state;
      const { moveIndex } = pending;
      return {
        ...state,
        pendingLiveMoveAnalysis: null,
        annotations: { ...state.annotations, [moveIndex]: { symbol: '...', label: 'Chưa phân tích được', tone: 'pending' } },
      };
    }
    case 'TRIM_ANNOTATIONS': {
      const annotations = Object.fromEntries(Object.entries(state.annotations).filter(([index]) => Number(index) < action.retainedPly));
      const pending = state.pendingLiveMoveAnalysis;
      return {
        ...state,
        annotations,
        pendingLiveMoveAnalysis: pending && pending.moveIndex < action.retainedPly ? pending : null,
      };
    }
    case 'EXIT':
      return resetPosition(state, false);
    case 'RESET':
      return createReviewSession();
  }
}
