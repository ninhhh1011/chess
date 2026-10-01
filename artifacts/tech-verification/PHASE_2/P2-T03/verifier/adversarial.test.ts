import { describe, expect, test } from 'vitest';
import {
  calculatePuzzleRecordSha256,
  validatePuzzleRecord,
} from '../../../../../src/services/puzzleRecord';
import type { PuzzleRecordInput } from '../../../../../src/types/corpus';

const input: PuzzleRecordInput = {
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

async function signed(overrides: Record<string, unknown> = {}) {
  const candidate = { ...input, ...overrides } as PuzzleRecordInput;
  return { ...candidate, recordSha256: await calculatePuzzleRecordSha256(candidate) };
}

const requiredFields = [
  'schemaVersion', 'puzzleId', 'sourceId', 'sourcePuzzleId', 'sourceUrl',
  'sourceVersion', 'sourcePublishedAt', 'retrievedAt', 'licenseId', 'licenseUrl',
  'rawSha256', 'recordSha256', 'fen', 'moves', 'rating', 'themes',
] as const;

describe('independent PuzzleRecord adversarial audit', () => {
  test('canonical hash is pinned and independent of input object key order', async () => {
    const reversed = Object.fromEntries(Object.entries(input).reverse()) as unknown as PuzzleRecordInput;
    const expected = 'b29075acbedc3d20dbb3c3e77672c10f8bb2d86b387c28ea0e641a8cefd751db';

    await expect(calculatePuzzleRecordSha256(input)).resolves.toBe(expected);
    await expect(calculatePuzzleRecordSha256(reversed)).resolves.toBe(expected);
    await expect(calculatePuzzleRecordSha256(structuredClone(input))).resolves.toBe(expected);
  });

  test.each(requiredFields)('rejects missing own required field %s', async (field) => {
    const candidate: Record<string, unknown> = await signed();
    delete candidate[field];
    const result = await validatePuzzleRecord(candidate);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field, code: 'required' }));
  });

  test('does not accept required values supplied only through the prototype chain', async () => {
    const prototype = await signed({});
    prototype.recordSha256 = '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a';
    const candidate = Object.create(prototype) as Record<string, unknown>;
    const result = await validatePuzzleRecord(candidate);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'schemaVersion', code: 'required' }),
      expect.objectContaining({ field: 'recordSha256', code: 'required' }),
    ]));
  });

  test.each([
    ['$', null, '$'],
    ['$', [], '$'],
    ['schemaVersion', 'puzzle-record.v2', 'schemaVersion'],
    ['puzzleId', '   ', 'puzzleId'],
    ['sourceId', 42, 'sourceId'],
    ['sourcePuzzleId', false, 'sourcePuzzleId'],
    ['sourceUrl', 'ftp://database.lichess.org/puzzles', 'sourceUrl'],
    ['sourceVersion', '   ', 'sourceVersion'],
    ['sourcePublishedAt', '2026-08-02', 'sourcePublishedAt'],
    ['retrievedAt', '2026-13-06T00:00:00.000Z', 'retrievedAt'],
    ['licenseId', [], 'licenseId'],
    ['licenseUrl', 'not a URL', 'licenseUrl'],
    ['rawSha256', 'g'.repeat(64), 'rawSha256'],
    ['recordSha256', 'a'.repeat(63), 'recordSha256'],
    ['fen', 'not-a-fen', 'fen'],
    ['moves', [], 'moves'],
    ['moves', ['e2e9'], 'moves'],
    ['moves', [17], 'moves'],
    ['rating', -1, 'rating'],
    ['rating', 1200.5, 'rating'],
    ['rating', Number.NaN, 'rating'],
    ['rating', Number.POSITIVE_INFINITY, 'rating'],
    ['themes', [], 'themes'],
    ['themes', ['   '], 'themes'],
    ['themes', [12], 'themes'],
  ] as const)('rejects malformed case %# for %s', async (field, value, expectedField) => {
    const candidate = field === '$' ? value : { ...await signed(), [field]: value };
    const result = await validatePuzzleRecord(candidate);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: expectedField }));
  });

  test('rejects unknown enumerable fields', async () => {
    const result = await validatePuzzleRecord({ ...await signed(), forgedClaim: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'forgedClaim', code: 'unknown' }));
  });

  test.each([
    ['puzzleId', 'lichess-fixture-002'],
    ['sourceId', 'other-source'],
    ['sourcePuzzleId', 'forged-source-record'],
    ['sourceUrl', 'https://database.lichess.org/other.csv.zst'],
    ['sourceVersion', '2026-09'],
    ['sourcePublishedAt', '2026-08-03T00:00:00.000Z'],
    ['retrievedAt', '2026-09-07T00:00:00.000Z'],
    ['licenseId', 'CC-BY-4.0'],
    ['licenseUrl', 'https://creativecommons.org/licenses/by/4.0/'],
    ['rawSha256', 'b'.repeat(64)],
    ['fen', '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'],
    ['moves', ['g6h6']],
    ['rating', 1201],
    ['themes', ['mateIn2']],
  ] as const)('detects post-signature tampering of %s', async (field, value) => {
    const result = await validatePuzzleRecord({ ...await signed(), [field]: value });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'recordSha256', code: 'mismatch' }));
  });
});
