import { afterEach, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mapLichessRow, sha256File } from './import-lichess-puzzles.mjs';
import { calculatePuzzleRecordSha256 } from '../src/services/puzzleRecord.ts';
import {
  LICHESS_PUZZLE_THEMES,
  LICHESS_THEME_TAXONOMY_SOURCE,
  parseValidatorArgs,
  validateCorpus,
} from './validate-puzzle-corpus.mjs';

const fixturePath = path.resolve('src/test/fixtures/lichess-puzzles-official-sample.csv');
const tempDirs = [];
const context = {
  datasetVersion: '2026-08-02',
  sourcePublishedAt: '2026-08-02T07:23:55.000Z',
  retrievedAt: '2026-09-06T00:00:00.000Z',
  rawSha256: 'a'.repeat(64),
  importRunId: 'validator-fixture-run',
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'corpus-validator-test-'));
  tempDirs.push(directory);
  return directory;
}

async function fixtureRecords() {
  const lines = (await readFile(fixturePath, 'utf8')).trim().split(/\r?\n/).slice(1);
  return Promise.all(lines.map((line) => mapLichessRow(line, context)));
}

function normalizedSha256(fen, moves) {
  return createHash('sha256').update(`${fen.split(' ').slice(0, 4).join(' ')}\n${moves.join(' ')}`).digest('hex');
}

async function resign(record) {
  const { recordSha256: _old, ...input } = record;
  return { ...input, recordSha256: await calculatePuzzleRecordSha256(input) };
}

async function writeCorpus(records, manifestOverrides = {}, trailingLine = '') {
  const directory = await temporaryDirectory();
  const input = path.join(directory, 'accepted.jsonl');
  const manifestPath = path.join(directory, 'manifest.json');
  const text = `${records.map(JSON.stringify).join('\n')}${records.length ? '\n' : ''}${trailingLine}`;
  await writeFile(input, text);
  const outputSha256 = await sha256File(input);
  const manifest = {
    manifestSchemaVersion: 'lichess-import-manifest.v1',
    corpusSchemaVersion: 'puzzle-record.v1',
    officialSourceUrl: 'https://database.lichess.org/lichess_db_puzzle.csv.zst',
    licenseId: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    datasetVersion: context.datasetVersion,
    sourcePublishedAt: context.sourcePublishedAt,
    retrievedAt: context.retrievedAt,
    importerVersion: 'lichess-importer.v1',
    parserVersion: 'lichess-csv.v1',
    validatorVersion: 'puzzle-record.v1',
    importRunId: context.importRunId,
    sourceSha256: context.rawSha256,
    acceptedCount: records.length + (trailingLine ? 1 : 0),
    quarantinedCount: 0,
    duplicateCount: 0,
    outputSha256,
    completionStatus: 'completed',
    ...manifestOverrides,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  return {
    directory, input, manifest: manifestPath,
    quarantineOutput: path.join(directory, 'validation-quarantine.jsonl'),
    reportOutput: path.join(directory, 'validation-report.json'),
  };
}

describe('full PuzzleRecord corpus validator', () => {
  test('pins the official taxonomy and parses the strict CLI surface', () => {
    expect(LICHESS_PUZZLE_THEMES).toEqual(expect.arrayContaining([
      'advancedPawn', 'defensiveMove', 'fork', 'mateIn5', 'queenRookEndgame', 'vukovicMate', 'zugzwang',
    ]));
    expect(new Set(LICHESS_PUZZLE_THEMES).size).toBe(LICHESS_PUZZLE_THEMES.length);
    expect(LICHESS_THEME_TAXONOMY_SOURCE).toContain('/50139702e66d67747e5ac0a6482b275f348f0dcd/');
    expect(parseValidatorArgs([
      '--input', 'accepted.jsonl', '--manifest', 'manifest.json',
      '--quarantine-output', 'bad.jsonl', '--report-output', 'report.json',
    ])).toEqual({
      input: 'accepted.jsonl', manifest: 'manifest.json',
      quarantineOutput: 'bad.jsonl', reportOutput: 'report.json',
    });
    expect(() => parseValidatorArgs(['--sample', '100'])).toThrow(/unknown option/i);
  });

  test('streams and fully validates every real fixture record without sampling', async () => {
    const records = (await fixtureRecords()).slice(0, 2);
    const paths = await writeCorpus(records);
    const result = await validateCorpus(paths);

    expect(result).toEqual(expect.objectContaining({ verdict: 'PASS', exitCode: 0 }));
    expect(result.counts).toEqual({
      lines: 2, valid: 2, quarantined: 0, totalReasons: 0, solutionMovesReplayed: 10,
    });
    expect(result.quarantineReasons).toEqual({});
    expect(result.themeDistribution).toEqual(expect.objectContaining({ mate: 1, fork: 1 }));
    expect(JSON.parse(await readFile(paths.reportOutput, 'utf8'))).toEqual(expect.objectContaining({ verdict: 'PASS' }));
    expect(await readFile(paths.quarantineOutput, 'utf8')).toBe('');
  });

  test('fails closed with exact record-level quarantine reasons', async () => {
    const [first, second, third, fourth] = await fixtureRecords();
    const sideMismatch = await resign({ ...second, puzzleId: 'lichess-S0001', sourceId: 'S0001', sourcePuzzleId: 'S0001', sourceUrl: 'https://lichess.org/training/S0001', sideToMove: second.sideToMove === 'w' ? 'b' : 'w' });
    const illegalMoves = ['a1a8'];
    const illegalSolution = await resign({ ...third, puzzleId: 'lichess-I0001', sourceId: 'I0001', sourcePuzzleId: 'I0001', sourceUrl: 'https://lichess.org/training/I0001', moves: illegalMoves, normalizedPuzzleSha256: normalizedSha256(third.fen, illegalMoves) });
    const badMetadata = await resign({ ...fourth, puzzleId: 'lichess-M0001', sourceId: 'M0001', sourcePuzzleId: 'M0001', sourceUrl: 'https://example.test/M0001', licenseId: 'invented', themes: ['notARealLichessTheme'], normalizedPuzzleSha256: 'b'.repeat(64), rawRecordSha256: undefined });
    const duplicateNormalized = await resign({ ...first, puzzleId: 'lichess-D0001', sourceId: 'D0001', sourcePuzzleId: 'D0001', sourceUrl: 'https://lichess.org/training/D0001' });
    const paths = await writeCorpus([first, sideMismatch, illegalSolution, badMetadata, duplicateNormalized]);
    const result = await validateCorpus(paths);

    expect(result.verdict).toBe('FAIL');
    expect(result.exitCode).toBe(2);
    expect(result.counts).toEqual(expect.objectContaining({ lines: 5, valid: 1, quarantined: 4 }));
    expect(result.quarantineReasons).toEqual(expect.objectContaining({
      side_to_move_mismatch: 1,
      illegal_solution: 1,
      provenance_mismatch: 1,
      license_mismatch: 1,
      unknown_theme: 1,
      normalized_checksum_mismatch: 1,
      raw_record_checksum_missing: 1,
      duplicate_normalized_puzzle: 1,
    }));
    const quarantine = (await readFile(paths.quarantineOutput, 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
    expect(quarantine).toHaveLength(4);
    expect(quarantine.every(({ reasons }) => reasons.length > 0)).toBe(true);
  });

  test('detects malformed JSON, duplicate source IDs, contract tampering, and manifest drift', async () => {
    const [first] = await fixtureRecords();
    const duplicateId = await resign({ ...first, puzzleId: 'lichess-other', normalizedPuzzleSha256: 'c'.repeat(64) });
    const tampered = { ...first, rating: first.rating + 1, puzzleId: 'lichess-tampered', sourceId: 'tampered', sourcePuzzleId: 'tampered', sourceUrl: 'https://lichess.org/training/tampered' };
    const paths = await writeCorpus([first, duplicateId, tampered], { outputSha256: 'd'.repeat(64), sourceSha256: 'invalid', acceptedCount: 5 }, '{bad json}\n');
    const result = await validateCorpus(paths);

    expect(result).toEqual(expect.objectContaining({ verdict: 'FAIL', exitCode: 2 }));
    expect(result.quarantineReasons).toEqual(expect.objectContaining({
      duplicate_source_id: 1, contract_violation: 1, malformed_json: 1,
    }));
    expect(result.gateErrors.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'manifest_output_checksum_mismatch', 'manifest_source_checksum_invalid', 'manifest_accepted_count_mismatch',
    ]));
  });

  test('returns strict CLI exit codes for pass, validation failure, and fatal usage', async () => {
    const [record] = await fixtureRecords();
    const validPaths = await writeCorpus([record]);
    const valid = spawnSync(process.execPath, [
      'scripts/validate-puzzle-corpus.mjs', '--input', validPaths.input, '--manifest', validPaths.manifest,
      '--quarantine-output', validPaths.quarantineOutput, '--report-output', validPaths.reportOutput,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    expect(valid.status).toBe(0);
    expect(JSON.parse(valid.stdout).verdict).toBe('PASS');

    const legacy = spawnSync(process.execPath, [
      'scripts/verify-corpus.cjs', '--input', validPaths.input, '--manifest', validPaths.manifest,
      '--quarantine-output', path.join(validPaths.directory, 'legacy-quarantine.jsonl'),
      '--report-output', path.join(validPaths.directory, 'legacy-report.json'),
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    expect(legacy.status).toBe(0);
    expect(JSON.parse(legacy.stdout).verdict).toBe('PASS');

    const invalidRecord = await resign({ ...record, themes: ['inventedTheme'] });
    const invalidPaths = await writeCorpus([invalidRecord]);
    const invalid = spawnSync(process.execPath, [
      'scripts/validate-puzzle-corpus.mjs', '--input', invalidPaths.input, '--manifest', invalidPaths.manifest,
      '--quarantine-output', invalidPaths.quarantineOutput, '--report-output', invalidPaths.reportOutput,
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    expect(invalid.status).toBe(2);
    expect(JSON.parse(invalid.stdout).verdict).toBe('FAIL');

    const fatal = spawnSync(process.execPath, ['scripts/validate-puzzle-corpus.mjs'], { cwd: path.resolve('.'), encoding: 'utf8' });
    expect(fatal.status).toBe(1);
    expect(fatal.stderr).toMatch(/required/i);
  });
});
