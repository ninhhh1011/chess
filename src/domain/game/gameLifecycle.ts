export type GamePhase = 'lobby' | 'playing' | 'game_over' | 'review' | 'analysis';

export type GameEvent =
  | 'START_GAME'
  | 'GAME_END'
  | 'RESIGN'
  | 'ENTER_REVIEW'
  | 'ENTER_ANALYSIS'
  | 'EXIT_ANALYSIS'
  | 'RESET';

export function transitionGamePhase(phase: GamePhase, event: GameEvent): GamePhase {
  switch (event) {
    case 'START_GAME':
      return 'playing';
    case 'GAME_END':
    case 'RESIGN':
      return phase === 'playing' ? 'game_over' : phase;
    case 'ENTER_REVIEW':
      return phase === 'game_over' ? 'review' : phase;
    case 'ENTER_ANALYSIS':
      return phase === 'review' ? 'analysis' : phase;
    case 'EXIT_ANALYSIS':
      return phase === 'analysis' ? 'review' : phase;
    case 'RESET':
      return 'lobby';
    default:
      return phase;
  }
}
