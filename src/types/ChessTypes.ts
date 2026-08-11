// Evaluation types
export interface Evaluation {
  type: 'cp' | 'mate';
  value: number;
  display: string;
}

// Engine result types
export interface AnalysisResult {
  success: boolean;
  source: 'stockfish_wasm' | 'stockfish_wasm_partial' | 'fallback';
  fen: string;
  bestMove: string | null;
  evaluation: Evaluation | null;
  depth: number;
  pv: string[];
  raw: string[];
  warning?: string;
}

// Engine config types
export interface EngineConfig {
  fen: string;
  depth?: number;
  movetime?: number | null;
  elo?: number | null;
  skillLevel?: number | null;
  useSkillLevelOnly?: boolean;
  purpose?: string;
}

// Bot types
export interface BotConfig {
  elo: number;
  depth: number;
  movetime: number;
  skillLevel: number;
  randomChance: number;
  useSkillLevelOnly: boolean;
}

export interface BotMoveResult {
  move: string | null;
  source: string;
  elo: number;
  depth: number;
  movetime: number;
  skillLevel: number;
  evaluation?: Evaluation;
  warning?: string;
}

// Coach types
export type CoachLevel = 'noob' | 'beginner' | 'intermediate' | 'advanced';
export type CoachMode = 'hint' | 'explain_position' | 'review_game' | 'chat';

export interface CoachPayload {
  message: string;
  fen?: string;
  history?: string[];
  pgn?: string;
  level: CoachLevel;
  mode: CoachMode;
  userProfile?: Record<string, unknown>;
  recommendations?: Record<string, unknown>;
  stockfish?: {
    evaluation: Evaluation | null;
    bestMove: string | null;
  };
}

export interface CoachResponse {
  reply: string;
  source: 'ai' | 'fallback';
  suggestedActions: string[];
}

// User profile types
export interface UserProfile {
  currentLevel: CoachLevel;
  gamesPlayed?: number;
  exerciseStats?: {
    total?: number;
    accuracy?: number;
  };
  commonMistakes?: string[];
  weaknesses?: string[];
  strengths?: string[];
}
