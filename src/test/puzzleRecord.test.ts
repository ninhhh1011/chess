import { describe, expect, test } from 'vitest';
import {
  calculatePuzzleRecordSha256,
  validatePuzzleRecord,
} from '../services/puzzleRecord';
import type { PuzzleRecordInput } from '../types/corpus';

const fixtureRecord: PuzzleRecordInput = {
  schemaVersion: 'puzzle-record.v1',
  puzzleId: 'lichess-fixture-001',
  sourceId: 'lichess-puzzles',
  sourcePuzzleId: 'fixture-001',
  sourceUrl: 'https://database.lichess.org/lichess_db_puzzle.csv.zst',
  sourceVersion: '2026-08',
  sourcePublishedAt: '2026-08-02T00:00:00.000Z',
  retrievedAt: '2026-09-06T00:00:00.000Z',
  licenseId: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  rawSha256: 'a'.repeat(64),
  fen: '7k/6Q1/6K1/8/8/8/8/8 w - - 0 1',
  moves: ['g6f7'],
  rating: 1200,
  themes: ['mateIn1'],
};

async function validRecord() {
  return {
    ...fixtureRecord,
    recordSha256: await calculatePuzzleRecordSha256(fixtureRecord),
  };
}

describe('PuzzleRecord v1 contract', () => {
  test('pins the canonical checksum representation', async () => {
    await expect(calculatePuzzleRecordSha256(fixtureRecord)).resolves.toBe(
      'b29075acbedc3d20dbb3c3e77672c10f8bb2d86b387c28ea0e641a8cefd751db',
    );
  });

  test('accepts a complete record with a matching canonical checksum', async () => {
    const result = await validatePuzzleRecord(await validRecord());

    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  test.each([
    'schemaVersion', 'puzzleId', 'sourceId', 'sourcePuzzleId', 'sourceUrl',
    'sourceVersion', 'sourcePublishedAt', 'retrievedAt', 'licenseId', 'licenseUrl',
    'rawSha256', 'recordSha256', 'fen', 'moves', 'rating', 'themes',
  ])('rejects a record missing %s', async (field) => {
    const record: Record<string, unknown> = await validRecord();
    delete record[field];

    const result = await validatePuzzleRecord(record);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field, code: 'required' }));
  });

  test('rejects malformed provenance values', async () => {
    const record = {
      ...await validRecord(),
      schemaVersion: 'puzzle-record.v2',
      sourceUrl: 'internal://invented',
      sourcePublishedAt: 'not-a-date',
      licenseUrl: 'not-a-url',
      rawSha256: 'not-a-sha256',
    };

    const result = await validatePuzzleRecord(record);

    expect(result.valid).toBe(false);
    expect(result.errors.map(({ field }) => field)).toEqual(expect.arrayContaining([
      'schemaVersion', 'sourceUrl', 'sourcePublishedAt', 'licenseUrl', 'rawSha256',
    ]));
  });

  test('rejects a record whose provenance was changed after hashing', async () => {
    const record = { ...await validRecord(), sourcePuzzleId: 'forged-id' };

    const result = await validatePuzzleRecord(record);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'recordSha256',
      code: 'mismatch',
    }));
  });

  test('rejects fields outside the versioned schema', async () => {
    const result = await validatePuzzleRecord({ ...await validRecord(), inventedSourceClaim: true });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'inventedSourceClaim',
      code: 'unknown',
    }));
  });

  test('rejects required fields inherited through the prototype chain', async () => {
    const record = Object.create(await validRecord()) as Record<string, unknown>;

    const result = await validatePuzzleRecord(record);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'schemaVersion',
      code: 'required',
    }));
  });
});
