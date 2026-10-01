import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runImport, sha256File } from '../../../../scripts/import-lichess-puzzles.mjs';
import { publishCorpusRun, readCorpusRelease, rollbackCorpusRun } from '../../../../scripts/manage-corpus-release.mjs';

const input = path.resolve(process.argv[2]);
const output = 'artifacts/tech-verification/PHASE_2/P2-T06/recovery.json';
const root = await mkdtemp(path.join(tmpdir(), 'chess-p2t06-'));
const releaseRoot = path.join(root, 'release');
const clean = path.join(releaseRoot, 'runs', 'clean');
const resumed = path.join(releaseRoot, 'runs', 'resumed');

function targets(directory) {
  return {
    output: path.join(directory, 'accepted.jsonl'),
    quarantineOutput: path.join(directory, 'quarantine.jsonl'),
    manifestOutput: path.join(directory, 'manifest.json'),
    checkpoint: path.join(directory, 'checkpoint.json'),
  };
}

function options(directory, retrievedAt) {
  return {
    input,
    ...targets(directory),
    datasetVersion: '2026-08-02',
    sourcePublishedAt: '2026-08-02T07:23:55.000Z',
    retrievedAt,
    ratingMin: 1400,
    ratingMax: 1600,
    themes: [],
    excludedThemes: [],
    limit: 1000,
    batchSize: 100,
  };
}

function cliArgs(directory, ...extra) {
  const paths = targets(directory);
  return [
    'scripts/import-lichess-puzzles.mjs', '--input', input,
    '--output', paths.output, '--quarantine-output', paths.quarantineOutput,
    '--manifest-output', paths.manifestOutput, '--checkpoint', paths.checkpoint,
    '--dataset-version', '2026-08-02', '--source-published-at', '2026-08-02T07:23:55.000Z',
    '--rating-min', '1400', '--rating-max', '1600', '--limit', '1000', '--batch-size', '100', ...extra,
  ];
}

const interrupted = spawnSync(process.execPath, cliArgs(resumed, '--abort-after', '3000'), {
  cwd: path.resolve('.'), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
if (interrupted.status !== 75) throw new Error(`Expected interrupted exit 75: ${interrupted.stderr}`);
const interruptedResult = JSON.parse(interrupted.stdout);
const checkpoint = JSON.parse(await readFile(targets(resumed).checkpoint, 'utf8'));

const cleanResult = await runImport(options(clean, checkpoint.retrievedAt));
const restarted = spawnSync(process.execPath, cliArgs(resumed, '--resume'), {
  cwd: path.resolve('.'), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
if (restarted.status !== 0) throw new Error(`Expected resumed exit 0: ${restarted.stderr}`);
const resumedResult = JSON.parse(restarted.stdout);

const acceptedEqual = (await readFile(targets(clean).output)).equals(await readFile(targets(resumed).output));
const quarantineEqual = (await readFile(targets(clean).quarantineOutput)).equals(await readFile(targets(resumed).quarantineOutput));
if (!acceptedEqual || !quarantineEqual) throw new Error('Resumed artifacts differ from the clean import');

const rerun = spawnSync(process.execPath, cliArgs(clean), { cwd: path.resolve('.'), encoding: 'utf8' });
if (rerun.status !== 1 || !/refusing to overwrite/i.test(rerun.stderr)) throw new Error('In-place rerun was not rejected');

const publishedClean = await publishCorpusRun({ releaseRoot, runDirectory: clean });
const failed = path.join(releaseRoot, 'runs', 'failed');
await mkdir(failed, { recursive: true });
await writeFile(path.join(failed, 'accepted.jsonl.partial'), 'incomplete');
let failedPublishRejected = false;
try {
  await publishCorpusRun({ releaseRoot, runDirectory: failed });
} catch {
  failedPublishRejected = true;
}
if (!failedPublishRejected || JSON.stringify(await readCorpusRelease(releaseRoot)) !== JSON.stringify(publishedClean)) {
  throw new Error('Failed run changed the active release pointer');
}

const publishedResumed = await publishCorpusRun({ releaseRoot, runDirectory: resumed });
const idempotentPublish = await publishCorpusRun({ releaseRoot, runDirectory: resumed });
if (JSON.stringify(publishedResumed) !== JSON.stringify(idempotentPublish)) throw new Error('Repeated publish changed the pointer');
const rolledBack = await rollbackCorpusRun(releaseRoot);

const evidence = {
  verdict: 'PASS',
  tempRunRoot: root,
  sourceSha256: cleanResult.rawSha256,
  processRestart: {
    interruptedExitCode: interrupted.status,
    interruptedCounts: interruptedResult.counts,
    checkpointStatus: checkpoint.status,
    resumedExitCode: restarted.status,
    resumedCounts: resumedResult.counts,
  },
  reproducibility: {
    acceptedByteIdentical: acceptedEqual,
    quarantineByteIdentical: quarantineEqual,
    acceptedSha256: await sha256File(targets(clean).output),
    quarantineSha256: await sha256File(targets(clean).quarantineOutput),
    cleanContentIdentitySha256: cleanResult.manifest.contentIdentitySha256,
    resumedContentIdentitySha256: resumedResult.manifest.contentIdentitySha256,
  },
  idempotency: { inPlaceRerunExitCode: rerun.status, repeatedPublishNoOp: true },
  failedRunIsolation: { rejected: failedPublishRejected, activePointerUnchanged: true },
  releasePointers: { publishedClean, publishedResumed, rolledBack },
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
