/**
 * Phase 2: Corpus Loader
 *
 * Exposes the verified external-corpus availability contract.
 */

import { Chess } from 'chess.js';
import {
  resetCorpus,
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
import type { PuzzleRecord } from '../types/corpus';
import { validatePuzzleRecord } from './puzzleRecord';

const DELIVERY_POINTER_SCHEMA = 'corpus-delivery-pointer.v1';
const DELIVERY_MANIFEST_SCHEMA = 'corpus-delivery-manifest.v1';
const OFFICIAL_SOURCE = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const OFFICIAL_LICENSE = 'https://creativecommons.org/publicdomain/zero/1.0/';
const APPROVED_DATASET_VERSION = '2026-08-02';
const APPROVED_SOURCE_SHA256 = 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073';
const HEX_64 = /^[a-f0-9]{64}$/;

export interface ProductionExercise {
  id: string;
  sourcePuzzleId: string;
  title: string;
  description: string;
  hint: string;
  fen: string;
  correctMove: { from: string; to: string; promotion?: string };
  solutionMoves: string[];
  tags: string[];
  sourceUrl: string;
  licenseId: string;
  licenseUrl: string;
  rating: number;
}

export interface ProductionCorpusResult {
  available: boolean;
  source: 'lichess' | 'unavailable';
  puzzleCount: number;
  reason?: string;
  puzzles: ProductionExercise[];
  licenseId?: string;
  licenseUrl?: string;
  datasetVersion?: string;
}

export const CORPUS_AVAILABILITY = {
  available: false,
  source: 'unavailable',
  puzzleCount: 0,
  reason: 'No verified external corpus is bundled with this build.',
} as const;

export function loadCorpus(): typeof CORPUS_AVAILABILITY {
  resetCorpus();
  return CORPUS_AVAILABILITY;
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseUci(move: string): ProductionExercise['correctMove'] {
  return { from: move.slice(0, 2), to: move.slice(2, 4), ...(move[4] ? { promotion: move[4] } : {}) };
}

function toExercise(record: PuzzleRecord): ProductionExercise {
  return {
    id: record.puzzleId,
    sourcePuzzleId: record.sourcePuzzleId,
    title: `Lichess puzzle ${record.sourcePuzzleId}`,
    description: `Find the best move in this ${record.themes.join(', ')} position.`,
    hint: `Themes: ${record.themes.join(', ')}`,
    fen: record.fen,
    correctMove: parseUci(record.moves[0]),
    solutionMoves: record.moves,
    tags: record.themes,
    sourceUrl: record.sourceUrl,
    licenseId: record.licenseId,
    licenseUrl: record.licenseUrl,
    rating: record.rating,
  };
}

export async function loadProductionCorpus(
  fetcher: typeof fetch = globalThis.fetch,
  baseUrl = '/corpus',
): Promise<ProductionCorpusResult> {
  try {
    const pointerResponse = await fetcher(`${baseUrl}/current.json`);
    if (!pointerResponse.ok) throw new Error(`pointer request failed (${pointerResponse.status})`);
    const pointer = await pointerResponse.json();
    if (pointer?.pointerSchemaVersion !== DELIVERY_POINTER_SCHEMA || !HEX_64.test(pointer.activeRun)) {
      throw new Error('invalid delivery pointer');
    }

    const manifestResponse = await fetcher(`${baseUrl}/runs/${pointer.activeRun}/manifest.json`);
    if (!manifestResponse.ok) throw new Error(`manifest request failed (${manifestResponse.status})`);
    const manifest = await manifestResponse.json();
    if (manifest?.manifestSchemaVersion !== DELIVERY_MANIFEST_SCHEMA || !manifest.completed
        || manifest.contentIdentitySha256 !== pointer.activeRun || manifest.corpusSchemaVersion !== 'puzzle-record.v1'
        || manifest.source !== 'lichess' || manifest.officialSourceUrl !== OFFICIAL_SOURCE
        || manifest.licenseId !== 'CC0-1.0' || manifest.licenseUrl !== OFFICIAL_LICENSE
        || manifest.datasetVersion !== APPROVED_DATASET_VERSION || manifest.sourceSha256 !== APPROVED_SOURCE_SHA256
        || !Number.isInteger(manifest.puzzleCount)
        || manifest.puzzleCount < 1 || !Array.isArray(manifest.chunks) || !manifest.chunks.length) {
      throw new Error('invalid delivery manifest');
    }

    const records: PuzzleRecord[] = [];
    for (const chunk of manifest.chunks) {
      if (!/^chunks\/\d{5}\.json$/.test(chunk?.file) || !Number.isInteger(chunk.count)
          || chunk.count < 1 || !HEX_64.test(chunk.sha256)) throw new Error('invalid chunk manifest');
      const response = await fetcher(`${baseUrl}/runs/${pointer.activeRun}/${chunk.file}`);
      if (!response.ok) throw new Error(`chunk request failed (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (await sha256(bytes) !== chunk.sha256) throw new Error(`checksum mismatch for ${chunk.file}`);
      const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!Array.isArray(parsed) || parsed.length !== chunk.count) throw new Error(`invalid records in ${chunk.file}`);
      const validated = await Promise.all(parsed.map(async (value) => {
        const validation = await validatePuzzleRecord(value);
        const record = value as PuzzleRecord;
        if (!validation.valid || record.source !== 'lichess' || record.rawSha256 !== manifest.sourceSha256
            || record.sourceVersion !== manifest.datasetVersion || record.sourceId !== record.sourcePuzzleId
            || record.sourceUrl !== `https://lichess.org/training/${record.sourcePuzzleId}`
            || record.licenseId !== manifest.licenseId || record.licenseUrl !== manifest.licenseUrl) {
          throw new Error(`record validation failed in ${chunk.file}`);
        }
        return record;
      }));
      records.push(...validated);
    }
    if (records.length !== manifest.puzzleCount) throw new Error('delivered puzzle count mismatch');
    return {
      available: true,
      source: 'lichess',
      puzzleCount: records.length,
      puzzles: records.map(toExercise),
      licenseId: manifest.licenseId,
      licenseUrl: manifest.licenseUrl,
      datasetVersion: manifest.datasetVersion,
    };
  } catch (error) {
    return {
      available: false,
      source: 'unavailable',
      puzzleCount: 0,
      puzzles: [],
      reason: error instanceof Error ? error.message : 'Corpus delivery unavailable',
    };
  }
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
    ...CORPUS_AVAILABILITY,
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
