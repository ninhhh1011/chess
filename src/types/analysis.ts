/**
 * Phase 1: Game Analysis Types
 *
 * Canonical schema for chess game analysis using Stockfish engine.
 */

// Evaluation types
// Note: This matches the engine Evaluation from ChessTypes.ts
export interface Evaluation {
  type: 'cp' | 'mate';
  /** Centipawn score (perspective-normalized) or mate-in-N */
  value: number;
  /** Human-readable display string */
  display: string;
}

// Move notation
export interface MoveNotation {
  uci: string;       // e.g., "e2e4"
  san: string;        // e.g., "e4"
  fen: string;        // Position after move
}

export interface CandidateLine {
  uci: string;
  san: string;
  eval: Evaluation;
  pv: string[];  // Principal variation
}

// Classification levels for moves
export type MoveClassification =
  | 'best'         // Perfect move
  | 'excellent'    // Very good
  | 'good'         // Acceptable
  | 'inaccuracy'   // Slight error (CPL 30-80)
  | 'mistake'      // Error (CPL 80-200)
  | 'blunder'      // Serious error (CPL 200+)
  | 'forced'       // Only move available
  | 'unclassified'; // Cannot determine

// Skill tags for mistakes
export type SkillTag =
  | 'hung_piece'
  | 'missed_capture'
  | 'missed_mate'
  | 'back_rank'
  | 'opening_principle'
  | 'king_safety'
  | 'tactical_oversight'
  | 'endgame_conversion'
  | 'unclassified';

// Engine source info
export interface EngineInfo {
  source: 'stockfish_wasm';
  version: string;
  depth?: number;
  movetimeMs?: number;
  multiPv: number;
}

/**
 * Canonical analysis fact for a single move
 */
export interface AnalysisFactV1 {
  schemaVersion: 'analysis.v1';
  gameId: string;
  ply: number;        // Half-move number (1 = white's first move)
  turn: 'w' | 'b';   // Side that played
  fenBefore: string;  // Position before move
  fenAfter: string;   // Position after move
  playedMove: MoveNotation;
  bestMove: MoveNotation;
  evalBefore: Evaluation;
  evalAfter: Evaluation;
  /** Centipawn loss (null if best move) */
  centipawnLoss: number | null;
  classification: MoveClassification;
  candidates: CandidateLine[];
  skillTags: SkillTag[];
  engine: EngineInfo;
  /** ISO timestamp of analysis */
  analyzedAt: string;
}

/**
 * Game analysis result
 */
export interface GameAnalysis {
  schemaVersion: 'gameAnalysis.v1';
  gameId: string;
  pgn: string;
  /** Player who made mistakes */
  playerSide: 'w' | 'b';
  analysis: AnalysisFactV1[];
  /** Top N mistakes/blunders */
  topMistakes: string[];  // ply numbers
  summary: {
    totalMoves: number;
    mistakesCount: number;
    blundersCount: number;
    inaccuraciesCount: number;
    avgCPL: number | null;
  };
  engine: EngineInfo;
  analyzedAt: string;
  /** Analysis duration in ms */
  durationMs: number;
}

/**
 * PGN import result
 */
export interface PgnImportResult {
  success: boolean;
  pgn: string;
  headers: Record<string, string>;
  moves: string[];  // SAN moves
  result?: string;
  error?: string;
}

/**
 * Analysis request
 */
export interface AnalyzeGameRequest {
  gameId: string;
  pgn: string;
  playerSide: 'w' | 'b';
  options: {
    maxDepth: number;
    movetimeMs: number;
    multiPv: number;
    /** Number of top mistakes to deep-analyze */
    analyzeTopMistakes: number;
  };
}

/**
 * Analysis progress
 */
export interface AnalysisProgress {
  phase: 'loading' | 'replaying' | 'shallow' | 'deep' | 'done' | 'error';
  currentPly: number;
  totalPlies: number;
  percentage: number;
  message: string;
}

/**
 * Post-analysis review item
 */
export interface ReviewItem {
  fact: AnalysisFactV1;
  boardPosition: string;  // FEN to display
  comparison: {
    played: MoveNotation;
    suggested: MoveNotation;
  };
  explanation: {
    classification: MoveClassification;
    cpl: number | null;
    tags: SkillTag[];
    engineInsight: string;
  };
}

/**
 * Coach context from analysis
 */
export interface CoachContext {
  facts: AnalysisFactV1[];
  topMistakes: string[];
  playerSide: 'w' | 'b';
  moveContext?: {
    played: string;
    best: string;
    ply: number;
    fen: string;
  };
}

/**
 * Coach response from analysis facts
 */
export interface CoachResponse {
  reply: string;
  suggestions: string[];
  moveHint?: string;
}
