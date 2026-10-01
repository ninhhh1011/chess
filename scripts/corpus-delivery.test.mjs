import { afterEach, describe, expect, test, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mapLichessRow, sha256File } from './import-lichess-puzzles.mjs';
import { buildCorpusDelivery, rollbackCorpusDelivery } from './build-corpus-delivery.mjs';
import { loadProductionCorpus } from '../src/services/corpusLoader.ts';

const fixture = path.resolve('src/test/fixtures/lichess-puzzles-official-sample.csv');
const approvedSourceSha256 = 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073';
const tempDirectories = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 'corpus-delivery-test-'));
  tempDirectories.push(root);
  const lines = (await readFile(fixture, 'utf8')).trim().split(/\r?\n/).slice(1, 3);
  const sourceSha256 = approvedSourceSha256;
  const records = await Promise.all(lines.map((line) => mapLichessRow(line, {
    datasetVersion: '2026-08-02',
    sourcePublishedAt: '2026-08-02T07:23:55.000Z',
    retrievedAt: '2026-09-06T00:00:00.000Z',
    rawSha256: sourceSha256,
    importRunId: 'delivery-fixture-run',
  })));
  const input = path.join(root, 'accepted.jsonl');
  await writeFile(input, `${records.map(JSON.stringify).join('\n')}\n`);
  const inputSha256 = await sha256File(input);
  const manifest = path.join(root, 'import-manifest.json');
  await writeFile(manifest, JSON.stringify({
    manifestSchemaVersion: 'lichess-import-manifest.v1',
    corpusSchemaVersion: 'puzzle-record.v1',
    officialSourceUrl: 'https://database.lichess.org/lichess_db_puzzle.csv.zst',
    licenseId: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    datasetVersion: '2026-08-02',
    sourceSha256,
    acceptedCount: records.length,
    outputSha256: inputSha256,
    contentIdentitySha256: 'b'.repeat(64),
    completionStatus: 'completed',
  }));
  const validationReport = path.join(root, 'validation-report.json');
  await writeFile(validationReport, JSON.stringify({
    reportSchemaVersion: 'lichess-corpus-validation-report.v1',
    verdict: 'PASS', inputSha256, sourceSha256,
    counts: { lines: records.length, valid: records.length, quarantined: 0 },
  }));
  return { root, records, input, manifest, validationReport, outputRoot: path.join(root, 'public', 'corpus') };
}

function fileFetch(root, mutate = null) {
  return async (url) => {
    const file = path.join(root, String(url).replace(/^\/corpus\//, '').replaceAll('/', path.sep));
    let body = await readFile(file);
    if (mutate && String(url).includes('/chunks/')) body = Buffer.from(mutate(body.toString('utf8')));
    return new Response(body, { status: 200 });
  };
}

describe('clean-deployment corpus delivery', () => {
  test('builds a versioned release and activates only checksum-verified real records', async () => {
    const paths = await setup();
    const built = await buildCorpusDelivery({ ...paths, chunkSize: 1 });

    expect(built.pointer).toEqual({ pointerSchemaVersion: 'corpus-delivery-pointer.v1', activeRun: 'b'.repeat(64), history: [] });
    expect(built.manifest).toMatchObject({ completed: true, puzzleCount: 2, sourceSha256: approvedSourceSha256 });
    expect(built.manifest.chunks).toHaveLength(2);

    const loaded = await loadProductionCorpus(fileFetch(paths.outputRoot));
    expect(loaded).toMatchObject({ available: true, source: 'lichess', puzzleCount: 2 });
    expect(loaded.puzzles.map((puzzle) => puzzle.id)).toEqual(paths.records.map((record) => record.puzzleId));
    expect(loaded.puzzles[0]).toMatchObject({
      sourcePuzzleId: paths.records[0].sourcePuzzleId,
      correctMove: { from: paths.records[0].moves[0].slice(0, 2), to: paths.records[0].moves[0].slice(2, 4) },
      sourceUrl: paths.records[0].sourceUrl,
    });

    const tampered = await loadProductionCorpus(fileFetch(paths.outputRoot, (body) => body.replace('lichess-', 'tampered-')));
    expect(tampered).toMatchObject({ available: false, puzzles: [] });
    expect(tampered.reason).toMatch(/checksum/i);
  });

  test('validates records in a chunk concurrently', async () => {
    const paths = await setup();
    await buildCorpusDelivery({ ...paths, chunkSize: 2 });
    const subtle = globalThis.crypto.subtle;
    const digest = subtle.digest.bind(subtle);
    let recordDigests = 0;
    let releaseFirst;
    const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
    const spy = vi.spyOn(subtle, 'digest').mockImplementation(async (...args) => {
      if (new Uint8Array(args[1])[0] === 123) {
        recordDigests += 1;
        if (recordDigests === 1) await firstBlocked;
        if (recordDigests === 2) releaseFirst();
      }
      return digest(...args);
    });

    try {
      const loaded = await Promise.race([
        loadProductionCorpus(fileFetch(paths.outputRoot)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('record validation was sequential')), 500)),
      ]);
      expect(loaded).toMatchObject({ available: true, puzzleCount: 2 });
    } finally {
      spy.mockRestore();
      releaseFirst();
    }
  });

  test('rejects failed validation without moving the pointer and can roll back', async () => {
    const paths = await setup();
    await buildCorpusDelivery({ ...paths, chunkSize: 1 });
    const firstPointer = await readFile(path.join(paths.outputRoot, 'current.json'), 'utf8');
    const unapproved = JSON.parse(await readFile(paths.manifest, 'utf8'));
    unapproved.datasetVersion = '2099-12-31';
    await writeFile(paths.manifest, JSON.stringify(unapproved));
    await expect(buildCorpusDelivery({ ...paths })).rejects.toThrow(/approved/i);
    expect(await readFile(path.join(paths.outputRoot, 'current.json'), 'utf8')).toBe(firstPointer);
    unapproved.datasetVersion = '2026-08-02';
    await writeFile(paths.manifest, JSON.stringify(unapproved));
    const failedReport = JSON.parse(await readFile(paths.validationReport, 'utf8'));
    failedReport.verdict = 'FAIL';
    await writeFile(paths.validationReport, JSON.stringify(failedReport));
    await expect(buildCorpusDelivery({ ...paths, outputRoot: paths.outputRoot, contentIdentitySha256: 'c'.repeat(64) })).rejects.toThrow(/validation.*pass/i);
    expect(await readFile(path.join(paths.outputRoot, 'current.json'), 'utf8')).toBe(firstPointer);

    failedReport.verdict = 'PASS';
    await writeFile(paths.validationReport, JSON.stringify(failedReport));
    const importer = JSON.parse(await readFile(paths.manifest, 'utf8'));
    importer.contentIdentitySha256 = 'c'.repeat(64);
    await writeFile(paths.manifest, JSON.stringify(importer));
    await buildCorpusDelivery({ ...paths, chunkSize: 2 });
    const pointerBeforeRollback = await readFile(path.join(paths.outputRoot, 'current.json'), 'utf8');
    const oldChunk = path.join(paths.outputRoot, 'runs', 'b'.repeat(64), 'chunks', '00000.json');
    const originalChunk = await readFile(oldChunk);
    await writeFile(oldChunk, 'corrupt');
    await expect(rollbackCorpusDelivery(paths.outputRoot)).rejects.toThrow(/checksum/i);
    expect(await readFile(path.join(paths.outputRoot, 'current.json'), 'utf8')).toBe(pointerBeforeRollback);
    await writeFile(oldChunk, originalChunk);
    expect((await rollbackCorpusDelivery(paths.outputRoot)).activeRun).toBe('b'.repeat(64));
  });
});
