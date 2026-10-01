import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress } from 'node:zlib';
import {
  mapLichessRow,
  persistOfficialSourceResponse,
  runImport,
} from '../../../../../scripts/import-lichess-puzzles.mjs';
import { validatePuzzleRecord } from '../../../../../src/services/puzzleRecord.ts';

const evidenceDir = path.resolve('artifacts/tech-verification/PHASE_2/P2-T04/verifier');
const runDir = path.join(evidenceDir, 'work', `adversarial-${Date.now()}`);
await mkdir(runDir, { recursive: true });
const fixtureText = await readFile('src/test/fixtures/lichess-puzzles-official-sample.csv', 'utf8');
const [header, row] = fixtureText.trim().split(/\r?\n/);
const context = {
  datasetVersion: '2026-08-02', sourcePublishedAt: '2026-08-02T07:23:55.000Z',
  retrievedAt: '2026-09-06T00:00:00.000Z', rawSha256: 'a'.repeat(64), importRunId: 'verifier',
};
const results = [];
let sequence = 0;

async function caseDir(name) {
  const directory = path.join(runDir, `${String(++sequence).padStart(2, '0')}-${name}`);
  await mkdir(directory, { recursive: true });
  return directory;
}
function targets(directory) {
  return {
    output: path.join(directory, 'accepted.jsonl'),
    quarantineOutput: path.join(directory, 'quarantine.jsonl'),
    manifestOutput: path.join(directory, 'manifest.json'),
    checkpoint: path.join(directory, 'checkpoint.json'),
  };
}
async function zstd(directory, bytes, seekable = true) {
  const raw = path.join(directory, 'raw.zst');
  await pipeline(Readable.from([bytes]), createZstdCompress(), createWriteStream(raw));
  if (!seekable) return raw;
  const final = path.join(directory, 'seekable.zst');
  await writeFile(final, Buffer.concat([Buffer.from('502a4d18040000000a008a00', 'hex'), await readFile(raw)]));
  return final;
}
const options = (input, directory) => ({
  input, ...targets(directory), datasetVersion: context.datasetVersion,
  sourcePublishedAt: context.sourcePublishedAt, retrievedAt: context.retrievedAt,
  ratingMin: 0, ratingMax: 4000, themes: [], excludedThemes: [], limit: 20, batchSize: 1,
});
async function rejects(promise, pattern) {
  let error;
  try { await promise; } catch (caught) { error = caught; }
  assert(error instanceof Error, 'expected rejection');
  assert.match(error.message, pattern);
  return error.message;
}
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, verdict: 'PASS', detail });
  } catch (error) {
    results.push({ name, verdict: 'FAIL', detail: error instanceof Error ? `${error.stack}` : String(error) });
  }
}

await check('malformed and both duplicate classes are quarantined', async () => {
  const directory = await caseDir('quarantine');
  const normalizedDuplicate = row.replace(/^00sHx,/, 'other,');
  const input = await zstd(directory, `${header}\n${row}\nmalformed,row\n${row}\n${normalizedDuplicate}\n`);
  const result = await runImport(options(input, directory));
  const quarantine = (await readFile(targets(directory).quarantineOutput, 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  assert.deepEqual(result.counts, { parsed: 4, filtered: 0, accepted: 1, invalid: 1, quarantined: 3, duplicate: 2 });
  assert.deepEqual(quarantine.map(({ reason }) => reason), ['malformed_row', 'duplicate_source_id', 'duplicate_normalized_puzzle']);
  return { counts: result.counts, reasons: quarantine.map(({ reason }) => reason) };
});

await check('truncated Zstd and invalid UTF-8 fail closed', async () => {
  const truncatedDir = await caseDir('truncated');
  const complete = await zstd(truncatedDir, fixtureText);
  const bytes = await readFile(complete);
  const truncated = path.join(truncatedDir, 'truncated.zst');
  await writeFile(truncated, bytes.subarray(0, Math.floor(bytes.length / 2)));
  const truncatedError = await rejects(runImport(options(truncated, path.join(truncatedDir, 'out'))), /zstd|unexpected|truncated|stream/i);
  const utf8Dir = await caseDir('invalid-utf8');
  const invalid = await zstd(utf8Dir, Buffer.concat([Buffer.from(`${header}\n`), Buffer.from([0xff, 0xfe])]));
  const utf8Error = await rejects(runImport(options(invalid, path.join(utf8Dir, 'out'))), /encoding|encoded|utf-8/i);
  return { truncatedError, utf8Error };
});

await check('checkpoint corruption, path drift, and config drift fail closed', async () => {
  const directory = await caseDir('checkpoint');
  const input = await zstd(directory, fixtureText);
  const corruptDir = path.join(directory, 'corrupt');
  await mkdir(corruptDir, { recursive: true });
  await writeFile(targets(corruptDir).checkpoint, '{broken');
  const corruptError = await rejects(runImport({ ...options(input, corruptDir), resume: true }), /checkpoint/i);
  const resumeDir = path.join(directory, 'resume');
  await mkdir(resumeDir, { recursive: true });
  const interrupted = await runImport({ ...options(input, resumeDir), abortAfter: 1 });
  assert.equal(interrupted.status, 'interrupted');
  const configError = await rejects(runImport({ ...options(input, resumeDir), resume: true, ratingMin: 1 }), /checkpoint.*configuration/i);
  const pathError = await rejects(runImport({ ...options(input, resumeDir), resume: true, output: path.join(resumeDir, 'other.jsonl') }), /checkpoint.*path/i);
  return { corruptError, configError, pathError };
});

await check('inherited required properties and forged content are rejected', async () => {
  const record = await mapLichessRow(row, context);
  const inherited = Object.create(record);
  const inheritedResult = await validatePuzzleRecord(inherited);
  assert.equal(inheritedResult.valid, false);
  assert.equal(inheritedResult.errors.filter(({ code }) => code === 'required').length, 16);
  const forged = { ...record, rating: record.rating + 1 };
  const forgedResult = await validatePuzzleRecord(forged);
  assert.equal(forgedResult.valid, false);
  assert(forgedResult.errors.some(({ field, code }) => field === 'recordSha256' && code === 'mismatch'));
  return { inheritedRequiredErrors: 16, forgedChecksumRejected: true };
});

await check('download persistence fails without partial destinations', async () => {
  const directory = await caseDir('download');
  const unavailable = path.join(directory, 'unavailable.zst');
  const httpError = await rejects(persistOfficialSourceResponse(new Response('down', { status: 503 }), unavailable), /HTTP 503/i);
  await assert.rejects(stat(unavailable), { code: 'ENOENT' });
  const interrupted = path.join(directory, 'interrupted.zst');
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.error(new Error('cut')); } });
  const interruptedError = await rejects(persistOfficialSourceResponse(new Response(body), interrupted), /cut/i);
  await assert.rejects(stat(interrupted), { code: 'ENOENT' });
  return { httpError, interruptedError, partialFiles: 0 };
});

await check('CLI fatal paths are non-zero and controlled interruption is 75', async () => {
  const directory = await caseDir('cli');
  const input = await zstd(directory, fixtureText);
  const fatalCases = [
    ['missing required metadata', ['scripts/import-lichess-puzzles.mjs', '--input', input]],
    ['unknown option', ['scripts/import-lichess-puzzles.mjs', '--unknown']],
    ['unapproved source', ['scripts/import-lichess-puzzles.mjs', '--source-url', 'https://example.test/fake.zst',
      '--output', path.join(directory, 'fake.jsonl'), '--quarantine-output', path.join(directory, 'fake-quarantine.jsonl'),
      '--manifest-output', path.join(directory, 'fake-manifest.json'), '--checkpoint', path.join(directory, 'fake-checkpoint.json'),
      '--dataset-version', context.datasetVersion]],
  ].map(([name, args]) => {
    const child = spawnSync(process.execPath, args, { cwd: path.resolve('.'), encoding: 'utf8' });
    assert.equal(child.status, 1, `${name}: expected exit 1, got ${child.status}`);
    return { name, exit: child.status, stderr: child.stderr.trim().split(/\r?\n/).at(-1) };
  });
  const controlledDir = path.join(directory, 'controlled');
  await mkdir(controlledDir, { recursive: true });
  const t = targets(controlledDir);
  const args = ['scripts/import-lichess-puzzles.mjs', '--input', input, '--output', t.output, '--quarantine-output', t.quarantineOutput,
    '--manifest-output', t.manifestOutput, '--checkpoint', t.checkpoint, '--dataset-version', context.datasetVersion,
    '--source-published-at', context.sourcePublishedAt, '--limit', '4', '--rating-min', '0', '--rating-max', '4000', '--batch-size', '1', '--abort-after', '1'];
  const controlled = spawnSync(process.execPath, args, { cwd: path.resolve('.'), encoding: 'utf8' });
  assert.equal(controlled.status, 75);
  assert.equal(JSON.parse(controlled.stdout).status, 'interrupted');
  return { fatalCases, controlledInterruptionExit: controlled.status };
});

const summary = { verdict: results.every(({ verdict }) => verdict === 'PASS') ? 'PASS' : 'FAIL', runDir, cases: results };
await writeFile(path.join(evidenceDir, 'adversarial-results.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (summary.verdict === 'FAIL') process.exitCode = 1;
