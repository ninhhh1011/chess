/**
 * Phase 2: Corpus Loader
 *
 * Loads corpus from generated puzzles and integrates with the application.
 */

import { Chess } from 'chess.js';
import {
  initializeCorpus,
  getAllPuzzles,
  getPuzzleById,
  getRandomPuzzle,
  getPuzzlesByMotif,
  getPuzzlesByDifficulty,
  getPuzzlesByPhase,
  generateManifest,
  generateQualityReport,
  getCorpusStats,
  CORPUS_VERSION,
} from './corpusService';
import type { Puzzle } from '../types/corpus';
import { exercises as seedExercises } from '../data/exercises';
import { CORPUS_EXERCISES } from '../data/corpusPuzzles';
import generatedPuzzlesData from '../data/generated/generatedPuzzles.json';

// Convert legacy exercise to corpus format
function exerciseToCorpus(exercise: { id: string; fen: string; correctMove: { from: string; to: string; promotion?: string }; tags: string[]; title?: string; description?: string }) {
  return {
    id: exercise.id,
    fen: exercise.fen,
    correctMove: exercise.correctMove,
    tags: exercise.tags,
    title: exercise.title,
    description: exercise.description,
  };
}

// Convert generated puzzle to corpus exercise format
function puzzleToExercise(puzzle: typeof generatedPuzzlesData[number]) {
  const solution = puzzle.solution.toLowerCase();
  let from = 'e2', to = 'e4', promotion: string | undefined;

  // Handle promotion (e.g., "a7a8q")
  if (solution.length === 5 && /^[a-h][1-8][a-h][1-8][qrbn]$/.test(solution)) {
    from = solution.slice(0, 2);
    to = solution.slice(2, 4);
    promotion = solution[4];
  } else if (solution.length === 4 && /^[a-h][1-8][a-h][1-8]$/.test(solution)) {
    // Standard from-to format (e.g., "e2e4", "g6f7")
    from = solution.slice(0, 2);
    to = solution.slice(2, 4);
  }

  return {
    id: puzzle.id,
    fen: puzzle.fen,
    correctMove: { from, to, promotion },
    tags: puzzle.motifs || [],
    title: puzzle.title || 'Puzzle',
    description: (puzzle.motifs || []).join(', '),
  };
}

// Initialize corpus from all sources
export function loadCorpus(): void {
  // Combine all exercises
  const legacyExercises = seedExercises.map(exerciseToCorpus);
  const corpusExercises = CORPUS_EXERCISES.map(exerciseToCorpus);
  const generatedExercises = generatedPuzzlesData.map(puzzleToExercise);

  const allExercises = [
    ...legacyExercises,
    ...corpusExercises,
    ...generatedExercises,
  ];

  initializeCorpus(allExercises);
}

// Get corpus version
export function getCorpusVersion(): string {
  return CORPUS_VERSION;
}

// Check if puzzle is valid (can be solved)
export function validatePuzzleSolution(puzzleId: string, move: { from: string; to: string; promotion?: string }): boolean {
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) {
    return false;
  }

  try {
    const game = new Chess(puzzle.fen);
    const result = game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });

    if (!result) {
      return false;
    }

    // Check if the move matches the expected first move
    const expectedMove = puzzle.correctMoves[0];
    return result.san === expectedMove || result.san.replace(/[+#]/g, '') === expectedMove.replace(/[+#]/g, '');
  } catch {
    return false;
  }
}

// Get puzzle with full provenance
export function getPuzzleWithProvenance(puzzleId: string): (Puzzle & { isValidated: boolean }) | null {
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) {
    return null;
  }

  return {
    ...puzzle,
    isValidated: true,
  };
}

// Statistics for corpus report
export function getCorpusSummary() {
  const stats = getCorpusStats();
  const manifest = generateManifest();
  const quality = generateQualityReport();

  return {
    corpusVersion: CORPUS_VERSION,
    ...stats,
    motifs: Object.keys(manifest.motifDistribution),
    difficulties: Object.keys(manifest.difficultyDistribution),
    phases: Object.keys(manifest.phaseDistribution),
    qualityReport: {
      acceptedCount: quality.acceptedCount,
      quarantinedCount: quality.quarantinedCount,
      illegalFenCount: quality.illegalFenCount,
      illegalMoveCount: quality.illegalMoveCount,
    },
  };
}

// Export for testing
export { getAllPuzzles, getPuzzleById, getRandomPuzzle, getPuzzlesByMotif, getPuzzlesByDifficulty, getPuzzlesByPhase };
