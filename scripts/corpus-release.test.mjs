import { afterEach, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress } from 'node:zlib';
import { runImport } from './import-lichess-puzzles.mjs';
import { publishCorpusRun, readCorpusRelease, rollbackCorpusRun } from './manage-corpus-release.mjs';

const fixture = path.resolve('src/test/fixtures/lichess-puzzles-official-sample.csv');
const tempDirectories = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function tempDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'corpus-release-test-'));
  tempDirectories.push(directory);
  return directory;
}

async function compressedFixture(root) {
  const input = path.join(root, 'fixture.zst');
  await pipeline(Readable.from([await readFile(fixture)]), createZstdCompress(), createWriteStream(input));
  return input;
}

function targets(directory) {
  return {
    output: path.join(directory, 'accepted.jsonl'),
    quarantineOutput: path.join(directory, 'quarantine.jsonl'),
    manifestOutput: path.join(directory, 'manifest.json'),
    checkpoint: path.join(directory, 'checkpoint.json'),
  };
}

function options(input, directory, limit = 4) {
  return {
    input,
    ...targets(directory),
    datasetVersion: '2026-08-02',
    sourcePublishedAt: '2026-08-02T07:23:55.000Z',
    retrievedAt: '2026-09-06T00:00:00.000Z',
    ratingMin: 0,
    ratingMax: 4000,
    themes: [],
    excludedThemes: [],
    limit,
    batchSize: 2,
  };
}

function cliArgs(input, directory, ...extra) {
  const paths = targets(directory);
  return [
    'scripts/import-lichess-puzzles.mjs', '--input', input,
    '--output', paths.output, '--quarantine-output', paths.quarantineOutput,
    '--manifest-output', paths.manifestOutput, '--checkpoint', paths.checkpoint,
    '--dataset-version', '2026-08-02', '--source-published-at', '2026-08-02T07:23:55.000Z',
    '--rating-min', '0', '--rating-max', '4000', '--limit', '4', '--batch-size', '2', ...extra,
  ];
}

describe('corpus process recovery and release pointer', () => {
  test('resume is byte-identical to a clean import and refuses an in-place rerun', async () => {
    const root = await tempDirectory();
    const input = await compressedFixture(root);
    const clean = path.join(root, 'clean');
    const resumed = path.join(root, 'resumed');

    const interrupted = spawnSync(process.execPath, cliArgs(input, resumed, '--abort-after', '2'), {
      cwd: path.resolve('.'), encoding: 'utf8',
    });
    expect(interrupted.status).toBe(75);
    expect(JSON.parse(interrupted.stdout).status).toBe('interrupted');
    const retrievedAt = JSON.parse(await readFile(targets(resumed).checkpoint, 'utf8')).retrievedAt;
    const cleanResult = await runImport({ ...options(input, clean), retrievedAt });
    const restarted = spawnSync(process.execPath, cliArgs(input, resumed, '--resume'), {
      cwd: path.resolve('.'), encoding: 'utf8',
    });
    expect(restarted.status).toBe(0);
    const resumedResult = JSON.parse(restarted.stdout);

    expect(await readFile(targets(resumed).output)).toEqual(await readFile(targets(clean).output));
    expect(await readFile(targets(resumed).quarantineOutput)).toEqual(await readFile(targets(clean).quarantineOutput));
    expect(resumedResult.manifest.contentIdentitySha256).toBe(cleanResult.manifest.contentIdentitySha256);
    await expect(runImport(options(input, clean))).rejects.toThrow(/refusing to overwrite/i);
  });

  test('publishes only complete verified runs and rolls back by one atomic pointer', async () => {
    const root = await tempDirectory();
    const input = await compressedFixture(root);
    const releaseRoot = path.join(root, 'release');
    const runA = path.join(releaseRoot, 'runs', 'run-a');
    const runB = path.join(releaseRoot, 'runs', 'run-b');
    await runImport(options(input, runA, 2));
    await runImport(options(input, runB, 4));

    const first = await publishCorpusRun({ releaseRoot, runDirectory: runA });
    expect(first).toEqual(expect.objectContaining({ activeRun: 'run-a', history: [] }));

    const failed = path.join(releaseRoot, 'runs', 'failed');
    await mkdir(failed, { recursive: true });
    await writeFile(path.join(failed, 'accepted.jsonl.partial'), 'incomplete');
    await expect(publishCorpusRun({ releaseRoot, runDirectory: failed })).rejects.toThrow(/manifest|complete/i);
    expect(await readCorpusRelease(releaseRoot)).toEqual(first);

    const second = await publishCorpusRun({ releaseRoot, runDirectory: runB });
    expect(second).toEqual(expect.objectContaining({ activeRun: 'run-b', history: ['run-a'] }));
    expect(await publishCorpusRun({ releaseRoot, runDirectory: runB })).toEqual(second);

    const originalA = await readFile(targets(runA).output);
    await writeFile(targets(runA).output, 'corrupt');
    await expect(rollbackCorpusRun(releaseRoot)).rejects.toThrow(/checksum/i);
    expect(await readCorpusRelease(releaseRoot)).toEqual(second);
    await writeFile(targets(runA).output, originalA);

    const rolledBack = await rollbackCorpusRun(releaseRoot);
    expect(rolledBack).toEqual(expect.objectContaining({ activeRun: 'run-a', history: [] }));
  });

  test('rejects a direct-child symlink or junction that escapes the physical runs directory', async () => {
    const root = await tempDirectory();
    const input = await compressedFixture(root);
    const releaseRoot = path.join(root, 'release');
    const outside = path.join(root, 'outside-valid');
    const junction = path.join(releaseRoot, 'runs', 'junction-escape');
    await runImport(options(input, outside, 2));
    await mkdir(path.dirname(junction), { recursive: true });
    await symlink(outside, junction, process.platform === 'win32' ? 'junction' : 'dir');

    await expect(publishCorpusRun({ releaseRoot, runDirectory: junction })).rejects.toThrow(/junction|symbolic|physical|run directory/i);
  });
});
