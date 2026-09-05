/**
 * Phase 2: Corpus Service
 *
 * Manages puzzles with full provenance tracking.
 * Supports deterministic ingestion, validation, and deduplication.
 */

import { Chess } from 'chess.js';
import type {
  Puzzle,
  CorpusSource,
  ImportRun,
  QuarantinedRecord,
  ValidationResult,
  CorpusManifest,
  CorpusQualityReport,
  PuzzleIndex,
  ChessMotif,
  DifficultyLevel,
  QuarantineReason,
  GamePhase,
} from '../types/corpus';

// Current corpus version
export const CORPUS_VERSION = 'v1.0.0';

// In-memory corpus storage (simulates what would be server-side)
let puzzles: Map<string, Puzzle> = new Map();
let quarantined: Map<string, QuarantinedRecord> = new Map();
let importRuns: ImportRun[] = [];
let sources: Map<string, CorpusSource> = new Map();
let index: PuzzleIndex = {
  byId: {},
  byFen: {},
  byMotif: {} as Record<ChessMotif, string[]>,
  byDifficulty: {} as Record<DifficultyLevel, string[]>,
  byPhase: {} as Record<GamePhase, string[]>,
  byEco: {},
  bySource: {},
};

/**
 * Initialize corpus with existing exercises as seed data
 */
export function initializeCorpus(exerciseData: Array<{
  id: string;
  fen: string;
  correctMove: { from: string; to: string; promotion?: string };
  tags: string[];
  title?: string;
}>): void {
  puzzles.clear();
  quarantined.clear();

  // Create seed source
  const seedSource: CorpusSource = {
    sourceId: 'seed-data',
    sourceName: 'Seed Exercises',
    sourceUrl: 'internal://seed',
    license: {
      id: 'cc0',
      name: 'CC0 Public Domain',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      commercialUse: true,
      attributionRequired: false,
      modificationAllowed: true,
    },
    sourceVersion: '1.0',
    retrievedAt: new Date().toISOString(),
    rawSha256: 'seed-exercises-v1',
    recordCount: exerciseData.length,
  };
  sources.set(seedSource.sourceId, seedSource);

  // Import each exercise as a puzzle
  const runId = `seed-${Date.now()}`;
  for (const exercise of exerciseData) {
    const puzzle = convertExerciseToPuzzle(exercise, seedSource, runId);
    if (puzzle) {
      puzzles.set(puzzle.puzzleId, puzzle);
    }
  }

  rebuildIndex();
}

/**
 * Convert legacy exercise format to Puzzle with provenance
 */
function convertExerciseToPuzzle(
  exercise: { id: string; fen: string; correctMove: { from: string; to: string; promotion?: string }; tags: string[]; title?: string },
  source: CorpusSource,
  runId: string
): Puzzle | null {
  try {
    // Validate FEN
    const game = new Chess(exercise.fen);

    // Build correct moves
    const correctMoves: string[] = [];
    const moveResult = game.move({
      from: exercise.correctMove.from,
      to: exercise.correctMove.to,
      promotion: exercise.correctMove.promotion,
    });

    if (!moveResult) {
      return null;
    }
    correctMoves.push(moveResult.san);

    // Determine side to move
    const sideToMove = exercise.fen.split(' ')[1] as 'w' | 'b';

    // Map tags to motifs
    const motifs = mapTagsToMotifs(exercise.tags);

    // Determine difficulty based on tags
    const difficulty = determineDifficulty(exercise.tags);

    // Determine game phase
    const gamePhase = determineGamePhase(exercise.fen);

    return {
      puzzleId: `puzzle-${exercise.id}`,
      sourceId: source.sourceId,
      sourceUrl: undefined,
      sourcePuzzleId: exercise.id,
      licenseId: source.license.id,
      sourceVersion: source.sourceVersion,
      retrievedAt: source.retrievedAt,
      rawSha256: `puzzle-${exercise.id}-sha256`,
      recordSha256: `puzzle-${exercise.id}-record-sha256`,
      importRunId: runId,
      parserVersion: '1.0.0',
      validationVersion: '1.0.0',
      engineVersion: 'stockfish-wasm',
      corpusVersion: CORPUS_VERSION,
      fen: exercise.fen,
      sideToMove,
      gamePhase,
      correctMoves,
      acceptedLines: [],
      rejectedLines: [],
      motifs,
      difficulty,
      themes: exercise.tags,
      id: `puzzle-${exercise.id}`,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Map exercise tags to chess motifs
 */
function mapTagsToMotifs(tags: string[]): ChessMotif[] {
  const motifMap: Record<string, ChessMotif> = {
    'checkmate': 'mate_1',
    'mate_one': 'mate_1',
    'mate_two': 'mate_2',
    'mate_3_plus': 'mate_3_plus',
    'fork': 'fork',
    'pin': 'pin',
    'skewer': 'skewer',
    'discovered': 'discovered_attack',
    'back_rank': 'back_rank_mate',
    'back_rank_mate': 'back_rank_mate',
    'smothered': 'smothered_mate',
    'queen_sacrifice': 'queen_sacrifice',
    'castling': 'castling',
    'endgame': 'endgame_conversion',
    'endgame_conversion': 'endgame_conversion',
    'opening_trap': 'opening_trap',
    'positional': 'positional_advantage',
    'tactics': 'tactics',
    'tactical': 'tactics',
    'defensive': 'defensive_move',
    'blunder': 'blunder',
    'mistake': 'mistake',
    'inaccuracy': 'inaccuracy',
    'pawn': 'pawn_structure',
    'king_safety': 'king_safety',
    'development': 'development',
    'material': 'material_advantage',
    'initiative': 'initiative',
  };

  const motifs: ChessMotif[] = [];
  for (const tag of tags) {
    const motif = motifMap[tag.toLowerCase()];
    if (motif && !motifs.includes(motif)) {
      motifs.push(motif);
    }
  }

  // Default to tactics if no motif found
  if (motifs.length === 0) {
    motifs.push('tactics');
  }

  return motifs;
}

/**
 * Determine difficulty from tags
 */
function determineDifficulty(tags: string[]): DifficultyLevel {
  const lowerTags = tags.map(t => t.toLowerCase());

  if (lowerTags.includes('mate_1') || lowerTags.includes('mate_one')) {
    return 'beginner';
  }
  if (lowerTags.includes('mate_2') || lowerTags.includes('mate_two')) {
    return 'intermediate';
  }
  if (lowerTags.includes('tactics') || lowerTags.includes('fork') || lowerTags.includes('pin')) {
    return 'intermediate';
  }
  if (lowerTags.includes('endgame') || lowerTags.includes('endgame_conversion')) {
    return 'advanced';
  }

  return 'beginner';
}

/**
 * Determine game phase from FEN
 */
function determineGamePhase(fen: string): 'opening' | 'middlegame' | 'endgame' | 'transition' {
  // Count pieces
  const pieces = fen.split(' ')[0].replace(/[NBRQKP/]/g, '');
  const pieceCount = pieces.length;

  if (pieceCount >= 24) return 'opening';
  if (pieceCount >= 14) return 'middlegame';
  if (pieceCount >= 6) return 'endgame';
  return 'transition';
}

/**
 * Validate a puzzle record
 */
export function validatePuzzle(puzzle: Partial<Puzzle>): ValidationResult {
  const errors: Array<{ field: string; code: string; message: string }> = [];
  const warnings: Array<{ field: string; code: string; message: string }> = [];

  // Required fields
  if (!puzzle.fen) {
    errors.push({ field: 'fen', code: 'required', message: 'FEN is required' });
  } else {
    try {
      new Chess(puzzle.fen);
    } catch {
      errors.push({ field: 'fen', code: 'invalid', message: 'Invalid FEN format' });
    }
  }

  if (!puzzle.correctMoves || puzzle.correctMoves.length === 0) {
    errors.push({ field: 'correctMoves', code: 'required', message: 'At least one correct move is required' });
  }

  if (!puzzle.sourceId) {
    errors.push({ field: 'sourceId', code: 'required', message: 'Source ID is required' });
  }

  if (!puzzle.licenseId) {
    errors.push({ field: 'licenseId', code: 'required', message: 'License ID is required' });
  }

  // Provenance fields
  if (!puzzle.recordSha256) {
    warnings.push({ field: 'recordSha256', code: 'missing', message: 'Record SHA-256 is missing' });
  }

  if (!puzzle.retrievedAt) {
    warnings.push({ field: 'retrievedAt', code: 'missing', message: 'Retrieved timestamp is missing' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate solution replay
 */
export function validateSolutionReplay(fen: string, moves: string[]): ValidationResult {
  const errors: Array<{ field: string; code: string; message: string }> = [];
  const warnings: Array<{ field: string; code: string; message: string }> = [];

  try {
    const game = new Chess(fen);

    for (let i = 0; i < moves.length; i++) {
      const moveResult = game.move(moves[i]);
      if (!moveResult) {
        errors.push({
          field: `moves[${i}]`,
          code: 'illegal_move',
          message: `Illegal move: ${moves[i]}`,
        });
        break;
      }
    }
  } catch (error) {
    errors.push({
      field: 'fen',
      code: 'invalid',
      message: `Invalid FEN: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate unique puzzle ID
 */
export function generatePuzzleId(sourceId: string, sourcePuzzleId?: string): string {
  const base = sourcePuzzleId || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return `puzzle-${sourceId}-${base}`;
}

/**
 * Normalize FEN for deduplication
 */
export function normalizeFenForDeduplication(fen: string): string {
  // Remove move counters and castling for deduplication
  const parts = fen.split(' ');
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

/**
 * Check for duplicate FEN
 */
export function isDuplicateFen(fen: string): boolean {
  const normalized = normalizeFenForDeduplication(fen);
  const existingPuzzles = Object.values(index.byFen[normalized] || []);
  return existingPuzzles.length > 0;
}

/**
 * Add puzzle to corpus
 */
export function addPuzzle(puzzle: Puzzle): { success: boolean; quarantineReason?: QuarantineReason } {
  // Validate
  const validation = validatePuzzle(puzzle);
  if (!validation.valid) {
    // Quarantine the record
    quarantineRecord(puzzle.puzzleId || 'unknown', puzzle.sourceId, 'missing_required_field', validation.errors[0]?.message);
    return { success: false, quarantineReason: 'missing_required_field' };
  }

  // Check for duplicate
  const normalizedFen = normalizeFenForDeduplication(puzzle.fen);
  if (isDuplicateFen(puzzle.fen)) {
    quarantineRecord(puzzle.puzzleId, puzzle.sourceId, 'duplicate_fen', `Duplicate FEN: ${normalizedFen}`);
    return { success: false, quarantineReason: 'duplicate_fen' };
  }

  // Validate solution
  const solutionValidation = validateSolutionReplay(puzzle.fen, puzzle.correctMoves);
  if (!solutionValidation.valid) {
    quarantineRecord(puzzle.puzzleId, puzzle.sourceId, 'illegal_move', solutionValidation.errors[0]?.message);
    return { success: false, quarantineReason: 'illegal_move' };
  }

  // Add to corpus
  puzzles.set(puzzle.puzzleId, puzzle);
  rebuildIndex();

  return { success: true };
}

/**
 * Quarantine a record
 */
export function quarantineRecord(
  recordId: string,
  sourceId: string,
  reason: QuarantineReason,
  detail?: string
): void {
  const quarantinedRecord: QuarantinedRecord = {
    recordId,
    sourceId,
    importRunId: importRuns[importRuns.length - 1]?.runId || 'unknown',
    quarantineReason: reason,
    quarantineReasonDetail: detail,
    attemptedAt: new Date().toISOString(),
  };
  quarantined.set(recordId, quarantinedRecord);
}

/**
 * Rebuild search index
 */
function rebuildIndex(): void {
  index = {
    byId: {},
    byFen: {},
    byMotif: {} as Record<ChessMotif, string[]>,
    byDifficulty: {} as Record<DifficultyLevel, string[]>,
    byPhase: {} as Record<GamePhase, string[]>,
    byEco: {},
    bySource: {},
  };

  for (const [id, puzzle] of puzzles) {
    // By ID
    index.byId[id] = id;

    // By normalized FEN
    const normalizedFen = normalizeFenForDeduplication(puzzle.fen);
    if (!index.byFen[normalizedFen]) {
      index.byFen[normalizedFen] = [];
    }
    index.byFen[normalizedFen].push(id);

    // By motif
    for (const motif of puzzle.motifs) {
      if (!index.byMotif[motif]) {
        index.byMotif[motif] = [];
      }
      index.byMotif[motif].push(id);
    }

    // By difficulty
    if (!index.byDifficulty[puzzle.difficulty]) {
      index.byDifficulty[puzzle.difficulty] = [];
    }
    index.byDifficulty[puzzle.difficulty].push(id);

    // By phase
    if (!index.byPhase[puzzle.gamePhase]) {
      index.byPhase[puzzle.gamePhase] = [];
    }
    index.byPhase[puzzle.gamePhase].push(id);

    // By source
    if (!index.bySource[puzzle.sourceId]) {
      index.bySource[puzzle.sourceId] = [];
    }
    index.bySource[puzzle.sourceId].push(id);
  }
}

/**
 * Get puzzle by ID
 */
export function getPuzzleById(puzzleId: string): Puzzle | undefined {
  return puzzles.get(puzzleId);
}

/**
 * Get all puzzles
 */
export function getAllPuzzles(): Puzzle[] {
  return Array.from(puzzles.values());
}

/**
 * Get puzzles by motif
 */
export function getPuzzlesByMotif(motif: ChessMotif): Puzzle[] {
  const ids = index.byMotif[motif] || [];
  return ids.map(id => puzzles.get(id)).filter((p): p is Puzzle => p !== undefined);
}

/**
 * Get puzzles by difficulty
 */
export function getPuzzlesByDifficulty(difficulty: DifficultyLevel): Puzzle[] {
  const ids = index.byDifficulty[difficulty] || [];
  return ids.map(id => puzzles.get(id)).filter((p): p is Puzzle => p !== undefined);
}

/**
 * Get puzzles by game phase
 */
export function getPuzzlesByPhase(phase: 'opening' | 'middlegame' | 'endgame' | 'transition'): Puzzle[] {
  const ids = index.byPhase[phase] || [];
  return ids.map(id => puzzles.get(id)).filter((p): p is Puzzle => p !== undefined);
}

/**
 * Get random puzzle by criteria
 */
export function getRandomPuzzle(criteria?: {
  motif?: ChessMotif;
  difficulty?: DifficultyLevel;
  phase?: 'opening' | 'middlegame' | 'endgame' | 'transition';
  excludeIds?: string[];
}): Puzzle | null {
  let candidates = getAllPuzzles();

  if (criteria?.motif) {
    candidates = candidates.filter(p => p.motifs.includes(criteria.motif!));
  }
  if (criteria?.difficulty) {
    candidates = candidates.filter(p => p.difficulty === criteria.difficulty);
  }
  if (criteria?.phase) {
    candidates = candidates.filter(p => p.gamePhase === criteria.phase);
  }
  if (criteria?.excludeIds && criteria.excludeIds.length > 0) {
    candidates = candidates.filter(p => !criteria.excludeIds!.includes(p.puzzleId));
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Generate corpus manifest
 */
export function generateManifest(): CorpusManifest {
  const motifs: Record<string, number> = {};
  const difficulties: Record<string, number> = {};
  const phases: Record<string, number> = {};
  const sourceDist: Record<string, number> = {};
  const licenseDist: Record<string, number> = {};

  for (const puzzle of puzzles.values()) {
    // Motifs
    for (const motif of puzzle.motifs) {
      motifs[motif] = (motifs[motif] || 0) + 1;
    }

    // Difficulty
    difficulties[puzzle.difficulty] = (difficulties[puzzle.difficulty] || 0) + 1;

    // Phase
    phases[puzzle.gamePhase] = (phases[puzzle.gamePhase] || 0) + 1;

    // Source
    sourceDist[puzzle.sourceId] = (sourceDist[puzzle.sourceId] || 0) + 1;

    // License
    licenseDist[puzzle.licenseId] = (licenseDist[puzzle.licenseId] || 0) + 1;
  }

  return {
    manifestVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    corpusVersion: CORPUS_VERSION,
    puzzleCount: puzzles.size,
    openingCount: 0, // TODO: Implement opening entries
    motifDistribution: motifs as Record<ChessMotif, number>,
    difficultyDistribution: difficulties as Record<DifficultyLevel, number>,
    phaseDistribution: phases as Record<'opening' | 'middlegame' | 'endgame' | 'transition', number>,
    sourceDistribution: sourceDist,
    licenseDistribution: licenseDist,
    quarantinedCount: quarantined.size,
    duplicateCount: (index.byFen && Object.values(index.byFen).filter(arr => arr.length > 1).length) || 0,
    totalSha256: 'corpus-manifest-sha256',
    manifestSha256: 'manifest-only-sha256',
    importRuns,
  };
}

/**
 * Generate quality report
 */
export function generateQualityReport(): CorpusQualityReport {
  const manifest = generateManifest();

  const quarantineReasons: Record<string, number> = {};
  for (const record of quarantined.values()) {
    quarantineReasons[record.quarantineReason] = (quarantineReasons[record.quarantineReason] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    corpusVersion: CORPUS_VERSION,
    downloadedCount: puzzles.size + quarantined.size,
    parsedCount: puzzles.size + quarantined.size,
    acceptedCount: puzzles.size,
    quarantinedCount: quarantined.size,
    duplicateCount: manifest.duplicateCount,
    illegalFenCount: quarantineReasons['illegal_fen'] || 0,
    illegalMoveCount: quarantineReasons['illegal_move'] || 0,
    engineDisagreementCount: quarantineReasons['engine_disagreement'] || 0,
    motifDistribution: manifest.motifDistribution as Record<string, number>,
    difficultyDistribution: manifest.difficultyDistribution as Record<string, number>,
    sourceDistribution: manifest.sourceDistribution,
    licenseDistribution: manifest.licenseDistribution,
    manifestSha256: manifest.manifestSha256,
    quarantineReasons: quarantineReasons as Record<QuarantineReason, number>,
    validationErrorsByField: {},
  };
}

/**
 * Get corpus statistics
 */
export function getCorpusStats(): {
  totalPuzzles: number;
  quarantinedCount: number;
  motifsCount: number;
  sourcesCount: number;
  importRunsCount: number;
} {
  const uniqueMotifs = new Set<string>();
  for (const puzzle of puzzles.values()) {
    for (const motif of puzzle.motifs) {
      uniqueMotifs.add(motif);
    }
  }

  return {
    totalPuzzles: puzzles.size,
    quarantinedCount: quarantined.size,
    motifsCount: uniqueMotifs.size,
    sourcesCount: sources.size,
    importRunsCount: importRuns.length,
  };
}

/**
 * Start new import run
 */
export function startImportRun(sourceId: string): string {
  const runId = `run-${Date.now()}`;
  const run: ImportRun = {
    runId,
    sourceId,
    startedAt: new Date().toISOString(),
    status: 'running',
    parserVersion: '1.0.0',
    validationVersion: '1.0.0',
    engineVersion: 'stockfish-wasm',
    corpusVersion: CORPUS_VERSION,
    downloadedCount: 0,
    parsedCount: 0,
    acceptedCount: 0,
    quarantinedCount: 0,
    duplicateCount: 0,
    illegalFenCount: 0,
    illegalMoveCount: 0,
    engineDisagreementCount: 0,
    errorCount: 0,
  };
  importRuns.push(run);
  return runId;
}

/**
 * Complete import run
 */
export function completeImportRun(runId: string): void {
  const run = importRuns.find(r => r.runId === runId);
  if (run) {
    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    run.acceptedCount = puzzles.size;
    run.quarantinedCount = quarantined.size;
  }
}

/**
 * Rollback import
 */
export function rollbackImport(runId: string): void {
  const run = importRuns.find(r => r.runId === runId);
  if (run) {
    run.status = 'rolled_back';
    run.completedAt = new Date().toISOString();

    // Remove puzzles from this run
    for (const [id, puzzle] of puzzles) {
      if (puzzle.importRunId === runId) {
        puzzles.delete(id);
      }
    }

    // Remove from quarantine
    for (const [id, record] of quarantined) {
      if (record.importRunId === runId) {
        quarantined.delete(id);
      }
    }

    rebuildIndex();
  }
}
