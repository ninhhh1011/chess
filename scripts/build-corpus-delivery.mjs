import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { sha256File } from './import-lichess-puzzles.mjs';

const POINTER_SCHEMA = 'corpus-delivery-pointer.v1';
const MANIFEST_SCHEMA = 'corpus-delivery-manifest.v1';
const HEX_64 = /^[a-f0-9]{64}$/;
const APPROVED_SOURCE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const APPROVED_LICENSE_URL = 'https://creativecommons.org/publicdomain/zero/1.0/';
const APPROVED_DATASET_VERSION = '2026-08-02';
const APPROVED_SOURCE_SHA256 = 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073';

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, filePath);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertUpstream(importManifest, validation, inputSha256) {
  if (importManifest.manifestSchemaVersion !== 'lichess-import-manifest.v1'
      || importManifest.corpusSchemaVersion !== 'puzzle-record.v1'
      || importManifest.completionStatus !== 'completed') {
    throw new Error('Import manifest must describe a completed puzzle-record.v1 run');
  }
  if (validation.reportSchemaVersion !== 'lichess-corpus-validation-report.v1' || validation.verdict !== 'PASS') {
    throw new Error('Validation report must have a PASS verdict');
  }
  if (importManifest.officialSourceUrl !== APPROVED_SOURCE_URL || importManifest.licenseId !== 'CC0-1.0'
      || importManifest.licenseUrl !== APPROVED_LICENSE_URL || importManifest.datasetVersion !== APPROVED_DATASET_VERSION
      || importManifest.sourceSha256 !== APPROVED_SOURCE_SHA256) {
    throw new Error('Import manifest does not match the approved Lichess source, license, dataset, and checksum');
  }
  if (importManifest.outputSha256 !== inputSha256 || validation.inputSha256 !== inputSha256) {
    throw new Error('Accepted corpus checksum does not match upstream evidence');
  }
  if (!HEX_64.test(importManifest.sourceSha256) || validation.sourceSha256 !== importManifest.sourceSha256) {
    throw new Error('Official source checksum does not match upstream evidence');
  }
  if (!HEX_64.test(importManifest.contentIdentitySha256)) throw new Error('Invalid corpus content identity');
  if (validation.counts?.quarantined !== 0 || validation.counts?.valid !== importManifest.acceptedCount) {
    throw new Error('Validated record counts do not match the import manifest');
  }
}

async function writeChunks(input, directory, chunkSize) {
  const chunks = [];
  let records = [];
  let count = 0;
  const lines = createInterface({ input: createReadStream(input, { encoding: 'utf8' }), crlfDelay: Infinity });
  async function flush() {
    if (!records.length) return;
    const file = `chunks/${String(chunks.length).padStart(5, '0')}.json`;
    const body = `${JSON.stringify(records)}\n`;
    await writeFile(path.join(directory, file), body);
    chunks.push({ file, count: records.length, sha256: sha256(body) });
    records = [];
  }
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      throw new Error(`Accepted corpus contains invalid JSON at record ${count + 1}`);
    }
    count += 1;
    if (records.length === chunkSize) await flush();
  }
  await flush();
  return { chunks, count };
}

async function readPointer(outputRoot) {
  const file = path.join(outputRoot, 'current.json');
  if (!await exists(file)) return { pointerSchemaVersion: POINTER_SCHEMA, activeRun: null, history: [] };
  const pointer = await readJson(file, 'Invalid corpus delivery pointer');
  if (pointer.pointerSchemaVersion !== POINTER_SCHEMA
      || (pointer.activeRun !== null && !HEX_64.test(pointer.activeRun))
      || !Array.isArray(pointer.history) || pointer.history.some((run) => !HEX_64.test(run))) {
    throw new Error('Invalid corpus delivery pointer schema');
  }
  return pointer;
}

async function verifyDeliveryRun(outputRoot, runName) {
  const runDirectory = path.join(outputRoot, 'runs', runName);
  if ((await lstat(runDirectory)).isSymbolicLink()) throw new Error('Corpus run cannot be a symbolic link or junction');
  const manifest = await readJson(path.join(runDirectory, 'manifest.json'), 'Invalid delivery manifest');
  if (manifest.manifestSchemaVersion !== MANIFEST_SCHEMA || !manifest.completed
      || manifest.contentIdentitySha256 !== runName || !Array.isArray(manifest.chunks)) {
    throw new Error('Corpus delivery run is incomplete or invalid');
  }
  let count = 0;
  for (const chunk of manifest.chunks) {
    if (!/^chunks\/\d{5}\.json$/.test(chunk?.file) || !Number.isInteger(chunk.count)
        || chunk.count < 1 || !HEX_64.test(chunk.sha256)) throw new Error('Invalid corpus chunk manifest');
    if (await sha256File(path.join(runDirectory, chunk.file)) !== chunk.sha256) {
      throw new Error(`Corpus chunk checksum mismatch: ${chunk.file}`);
    }
    count += chunk.count;
  }
  if (count !== manifest.puzzleCount) throw new Error('Corpus delivery count does not match its manifest');
  return { manifest, runDirectory };
}

async function activate(outputRoot, runName) {
  const current = await readPointer(outputRoot);
  if (current.activeRun === runName) return current;
  const history = current.history.filter((item) => item !== runName);
  if (current.activeRun) history.push(current.activeRun);
  const pointer = { pointerSchemaVersion: POINTER_SCHEMA, activeRun: runName, history };
  await writeJsonAtomic(path.join(outputRoot, 'current.json'), pointer);
  return pointer;
}

export async function buildCorpusDelivery({ input, manifest, validationReport, outputRoot, chunkSize = 1000 }) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) throw new Error('chunkSize must be a positive integer');
  const [importManifest, validation, inputSha256] = await Promise.all([
    readJson(manifest, 'Invalid import manifest'),
    readJson(validationReport, 'Invalid validation report'),
    sha256File(input),
  ]);
  assertUpstream(importManifest, validation, inputSha256);

  const runName = importManifest.contentIdentitySha256;
  const runsRoot = path.join(outputRoot, 'runs');
  const runDirectory = path.join(runsRoot, runName);
  if (await exists(runDirectory)) {
    const { manifest: existing } = await verifyDeliveryRun(outputRoot, runName);
    if (existing.contentIdentitySha256 !== runName || existing.inputSha256 !== inputSha256 || !existing.completed) {
      throw new Error('Existing corpus run does not match immutable input');
    }
    return { manifest: existing, pointer: await activate(outputRoot, runName), runDirectory };
  }

  await mkdir(runsRoot, { recursive: true });
  const temporary = path.join(runsRoot, `.tmp-${runName}-${process.pid}`);
  await mkdir(path.join(temporary, 'chunks'), { recursive: true });
  try {
    const built = await writeChunks(input, temporary, chunkSize);
    if (built.count !== importManifest.acceptedCount) throw new Error('Delivered record count does not match import manifest');
    const deliveryManifest = {
      manifestSchemaVersion: MANIFEST_SCHEMA,
      corpusSchemaVersion: 'puzzle-record.v1',
      completed: true,
      contentIdentitySha256: runName,
      inputSha256,
      source: 'lichess',
      officialSourceUrl: importManifest.officialSourceUrl,
      licenseId: importManifest.licenseId,
      licenseUrl: importManifest.licenseUrl,
      datasetVersion: importManifest.datasetVersion,
      sourceSha256: importManifest.sourceSha256,
      puzzleCount: built.count,
      chunks: built.chunks,
    };
    await writeJsonAtomic(path.join(temporary, 'manifest.json'), deliveryManifest);
    await rename(temporary, runDirectory);
    return { manifest: deliveryManifest, pointer: await activate(outputRoot, runName), runDirectory };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export async function rollbackCorpusDelivery(outputRoot) {
  const current = await readPointer(outputRoot);
  if (!current.history.length) throw new Error('No previous corpus delivery is available for rollback');
  const activeRun = current.history.at(-1);
  await verifyDeliveryRun(outputRoot, activeRun);
  const pointer = { pointerSchemaVersion: POINTER_SCHEMA, activeRun, history: current.history.slice(0, -1) };
  await writeJsonAtomic(path.join(outputRoot, 'current.json'), pointer);
  return pointer;
}

function parseArgs(argv) {
  const [action = 'build', ...args] = argv;
  const result = { action };
  for (let index = 0; index < args.length; index += 2) {
    const key = {
      '--input': 'input', '--manifest': 'manifest', '--validation-report': 'validationReport',
      '--output-root': 'outputRoot', '--chunk-size': 'chunkSize',
    }[args[index]];
    if (!key || args[index + 1] === undefined) throw new Error(`Invalid option: ${args[index] ?? ''}`);
    result[key] = key === 'chunkSize' ? Number(args[index + 1]) : args[index + 1];
  }
  if (!['build', 'rollback'].includes(action) || !result.outputRoot
      || (action === 'build' && (!result.input || !result.manifest || !result.validationReport))) {
    throw new Error('Usage: build-corpus-delivery.mjs <build|rollback> --output-root <path> [--input <jsonl> --manifest <json> --validation-report <json>]');
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.action === 'rollback'
    ? await rollbackCorpusDelivery(options.outputRoot)
    : await buildCorpusDelivery(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
