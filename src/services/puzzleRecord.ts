import { Chess } from 'chess.js';
import type {
  PuzzleRecord,
  PuzzleRecordInput,
  ValidationError,
  ValidationResult,
} from '../types/corpus';

export const PUZZLE_RECORD_SCHEMA_VERSION = 'puzzle-record.v1' as const;

const requiredFields = [
  'schemaVersion', 'puzzleId', 'sourceId', 'sourcePuzzleId', 'sourceUrl',
  'sourceVersion', 'sourcePublishedAt', 'retrievedAt', 'licenseId', 'licenseUrl',
  'rawSha256', 'recordSha256', 'fen', 'moves', 'rating', 'themes',
] as const;
const optionalFields = [
  'source', 'sourceFen', 'precedingMove', 'sideToMove', 'ratingDeviation',
  'popularity', 'plays', 'openingTags', 'gameUrl', 'dailyDate', 'importRunId',
  'rawRecordSha256', 'normalizedPuzzleSha256', 'parserVersion', 'validatorVersion',
  'validationStatus',
] as const;
const allowedFields = new Set<string>([...requiredFields, ...optionalFields]);
const sha256Pattern = /^[a-f0-9]{64}$/i;
const uciMovePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function canonicalInput(record: PuzzleRecordInput): PuzzleRecordInput {
  return {
    schemaVersion: record.schemaVersion,
    puzzleId: record.puzzleId,
    sourceId: record.sourceId,
    sourcePuzzleId: record.sourcePuzzleId,
    sourceUrl: record.sourceUrl,
    sourceVersion: record.sourceVersion,
    sourcePublishedAt: record.sourcePublishedAt,
    retrievedAt: record.retrievedAt,
    licenseId: record.licenseId,
    licenseUrl: record.licenseUrl,
    rawSha256: record.rawSha256,
    fen: record.fen,
    moves: record.moves,
    rating: record.rating,
    themes: record.themes,
    source: record.source,
    sourceFen: record.sourceFen,
    precedingMove: record.precedingMove,
    sideToMove: record.sideToMove,
    ratingDeviation: record.ratingDeviation,
    popularity: record.popularity,
    plays: record.plays,
    openingTags: record.openingTags,
    gameUrl: record.gameUrl,
    dailyDate: record.dailyDate,
    importRunId: record.importRunId,
    rawRecordSha256: record.rawRecordSha256,
    normalizedPuzzleSha256: record.normalizedPuzzleSha256,
    parserVersion: record.parserVersion,
    validatorVersion: record.validatorVersion,
    validationStatus: record.validationStatus,
  };
}

export async function calculatePuzzleRecordSha256(record: PuzzleRecordInput): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalInput(record)));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function validHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validIsoTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export async function validatePuzzleRecord(value: unknown): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: [{ field: '$', code: 'type', message: 'PuzzleRecord must be an object' }], warnings: [] };
  }

  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) {
    if (!allowedFields.has(field)) errors.push({ field, code: 'unknown', message: `${field} is not part of puzzle-record.v1` });
  }
  for (const field of requiredFields) {
    if (!Object.hasOwn(record, field) || record[field] === undefined || record[field] === null || record[field] === '') {
      errors.push({ field, code: 'required', message: `${field} is required` });
    }
  }
  if (errors.length) return { valid: false, errors, warnings: [] };

  if (record.schemaVersion !== PUZZLE_RECORD_SCHEMA_VERSION) {
    errors.push({ field: 'schemaVersion', code: 'invalid', message: `Expected ${PUZZLE_RECORD_SCHEMA_VERSION}` });
  }
  for (const field of ['puzzleId', 'sourceId', 'sourcePuzzleId', 'sourceVersion', 'licenseId'] as const) {
    if (typeof record[field] !== 'string' || !record[field].trim()) {
      errors.push({ field, code: 'invalid', message: `${field} must be a non-empty string` });
    }
  }
  for (const field of ['sourceUrl', 'licenseUrl'] as const) {
    if (!validHttpUrl(record[field])) errors.push({ field, code: 'invalid', message: `${field} must be an HTTP(S) URL` });
  }
  for (const field of ['sourcePublishedAt', 'retrievedAt'] as const) {
    if (!validIsoTimestamp(record[field])) errors.push({ field, code: 'invalid', message: `${field} must be an ISO timestamp` });
  }
  for (const field of ['rawSha256', 'recordSha256'] as const) {
    if (typeof record[field] !== 'string' || !sha256Pattern.test(record[field])) {
      errors.push({ field, code: 'invalid', message: `${field} must be a SHA-256 hex digest` });
    }
  }
  try {
    new Chess(record.fen as string);
  } catch {
    errors.push({ field: 'fen', code: 'invalid', message: 'fen must be a legal chess position' });
  }
  if (!Array.isArray(record.moves) || record.moves.length === 0 || record.moves.some((move) => typeof move !== 'string' || !uciMovePattern.test(move))) {
    errors.push({ field: 'moves', code: 'invalid', message: 'moves must contain UCI moves' });
  }
  if (!Number.isInteger(record.rating) || (record.rating as number) < 0) {
    errors.push({ field: 'rating', code: 'invalid', message: 'rating must be a non-negative integer' });
  }
  if (!Array.isArray(record.themes) || record.themes.length === 0 || record.themes.some((theme) => typeof theme !== 'string' || !theme.trim())) {
    errors.push({ field: 'themes', code: 'invalid', message: 'themes must contain non-empty strings' });
  }

  if (record.source !== undefined && record.source !== 'lichess') {
    errors.push({ field: 'source', code: 'invalid', message: 'source must be lichess' });
  }
  if (record.sourceFen !== undefined) {
    try {
      new Chess(record.sourceFen as string);
    } catch {
      errors.push({ field: 'sourceFen', code: 'invalid', message: 'sourceFen must be a legal chess position' });
    }
  }
  if (record.precedingMove !== undefined && (typeof record.precedingMove !== 'string' || !uciMovePattern.test(record.precedingMove))) {
    errors.push({ field: 'precedingMove', code: 'invalid', message: 'precedingMove must be a UCI move' });
  }
  if (record.sideToMove !== undefined && !['w', 'b'].includes(record.sideToMove as string)) {
    errors.push({ field: 'sideToMove', code: 'invalid', message: 'sideToMove must be w or b' });
  }
  for (const field of ['ratingDeviation', 'plays'] as const) {
    if (record[field] !== undefined && (!Number.isInteger(record[field]) || (record[field] as number) < 0)) {
      errors.push({ field, code: 'invalid', message: `${field} must be a non-negative integer` });
    }
  }
  if (record.popularity !== undefined && (!Number.isInteger(record.popularity) || (record.popularity as number) < -100 || (record.popularity as number) > 100)) {
    errors.push({ field: 'popularity', code: 'invalid', message: 'popularity must be an integer from -100 to 100' });
  }
  if (record.openingTags !== undefined && (!Array.isArray(record.openingTags) || record.openingTags.some((tag) => typeof tag !== 'string' || !tag.trim()))) {
    errors.push({ field: 'openingTags', code: 'invalid', message: 'openingTags must contain non-empty strings' });
  }
  if (record.gameUrl !== undefined && !validHttpUrl(record.gameUrl)) {
    errors.push({ field: 'gameUrl', code: 'invalid', message: 'gameUrl must be an HTTP(S) URL' });
  }
  if (record.dailyDate !== undefined && record.dailyDate !== null && (!Number.isInteger(record.dailyDate) || (record.dailyDate as number) < 0)) {
    errors.push({ field: 'dailyDate', code: 'invalid', message: 'dailyDate must be null or a non-negative integer' });
  }
  for (const field of ['importRunId', 'parserVersion', 'validatorVersion'] as const) {
    if (record[field] !== undefined && (typeof record[field] !== 'string' || !record[field].trim())) {
      errors.push({ field, code: 'invalid', message: `${field} must be a non-empty string` });
    }
  }
  for (const field of ['rawRecordSha256', 'normalizedPuzzleSha256'] as const) {
    if (record[field] !== undefined && (typeof record[field] !== 'string' || !sha256Pattern.test(record[field]))) {
      errors.push({ field, code: 'invalid', message: `${field} must be a SHA-256 hex digest` });
    }
  }
  if (record.validationStatus !== undefined && record.validationStatus !== 'validated') {
    errors.push({ field: 'validationStatus', code: 'invalid', message: 'validationStatus must be validated' });
  }

  if (typeof record.recordSha256 === 'string' && sha256Pattern.test(record.recordSha256)) {
    const { recordSha256, ...input } = record as unknown as PuzzleRecord;
    const expected = await calculatePuzzleRecordSha256(input);
    if (recordSha256.toLowerCase() !== expected) {
      errors.push({ field: 'recordSha256', code: 'mismatch', message: 'recordSha256 does not match canonical record content' });
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
