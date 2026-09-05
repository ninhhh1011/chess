/**
 * Phase 2: Real Corpus and Provenance
 *
 * Versioned schemas for corpus management with full provenance tracking.
 */

/**
 * License metadata for corpus sources
 */
export interface LicenseInfo {
  id: string;
  name: string;
  url: string;
  commercialUse?: boolean;
  attributionRequired?: boolean;
  modificationAllowed?: boolean;
}

/**
 * Corpus source registration
 */
export interface CorpusSource {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  license: LicenseInfo;
  sourceVersion: string;
  retrievedAt: string;  // ISO timestamp
  rawSha256: string;    // SHA-256 of raw download
  recordCount?: number;
}

/**
 * Import run metadata
 */
export interface ImportRun {
  runId: string;
  sourceId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'rolled_back';
  parserVersion: string;
  validationVersion: string;
  engineVersion: string;
  corpusVersion: string;
  downloadedCount: number;
  parsedCount: number;
  acceptedCount: number;
  quarantinedCount: number;
  duplicateCount: number;
  illegalFenCount: number;
  illegalMoveCount: number;
  engineDisagreementCount: number;
  errorCount: number;
  manifestSha256?: string;
  notes?: string;
}

/**
 * Quarantine reason codes
 */
export type QuarantineReason =
  | 'illegal_fen'
  | 'illegal_move'
  | 'duplicate_fen'
  | 'duplicate_solution'
  | 'engine_disagreement'
  | 'parse_error'
  | 'missing_required_field'
  | 'invalid_fen_format'
  | 'game_not_solvable'
  | 'solution_rejected'
  | 'license_incompatible';

/**
 * Quarantined record with reason
 */
export interface QuarantinedRecord {
  recordId: string;
  sourceId: string;
  importRunId: string;
  quarantineReason: QuarantineReason;
  quarantineReasonDetail?: string;
  rawData?: Record<string, unknown>;
  attemptedAt: string;
  reviewedAt?: string;
  releasedAt?: string;
}

/**
 * Chess motifs for categorization
 */
export type ChessMotif =
  | 'mate_1'
  | 'mate_2'
  | 'mate_3_plus'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered_attack'
  | 'back_rank_mate'
  | 'smothered_mate'
  | 'queen_sacrifice'
  | 'castling'
  | 'endgame_conversion'
  | 'opening_trap'
  | 'positional_advantage'
  | 'tactics'
  | 'defensive_move'
  | 'blunder'
  | 'mistake'
  | 'inaccuracy'
  | 'pawn_structure'
  | 'king_safety'
  | 'development'
  | 'material_advantage'
  | 'initiative'
  | 'prophylaxis'
  | ' Zugzwang'
  | 'repetition';

/**
 * Difficulty levels
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Game phase
 */
export type GamePhase = 'opening' | 'middlegame' | 'endgame' | 'transition';

/**
 * Side to move
 */
export type SideToMove = 'w' | 'b';

/**
 * A puzzle/motivation exercise
 */
export interface Puzzle {
  puzzleId: string;

  // Provenance
  sourceId: string;
  sourceUrl?: string;
  sourcePuzzleId?: string;
  licenseId: string;
  sourceVersion: string;
  retrievedAt: string;
  rawSha256: string;
  recordSha256: string;
  importRunId: string;
  parserVersion: string;
  validationVersion: string;
  engineVersion: string;
  corpusVersion: string;

  // Position
  fen: string;
  sideToMove: SideToMove;
  gamePhase: GamePhase;

  // Solution
  correctMoves: string[];    // SAN notation
  acceptedLines: string[][];  // Alternative accepted lines
  rejectedLines: string[][];  // Lines that lead to failure

  // Categorization
  motifs: ChessMotif[];
  difficulty: DifficultyLevel;

  // Metadata
  themes?: string[];
  rating?: number;           // Lichess-style rating
  plays?: number;            // Times attempted
  solutions?: number;         // Times solved
  popularity?: number;       // Popularity score

  // Validation
  validatedAt?: string;
  validationErrors?: string[];

  // For puzzles with unique ID generation
  id?: string;
}

/**
 * Opening tree entry
 */
export interface OpeningEntry {
  id: string;

  // Provenance
  sourceId: string;
  licenseId: string;
  sourceVersion: string;
  retrievedAt: string;
  recordSha256: string;
  importRunId: string;
  corpusVersion: string;

  // Position
  fen: string;
  eco?: string;              // ECO classification
  openingName?: string;
  variation?: string;

  // Moves
  moves: string[];           // SAN moves from this position
  frequency?: number;         // How often this position occurs

  // Annotations
  description?: string;
  typicalPlans?: string[];
}

/**
 * Game analysis position
 */
export interface GamePosition {
  id: string;
  fen: string;
  ply: number;
  move?: string;              // SAN of move leading to this position
  evaluation?: number;         // Centipawns
  mate?: number;              // Mate in N
  bestMove?: string;          // UCI format
  classification?: string;
}

/**
 * Candidate move with evaluation
 */
export interface CandidateMove {
  uci: string;
  san: string;
  evaluation: number;
  mate?: number;
  probability?: number;
  isBest: boolean;
}

/**
 * Solution line
 */
export interface SolutionLine {
  moves: string[];           // SAN notation
  evaluation?: number;
  mate?: number;
  comments?: string[];
}

/**
 * Validation result for a single record
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

/**
 * Corpus manifest - generated after import
 */
export interface CorpusManifest {
  manifestVersion: string;
  generatedAt: string;
  corpusVersion: string;

  // Counts
  puzzleCount: number;
  openingCount: number;

  // Distributions
  motifDistribution: Record<ChessMotif, number>;
  difficultyDistribution: Record<DifficultyLevel, number>;
  phaseDistribution: Record<GamePhase, number>;
  sourceDistribution: Record<string, number>;
  licenseDistribution: Record<string, number>;

  // Validation
  quarantinedCount: number;
  duplicateCount: number;

  // Integrity
  totalSha256: string;
  manifestSha256: string;

  // Import runs
  importRuns: ImportRun[];
}

/**
 * Corpus quality report
 */
export interface CorpusQualityReport {
  generatedAt: string;
  corpusVersion: string;

  // Counts
  downloadedCount: number;
  parsedCount: number;
  acceptedCount: number;
  quarantinedCount: number;
  duplicateCount: number;
  illegalFenCount: number;
  illegalMoveCount: number;
  engineDisagreementCount: number;

  // Distributions
  motifDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  licenseDistribution: Record<string, number>;

  // Integrity
  manifestSha256: string;

  // Validation details
  quarantineReasons: Record<QuarantineReason, number>;
  validationErrorsByField: Record<string, number>;
}

/**
 * Index entry for fast lookup
 */
export interface PuzzleIndex {
  byId: Record<string, string>;        // puzzleId -> index key
  byFen: Record<string, string[]>;     // fen -> puzzleIds
  byMotif: Record<ChessMotif, string[]>;  // motif -> puzzleIds
  byDifficulty: Record<DifficultyLevel, string[]>;
  byPhase: Record<GamePhase, string[]>;
  byEco: Record<string, string[]>;      // eco code -> puzzleIds
  bySource: Record<string, string[]>;  // sourceId -> puzzleIds
}

/**
 * Corrupted file reference
 */
export interface CorruptedFile {
  filePath: string;
  expectedSha256: string;
  actualSha256: string;
  detectedAt: string;
}
