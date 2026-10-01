import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCorpusDelivery, rollbackCorpusDelivery } from '../../../../scripts/build-corpus-delivery.mjs';
import { runImport, sha256File } from '../../../../scripts/import-lichess-puzzles.mjs';
import { validateCorpus } from '../../../../scripts/validate-puzzle-corpus.mjs';

const input = path.resolve(process.argv[2]);
const output = 'artifacts/tech-verification/PHASE_2/P2-T08/recovery.json';
const root = await mkdtemp(path.join(tmpdir(), 'chess-p2t08-recovery-'));
const clean = path.join(root, 'clean');
const resumed = path.join(root, 'resumed');

function targets(directory) {
  return {
    output: path.join(directory, 'accepted.jsonl'),
    quarantineOutput: path.join(directory, 'quarantine.jsonl'),
    manifestOutput: path.join(directory, 'manifest.json'),
    checkpoint: path.join(directory, 'checkpoint.json'),
    validationQuarantine: path.join(directory, 'validation-quarantine.jsonl'),
    validationReport: path.join(directory, 'validation-report.json'),
  };
}

function options(directory, retrievedAt) {
  return {
    input,
    ...targets(directory),
    datasetVersion: '2026-08-02',
    sourcePublishedAt: '2026-08-02T07:23:55.000Z',
    retrievedAt,
    ratingMin: 0,
    ratingMax: 4000,
    themes: [],
    excludedThemes: ['zugzwang'],
    limit: 20000,
    batchSize: 500,
  };
}

function cliArgs(directory, ...extra) {
  const files = targets(directory);
  return [
    'scripts/import-lichess-puzzles.mjs', '--input', input,
    '--output', files.output, '--quarantine-output', files.quarantineOutput,
    '--manifest-output', files.manifestOutput, '--checkpoint', files.checkpoint,
    '--dataset-version', '2026-08-02', '--source-published-at', '2026-08-02T07:23:55.000Z',
    '--rating-min', '0', '--rating-max', '4000', '--exclude-themes', 'zugzwang',
    '--limit', '20000', '--batch-size', '500', ...extra,
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

const cleanValidation = await validateCorpus({
  input: targets(clean).output,
  manifest: targets(clean).manifestOutput,
  quarantineOutput: targets(clean).validationQuarantine,
  reportOutput: targets(clean).validationReport,
});
const resumedValidation = await validateCorpus({
  input: targets(resumed).output,
  manifest: targets(resumed).manifestOutput,
  quarantineOutput: targets(resumed).validationQuarantine,
  reportOutput: targets(resumed).validationReport,
});
if (cleanValidation.verdict !== 'PASS' || resumedValidation.verdict !== 'PASS') {
  throw new Error('Clean or resumed corpus did not pass full validation');
}

const rerun = spawnSync(process.execPath, cliArgs(clean), { cwd: path.resolve('.'), encoding: 'utf8' });
if (rerun.status !== 1 || !/refusing to overwrite/i.test(rerun.stderr)) throw new Error('In-place rerun was not rejected');

const deliveryRoot = path.join(root, 'delivery');
const previousRun = 'c836c4470ffc4289945d2e48f987ad1849926f7cb526002bb81e4f9511b00338';
await cp(path.join('public/corpus/runs', previousRun), path.join(deliveryRoot, 'runs', previousRun), { recursive: true });
await writeFile(path.join(deliveryRoot, 'current.json'), `${JSON.stringify({
  pointerSchemaVersion: 'corpus-delivery-pointer.v1', activeRun: previousRun, history: [],
}, null, 2)}\n`);
const published = await buildCorpusDelivery({
  input: targets(clean).output,
  manifest: targets(clean).manifestOutput,
  validationReport: targets(clean).validationReport,
  outputRoot: deliveryRoot,
  chunkSize: 1000,
});
const repeated = await buildCorpusDelivery({
  input: targets(clean).output,
  manifest: targets(clean).manifestOutput,
  validationReport: targets(clean).validationReport,
  outputRoot: deliveryRoot,
  chunkSize: 1000,
});
if (JSON.stringify(published.pointer) !== JSON.stringify(repeated.pointer)) throw new Error('Repeated delivery changed the pointer');
const rolledBack = await rollbackCorpusDelivery(deliveryRoot);
if (rolledBack.activeRun !== previousRun) throw new Error('Rollback did not restore the prior release');

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
  validation: { clean: cleanValidation, resumed: resumedValidation },
  idempotency: { inPlaceRerunExitCode: rerun.status, repeatedDeliveryNoOp: true },
  delivery: {
    puzzleCount: published.manifest.puzzleCount,
    chunkCount: published.manifest.chunks.length,
    published: published.pointer,
    rolledBack,
  },
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
