import { lstat, mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256File } from './import-lichess-puzzles.mjs';

const POINTER_SCHEMA = 'corpus-release-pointer.v1';
const SEAL_SCHEMA = 'corpus-run-seal.v1';

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, filePath);
}

async function directRunName(releaseRoot, runDirectory) {
  const runsRoot = path.resolve(releaseRoot, 'runs');
  const resolved = path.resolve(runDirectory);
  const relative = path.relative(runsRoot, resolved);
  if (!relative || path.isAbsolute(relative) || relative.startsWith('..') || path.dirname(relative) !== '.') {
    throw new Error('Run directory must be a direct child of the release runs directory');
  }
  if ((await lstat(resolved)).isSymbolicLink()) throw new Error('Run directory cannot be a symbolic link or junction');
  const physicalRelative = path.relative(await realpath(runsRoot), await realpath(resolved));
  if (!physicalRelative || path.isAbsolute(physicalRelative) || physicalRelative.startsWith('..') || path.dirname(physicalRelative) !== '.') {
    throw new Error('Run directory must be a physical direct child of the release runs directory');
  }
  return relative;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function verifyRun(releaseRoot, runDirectory) {
  const runName = await directRunName(releaseRoot, runDirectory);
  const manifestPath = path.join(runDirectory, 'manifest.json');
  const acceptedPath = path.join(runDirectory, 'accepted.jsonl');
  const quarantinePath = path.join(runDirectory, 'quarantine.jsonl');
  const manifest = await readJson(manifestPath, 'Invalid or missing run manifest');
  if (manifest.completionStatus !== 'completed') throw new Error('Run manifest is not complete');
  const [manifestSha256, outputSha256, quarantineSha256] = await Promise.all([
    sha256File(manifestPath), sha256File(acceptedPath), sha256File(quarantinePath),
  ]);
  if (outputSha256 !== manifest.outputSha256) throw new Error('Accepted corpus checksum does not match run manifest');
  if (quarantineSha256 !== manifest.quarantineSha256) throw new Error('Quarantine checksum does not match run manifest');
  const seal = {
    sealSchemaVersion: SEAL_SCHEMA,
    runName,
    importRunId: manifest.importRunId,
    manifestSha256,
    outputSha256,
    quarantineSha256,
    contentIdentitySha256: manifest.contentIdentitySha256,
  };
  const sealPath = path.join(runDirectory, 'seal.json');
  if (await exists(sealPath)) {
    const stored = await readJson(sealPath, 'Invalid run seal');
    if (JSON.stringify(stored) !== JSON.stringify(seal)) throw new Error('Run seal does not match immutable artifacts');
  }
  return { runName, seal, sealPath };
}

export async function readCorpusRelease(releaseRoot) {
  const pointerPath = path.join(releaseRoot, 'current.json');
  const pointer = await readJson(pointerPath, 'Invalid or missing corpus release pointer');
  if (pointer.pointerSchemaVersion !== POINTER_SCHEMA || typeof pointer.activeRun !== 'string'
      || !Array.isArray(pointer.history) || pointer.history.some((run) => typeof run !== 'string')) {
    throw new Error('Invalid corpus release pointer schema');
  }
  return pointer;
}

async function readOptionalPointer(releaseRoot) {
  try {
    return await readCorpusRelease(releaseRoot);
  } catch (error) {
    if (error instanceof Error && /ENOENT/.test(error.message)) {
      return { pointerSchemaVersion: POINTER_SCHEMA, activeRun: null, history: [] };
    }
    throw error;
  }
}

export async function publishCorpusRun({ releaseRoot, runDirectory }) {
  const verified = await verifyRun(releaseRoot, runDirectory);
  const current = await readOptionalPointer(releaseRoot);
  if (current.activeRun === verified.runName) return current;
  if (!await exists(verified.sealPath)) await writeJsonAtomic(verified.sealPath, verified.seal);
  const history = current.history.filter((run) => run !== verified.runName);
  if (current.activeRun) history.push(current.activeRun);
  const next = { pointerSchemaVersion: POINTER_SCHEMA, activeRun: verified.runName, history };
  await writeJsonAtomic(path.join(releaseRoot, 'current.json'), next);
  return next;
}

export async function rollbackCorpusRun(releaseRoot) {
  const current = await readCorpusRelease(releaseRoot);
  if (!current.history.length) throw new Error('No previous corpus run is available for rollback');
  const activeRun = current.history.at(-1);
  await verifyRun(releaseRoot, path.join(releaseRoot, 'runs', activeRun));
  const next = { pointerSchemaVersion: POINTER_SCHEMA, activeRun, history: current.history.slice(0, -1) };
  await writeJsonAtomic(path.join(releaseRoot, 'current.json'), next);
  return next;
}

function parseCli(argv) {
  const [action, ...args] = argv;
  const options = { action };
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--release-root': 'releaseRoot', '--run-dir': 'runDirectory' }[args[index]];
    if (!key || !args[index + 1]) throw new Error(`Invalid option: ${args[index] ?? ''}`);
    options[key] = args[index + 1];
  }
  if (!['publish', 'rollback', 'status'].includes(action) || !options.releaseRoot) throw new Error('Usage: manage-corpus-release.mjs <publish|rollback|status> --release-root <path> [--run-dir <path>]');
  if (action === 'publish' && !options.runDirectory) throw new Error('--run-dir is required for publish');
  return options;
}

async function main() {
  const options = parseCli(process.argv.slice(2));
  const result = options.action === 'publish'
    ? await publishCorpusRun(options)
    : options.action === 'rollback'
      ? await rollbackCorpusRun(options.releaseRoot)
      : await readCorpusRelease(options.releaseRoot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
