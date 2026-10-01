import { afterEach, describe, expect, test } from 'vitest';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress } from 'node:zlib';
import {
  APPROVED_SOURCE_URL,
  LICHESS_LICENSE,
  createZstdCsvLineStream,
  persistOfficialSourceResponse,
  mapLichessRow,
  parseArgs,
  parseCsvLine,
  runImport,
} from './import-lichess-puzzles.mjs';
import { validatePuzzleRecord } from '../src/services/puzzleRecord.ts';

const fixturePath = path.resolve('src/test/fixtures/lichess-puzzles-official-sample.csv');
const tempDirs = [];
const context = {
  datasetVersion: '2026-08-02',
  sourcePublishedAt: '2026-08-02T07:23:55.000Z',
  retrievedAt: '2026-09-06T00:00:00.000Z',
  rawSha256: 'a'.repeat(64),
  importRunId: 'fixture-run',
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'lichess-import-test-'));
  tempDirs.push(directory);
  return directory;
}

async function zstdFixture(csv, seekablePrefix = true) {
  csv ??= await readFile(fixturePath, 'utf8');
  const directory = await temporaryDirectory();
  const compressed = path.join(directory, 'fixture.raw.zst');
  await pipeline(Readable.from([csv]), createZstdCompress(), createWriteStream(compressed));
  if (!seekablePrefix) return compressed;
  const finalPath = path.join(directory, 'fixture.zst');
  const prefix = Buffer.from('502a4d18040000000a008a00', 'hex');
  await writeFile(finalPath, Buffer.concat([prefix, await readFile(compressed)]));
  return finalPath;
}

function pathsIn(directory) {
  return {
    output: path.join(directory, 'accepted.jsonl'),
    quarantineOutput: path.join(directory, 'quarantine.jsonl'),
    manifestOutput: path.join(directory, 'manifest.json'),
    checkpoint: path.join(directory, 'checkpoint.json'),
  };
}

describe('official Lichess streaming importer', () => {
  test('pins the official source and license without a mirror', () => {
    expect(APPROVED_SOURCE_URL).toBe('https://database.lichess.org/lichess_db_puzzle.csv.zst');
    expect(LICHESS_LICENSE).toEqual({
      id: 'CC0-1.0',
      url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    });
  });

  test('parses CSV quoting and the required CLI surface', () => {
    expect(parseCsvLine('a,"b,c","d""e"')).toEqual(['a', 'b,c', 'd"e']);
    expect(parseArgs([
      '--input', 'source.zst', '--output', 'out.jsonl', '--quarantine-output', 'bad.jsonl',
      '--manifest-output', 'manifest.json', '--checkpoint', 'checkpoint.json', '--resume',
      '--limit', '1000', '--rating-min', '800', '--rating-max', '1800', '--themes', 'mate,fork',
      '--batch-size', '25', '--dry-run', '--validation-only', '--abort-after', '50',
      '--dataset-version', '2026-08-02',
    ])).toEqual(expect.objectContaining({
      input: 'source.zst', resume: true, limit: 1000, ratingMin: 800, ratingMax: 1800,
      themes: ['mate', 'fork'], batchSize: 25, dryRun: true, validationOnly: true,
      abortAfter: 50, datasetVersion: '2026-08-02',
    }));
  });

  test('maps real source semantics and preserves the Lichess ID', async () => {
    const [, row] = (await readFile(fixturePath, 'utf8')).trim().split(/\r?\n/);
    const record = await mapLichessRow(row, context);

    expect(record).toEqual(expect.objectContaining({
      schemaVersion: 'puzzle-record.v1',
      source: 'lichess',
      puzzleId: 'lichess-00sHx',
      sourceId: '00sHx',
      sourcePuzzleId: '00sHx',
      sourceUrl: 'https://lichess.org/training/00sHx',
      sourceFen: 'q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17',
      precedingMove: 'e8d7',
      sideToMove: 'w',
      moves: ['a2e6', 'd7d8', 'f7f8'],
      rating: 1760,
      ratingDeviation: 80,
      popularity: 83,
      plays: 72,
      themes: ['mate', 'mateIn2', 'middlegame', 'short'],
      openingTags: ['Italian_Game', 'Italian_Game_Classical_Variation'],
      dailyDate: null,
      validationStatus: 'validated',
    }));
    expect((await validatePuzzleRecord(record)).valid).toBe(true);
  });

  test('streams a seekable-Zstandard-prefixed official excerpt', async () => {
    const input = await zstdFixture();
    const lines = [];
    for await (const line of createZstdCsvLineStream(createReadStream(input))) lines.push(line);
    expect(lines).toEqual((await readFile(fixturePath, 'utf8')).trim().split(/\r?\n/));
  });

  test('imports incrementally with filters, quarantine, manifest, and bounded samples', async () => {
    const input = await zstdFixture();
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    const result = await runImport({
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 900, ratingMax: 2000, themes: [],
      excludedThemes: [], limit: 2, batchSize: 1,
    });

    expect(result.status).toBe('completed');
    expect(result.counts).toEqual(expect.objectContaining({ parsed: 4, filtered: 2, accepted: 2, duplicate: 0 }));
    const records = (await readFile(targets.output, 'utf8')).trim().split('\n').map(JSON.parse);
    expect(records.map(({ sourceId }) => sourceId)).toEqual(['00sHx', '00sO1']);
    expect(await Promise.all(records.map(async (record) => (await validatePuzzleRecord(record)).valid))).toEqual([true, true]);
    const manifest = JSON.parse(await readFile(targets.manifestOutput, 'utf8'));
    expect(manifest).toEqual(expect.objectContaining({
      manifestSchemaVersion: 'lichess-import-manifest.v1',
      corpusSchemaVersion: 'puzzle-record.v1',
      acceptedCount: 2,
      filteredCount: 2,
      duplicateCount: 0,
      completionStatus: 'completed',
    }));
    expect(result.memorySamples.length).toBeGreaterThan(0);
  });

  test('interrupts at a committed row and resumes without duplicates', async () => {
    const input = await zstdFixture();
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    const options = {
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 4, batchSize: 2,
    };

    const interrupted = await runImport({ ...options, abortAfter: 2 });
    expect(interrupted.status).toBe('interrupted');
    expect(JSON.parse(await readFile(targets.checkpoint, 'utf8'))).toEqual(expect.objectContaining({
      checkpointSchemaVersion: 'lichess-import-checkpoint.v1', sourceRowsCommitted: 2, acceptedCount: 2,
    }));

    const resumed = await runImport({ ...options, retrievedAt: '2026-09-07T00:00:00.000Z', resume: true });
    expect(resumed.status).toBe('completed');
    const records = (await readFile(targets.output, 'utf8')).trim().split('\n').map(JSON.parse);
    const ids = records.map(({ sourceId }) => sourceId);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    expect(new Set(records.map(({ retrievedAt }) => retrievedAt))).toEqual(new Set([context.retrievedAt]));
    expect(resumed.manifest.retrievedAt).toBe(context.retrievedAt);
  });

  test('quarantines malformed and duplicate rows instead of silently succeeding', async () => {
    const csv = await readFile(fixturePath, 'utf8');
    const lines = csv.trim().split(/\r?\n/);
    const input = await zstdFixture(`${lines[0]}\n${lines[1]}\nmalformed,row\n${lines[1]}\n`);
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    const result = await runImport({
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 10, batchSize: 2,
    });

    expect(result.counts).toEqual(expect.objectContaining({ accepted: 1, quarantined: 2, duplicate: 1 }));
    const reasons = (await readFile(targets.quarantineOutput, 'utf8')).trim().split('\n').map((line) => JSON.parse(line).reason);
    expect(reasons).toEqual(['malformed_row', 'duplicate_source_id']);
  });

  test('quarantines malformed CSV quoting without crashing the import', async () => {
    const header = (await readFile(fixturePath, 'utf8')).split(/\r?\n/)[0];
    const input = await zstdFixture(`${header}\n"unterminated,row\n`);
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    const result = await runImport({
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 1, batchSize: 1,
    });

    expect(result.counts).toEqual(expect.objectContaining({ accepted: 0, invalid: 1, quarantined: 1 }));
    expect(JSON.parse((await readFile(targets.quarantineOutput, 'utf8')).trim())).toEqual(expect.objectContaining({
      sourceId: null, reason: 'malformed_row', detail: 'Malformed CSV quoting',
    }));
  });

  test('dry-run and validation-only do not mutate accepted output', async () => {
    const input = await zstdFixture();
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    await writeFile(targets.output, 'sentinel\n');
    const common = {
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 1, batchSize: 1,
    };

    await runImport({ ...common, dryRun: true });
    await runImport({ ...common, validationOnly: true });
    expect(await readFile(targets.output, 'utf8')).toBe('sentinel\n');
    await expect(stat(`${targets.output}.partial`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('rejects corrupt checkpoints and truncated compressed streams', async () => {
    const input = await zstdFixture();
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    await writeFile(targets.checkpoint, '{broken');
    const options = {
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 2, batchSize: 1, resume: true,
    };
    await expect(runImport(options)).rejects.toThrow(/checkpoint/i);

    const truncated = path.join(directory, 'truncated.zst');
    const bytes = await readFile(input);
    await writeFile(truncated, bytes.subarray(0, Math.floor(bytes.length / 2)));
    const truncatedTargets = pathsIn(await temporaryDirectory());
    await expect(runImport({ ...options, ...truncatedTargets, input: truncated, resume: false })).rejects.toThrow(/zstd|unexpected|truncated|stream/i);
  });

  test('rejects invalid metadata, stale checkpoints, and resume configuration changes', async () => {
    const input = await zstdFixture();
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    const options = {
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 4, batchSize: 1,
    };
    await expect(runImport({ ...options, datasetVersion: 'not-a-date' })).rejects.toThrow(/datasetVersion/i);
    await expect(runImport({ ...options, sourcePublishedAt: 'yesterday' })).rejects.toThrow(/sourcePublishedAt/i);

    await runImport({ ...options, abortAfter: 1 });
    await expect(runImport({ ...options, resume: true, ratingMin: 1 })).rejects.toThrow(/checkpoint.*configuration/i);
    await expect(runImport({ ...options, resume: true, output: path.join(directory, 'other.jsonl') })).rejects.toThrow(/checkpoint.*path/i);

    const staleDirectory = await temporaryDirectory();
    const staleTargets = pathsIn(staleDirectory);
    await writeFile(staleTargets.checkpoint, '{}');
    await expect(runImport({ ...options, ...staleTargets })).rejects.toThrow(/overwrite.*checkpoint/i);
  });

  test('rejects invalid UTF-8 from the decompressed source', async () => {
    const input = await zstdFixture(Buffer.concat([
      Buffer.from('PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate\n'),
      Buffer.from([0xff, 0xfe]),
    ]));
    const directory = await temporaryDirectory();
    await expect(runImport({
      input, ...pathsIn(directory), datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 1, batchSize: 1,
    })).rejects.toThrow(/encoding|encoded|utf-8/i);
  });

  test('stops cleanly on its SIGINT handler and leaves a resumable checkpoint', async () => {
    const csv = await readFile(fixturePath, 'utf8');
    const [header, row] = csv.trim().split(/\r?\n/);
    const rows = Array.from({ length: 500 }, (_, index) => row.replace(/^00sHx,/, `${index.toString(36).padStart(5, '0')},`));
    const input = await zstdFixture(`${header}\n${rows.join('\n')}\n`);
    const directory = await temporaryDirectory();
    const targets = pathsIn(directory);
    const originalOnce = process.once;
    let resolveHandler;
    const registered = new Promise((resolve) => { resolveHandler = resolve; });
    process.once = function once(event, handler) {
      if (event === 'SIGINT') resolveHandler(handler);
      return originalOnce.call(this, event, handler);
    };
    const running = runImport({
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 500, batchSize: 10,
    });
    const handler = await registered.finally(() => { process.once = originalOnce; });
    handler();

    const interrupted = await running;
    expect(interrupted).toEqual(expect.objectContaining({ status: 'interrupted', signal: 'SIGINT' }));
    expect(JSON.parse(await readFile(targets.checkpoint, 'utf8'))).toEqual(expect.objectContaining({ status: 'interrupted' }));
    const resumed = await runImport({
      input, ...targets, datasetVersion: '2026-08-02', sourcePublishedAt: context.sourcePublishedAt,
      retrievedAt: context.retrievedAt, ratingMin: 0, ratingMax: 4000, themes: [],
      excludedThemes: [], limit: 500, batchSize: 10, resume: true,
    });
    expect(resumed.status).toBe('completed');
    expect(resumed.counts).toEqual(expect.objectContaining({ parsed: 500, accepted: 1, duplicate: 499 }));
  }, 15_000);

  test('handles HTTP, interrupted response, and destination failures without partial files', async () => {
    const directory = await temporaryDirectory();
    const successful = path.join(directory, 'successful.zst');
    const saved = await persistOfficialSourceResponse(new Response('bytes', {
      headers: { 'last-modified': 'Sun, 02 Aug 2026 07:23:55 GMT' },
    }), successful);
    expect(saved).toEqual(expect.objectContaining({ size: 5, rawSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(await readFile(successful, 'utf8')).toBe('bytes');

    const unavailable = path.join(directory, 'unavailable.zst');
    await expect(persistOfficialSourceResponse(new Response('down', { status: 503 }), unavailable)).rejects.toThrow(/HTTP 503/i);
    await expect(stat(unavailable)).rejects.toMatchObject({ code: 'ENOENT' });

    const interrupted = path.join(directory, 'interrupted.zst');
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.error(new Error('connection interrupted'));
      },
    });
    await expect(persistOfficialSourceResponse(new Response(body), interrupted)).rejects.toThrow(/interrupted/i);
    await expect(stat(interrupted)).rejects.toMatchObject({ code: 'ENOENT' });

    const destinationDirectory = path.join(directory, 'destination-directory');
    await writeFile(path.join(directory, 'keep.txt'), 'keep');
    await mkdir(destinationDirectory);
    await expect(persistOfficialSourceResponse(new Response('bytes'), destinationDirectory)).rejects.toMatchObject({ code: expect.stringMatching(/EEXIST|EISDIR/) });
    expect(await readFile(path.join(directory, 'keep.txt'), 'utf8')).toBe('keep');
  });

  test('uses non-zero CLI exit codes for fatal errors and controlled interruption', async () => {
    const fatal = spawnSync(process.execPath, ['scripts/import-lichess-puzzles.mjs', '--input', 'missing.zst'], {
      cwd: path.resolve('.'), encoding: 'utf8',
    });
    expect(fatal.status).toBe(1);
    expect(fatal.stderr).toMatch(/required/i);

    const input = await zstdFixture();
    const targets = pathsIn(await temporaryDirectory());
    const interrupted = spawnSync(process.execPath, [
      'scripts/import-lichess-puzzles.mjs', '--input', input,
      '--output', targets.output, '--quarantine-output', targets.quarantineOutput,
      '--manifest-output', targets.manifestOutput, '--checkpoint', targets.checkpoint,
      '--dataset-version', '2026-08-02', '--source-published-at', context.sourcePublishedAt,
      '--limit', '4', '--rating-min', '0', '--rating-max', '4000', '--batch-size', '1', '--abort-after', '1',
    ], { cwd: path.resolve('.'), encoding: 'utf8' });
    expect(interrupted.status).toBe(75);
    expect(JSON.parse(interrupted.stdout)).toEqual(expect.objectContaining({ status: 'interrupted' }));
  });
});
