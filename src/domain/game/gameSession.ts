import { Chess, type Color, type Square } from 'chess.js';
import { getGameOutcome, type GameOutcome } from './gameOutcome';
import { transitionGamePhase, type GameEvent, type GamePhase } from './gameLifecycle';

export interface GameSession {
  game: Chess;
  outcome: GameOutcome | null;
  phase: GamePhase;
  playerColor: Color;
  generation: number;
  pendingPromotion: { from: Square; to: Square; color: Color } | null;
}

export type GameSessionAction =
  | { type: 'START_GAME'; game: Chess; playerColor: Color }
  | { type: 'MOVE_COMMITTED'; game: Chess }
  | { type: 'UNDO'; game: Chess }
  | { type: 'RESET_POSITION'; game: Chess }
  | { type: 'SET_PLAYER_COLOR'; playerColor: Color }
  | { type: 'PROMOTION_REQUESTED'; promotion: { from: Square; to: Square; color: Color } }
  | { type: 'PROMOTION_CANCELLED' }
  | { type: 'TIMEOUT'; winner: Color }
  | { type: 'OFFER_DRAW_ACCEPTED' }
  | { type: 'EVENT'; event: GameEvent };

export function createInitialGameSession(): GameSession {
  return { game: new Chess(), outcome: null, phase: 'lobby', playerColor: 'w', generation: 0, pendingPromotion: null };
}

export function gameSessionReducer(state: GameSession, action: GameSessionAction): GameSession {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, game: action.game, phase: 'playing', outcome: null, playerColor: action.playerColor, pendingPromotion: null };
    case 'MOVE_COMMITTED':
      return {
        ...state,
        game: action.game,
        outcome: getGameOutcome(action.game),
        phase: action.game.isGameOver() ? transitionGamePhase(state.phase, 'GAME_END') : state.phase,
        pendingPromotion: null,
      };
    case 'UNDO':
      return { ...state, game: action.game, phase: transitionGamePhase(state.phase, 'START_GAME'), outcome: null, pendingPromotion: null };
    case 'RESET_POSITION':
      return { ...state, game: action.game, generation: state.generation + 1, outcome: null, pendingPromotion: null };
    case 'SET_PLAYER_COLOR':
      return { ...state, playerColor: action.playerColor };
    case 'PROMOTION_REQUESTED':
      return { ...state, pendingPromotion: action.promotion };
    case 'PROMOTION_CANCELLED':
      return { ...state, pendingPromotion: null };
    case 'TIMEOUT':
      return {
        ...state,
        outcome: { reason: 'timeout', winner: action.winner },
        phase: transitionGamePhase(state.phase, 'GAME_END'),
      };
    case 'OFFER_DRAW_ACCEPTED':
      return {
        ...state,
        outcome: { reason: 'draw', winner: null },
        phase: transitionGamePhase(state.phase, 'GAME_END'),
      };
    case 'EVENT':
      return {
        ...state,
        phase: transitionGamePhase(state.phase, action.event),
        outcome: action.event === 'RESET' ? null
          : action.event === 'RESIGN' && state.phase === 'playing'
            ? { reason: 'resignation', winner: state.playerColor === 'w' ? 'b' : 'w' }
            : state.outcome,
        pendingPromotion: ['RESET', 'RESIGN', 'ENTER_ANALYSIS', 'EXIT_ANALYSIS'].includes(action.event)
          ? null
          : state.pendingPromotion,
      };
    default:
      return state;
  }
}
