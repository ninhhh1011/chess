import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, readdir, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { runImport, sha256File } from '../../../../../scripts/import-lichess-puzzles.mjs';
import { publishCorpusRun, readCorpusRelease, rollbackCorpusRun } from '../../../../../scripts/manage-corpus-release.mjs';

const repo = path.resolve(import.meta.dirname, '../../../../..');
const evidenceRoot = import.meta.dirname;
const source = path.join(tmpdir(), 'chess-p2t04', 'lichess_db_puzzle.csv.zst');
const officialSha = 'a0ea9129c6b6434dfb34a9ac4ec660c9cfff22b2de465e01854f018fc847f073';
const root = await mkdtemp(path.join(tmpdir(), 'chess-p2t06-verifier-'));
const releaseRoot = path.join(root, 'release');
const clean = path.join(releaseRoot, 'runs', 'clean');
const resumed = path.join(releaseRoot, 'runs', 'resumed');
const baseUrl = process.argv[2] || 'http://127.0.0.1:4206';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
    input: source,
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

function importCli(directory, ...extra) {
  const paths = targets(directory);
  return spawnSync(process.execPath, [
    'scripts/import-lichess-puzzles.mjs', '--input', source,
    '--output', paths.output, '--quarantine-output', paths.quarantineOutput,
    '--manifest-output', paths.manifestOutput, '--checkpoint', paths.checkpoint,
    '--dataset-version', '2026-08-02', '--source-published-at', '2026-08-02T07:23:55.000Z',
    '--rating-min', '1400', '--rating-max', '1600', '--limit', '1000', '--batch-size', '100',
    ...extra,
  ], { cwd: repo, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function managerCli(...args) {
  return spawnSync(process.execPath, ['scripts/manage-corpus-release.mjs', ...args], {
    cwd: repo, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
}

async function artifactHashes(directory) {
  const values = {};
  for (const [name, file] of Object.entries(targets(directory))) values[name] = await sha256File(file);
  return values;
}

async function expectReject(action, pattern, label) {
  let message = '';
  try { await action(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  assert(pattern.test(message), `${label} did not reject as expected: ${message}`);
  return message;
}

async function browserSmoke(tag) {
  const outputDir = path.join(evidenceRoot, tag);
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  const pageErrors = [];
  const networkErrors = [];
  const productionAssets = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
    if (/\/assets\/[^/]+-[A-Za-z0-9_-]+\.(?:js|css)$/.test(response.url())) productionAssets.push(response.url());
  });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__p2t06Stockfish = { starts: [], ready: [], bestmoves: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, workerOptions) {
        super(url, workerOptions);
        if (String(url).includes('stockfish-worker.js')) {
          window.__p2t06Stockfish.starts.push(String(url));
          this.addEventListener('message', (event) => {
            if (event.data?.type === 'ready') window.__p2t06Stockfish.ready.push(event.data);
            if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) window.__p2t06Stockfish.bestmoves.push(event.data.data);
          });
        }
      }
    };
  });
  const moveHistory = () => page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
  async function clickSquare(square) {
    const board = await page.locator('.chess-board-container').boundingBox();
    assert(board, 'Chessboard is not visible');
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    await page.mouse.click(board.x + (file + 0.5) * board.width / 8, board.y + (8 - rank + 0.5) * board.height / 8);
  }
  try {
    await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
    const skip = page.getByRole('button', { name: 'Bỏ qua' });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.getByRole('button', { name: /^Dễ -/ }).click();
    await page.getByRole('button', { name: /^Trắng -/ }).click();
    await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
    await page.locator('.chess-board-container').waitFor({ state: 'visible' });
    const replay = new Chess();
    const counts = [];
    for (const preferred of ['e2e4', 'g1f3', 'd2d3']) {
      const legal = replay.moves({ verbose: true });
      const move = legal.find((candidate) => `${candidate.from}${candidate.to}` === preferred)
        || legal.find((candidate) => !candidate.promotion);
      assert(move, `No legal player move for ${preferred}`);
      const before = (await moveHistory()).length;
      await clickSquare(move.from);
      await clickSquare(move.to);
      await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
        .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value)).length >= count,
      before + 2, { timeout: 30000 });
      const history = await moveHistory();
      counts.push(history.length);
      replay.reset();
      for (const san of history) replay.move(san);
      assert(replay.turn() === 'w', `Expected White after ${history.length} plies`);
    }
    const sanMoves = await moveHistory();
    const worker = await page.evaluate(() => window.__p2t06Stockfish);
    assert(sanMoves.length >= 6 && productionAssets.length && worker.starts.length
      && worker.ready.some(({ success }) => success) && worker.bestmoves.length >= 3,
    `${tag} production/Stockfish evidence incomplete`);
    assert(!consoleErrors.length && !pageErrors.length && !networkErrors.length,
      `${tag} browser errors: ${JSON.stringify({ consoleErrors, pageErrors, networkErrors })}`);
    await page.screenshot({ path: path.join(outputDir, 'self-play.png'), fullPage: true });
    const result = {
      verdict: 'PASS', state: tag, releasePointer: await readCorpusRelease(releaseRoot),
      productionAssets: [...new Set(productionAssets)], plies: sanMoves.length, sanMoves,
      finalFen: replay.fen(), pgnReplay: 'PASS', engineSource: 'stockfish_wasm', worker,
      consoleErrors, pageErrors, networkErrors,
    };
    await Promise.all([
      writeFile(path.join(outputDir, 'self-play.json'), `${JSON.stringify(result, null, 2)}\n`),
      writeFile(path.join(outputDir, 'browser-console.json'), `${JSON.stringify(consoleErrors, null, 2)}\n`),
      writeFile(path.join(outputDir, 'page-errors.json'), `${JSON.stringify(pageErrors, null, 2)}\n`),
      writeFile(path.join(outputDir, 'network-errors.json'), `${JSON.stringify(networkErrors, null, 2)}\n`),
    ]);
    return result;
  } finally {
    await browser.close();
  }
}

async function main() {
  const sourceStats = await stat(source);
  assert(sourceStats.size === 304384407, `source size ${sourceStats.size}`);
  assert(await sha256File(source) === officialSha, 'official source checksum');

  const interrupted = importCli(resumed, '--abort-after', '3000');
  assert(interrupted.status === 75, `interrupted exit ${interrupted.status}: ${interrupted.stderr}`);
  const interruptedResult = JSON.parse(interrupted.stdout);
  const checkpoint = JSON.parse(await readFile(targets(resumed).checkpoint, 'utf8'));
  const acceptedPartial = `${targets(resumed).output}.partial`;
  const quarantinePartial = `${targets(resumed).quarantineOutput}.partial`;
  assert(checkpoint.status === 'interrupted' && interruptedResult.status === 'interrupted', 'durable interruption status');
  assert((await stat(acceptedPartial)).size === checkpoint.acceptedBytes, 'accepted durable byte boundary');
  assert((await stat(quarantinePartial)).size === checkpoint.quarantineBytes, 'quarantine durable byte boundary');
  assert(checkpoint.parsedCount === checkpoint.counts.parsed && checkpoint.acceptedCount === checkpoint.counts.accepted, 'checkpoint count projection');

  const cleanResult = await runImport(options(clean, checkpoint.retrievedAt));
  const resumedProcess = importCli(resumed, '--resume');
  assert(resumedProcess.status === 0, `resumed exit ${resumedProcess.status}: ${resumedProcess.stderr}`);
  const resumedResult = JSON.parse(resumedProcess.stdout);
  const cleanAccepted = await readFile(targets(clean).output);
  const resumedAccepted = await readFile(targets(resumed).output);
  const cleanQuarantine = await readFile(targets(clean).quarantineOutput);
  const resumedQuarantine = await readFile(targets(resumed).quarantineOutput);
  assert(cleanAccepted.equals(resumedAccepted), 'accepted artifacts are not byte-identical');
  assert(cleanQuarantine.equals(resumedQuarantine), 'quarantine artifacts are not byte-identical');
  assert(cleanResult.manifest.contentIdentitySha256 === resumedResult.manifest.contentIdentitySha256, 'content identity mismatch');
  assert(resumedResult.counts.accepted === 1000 && resumedResult.counts.invalid === 0
    && resumedResult.counts.quarantined === 0 && resumedResult.counts.duplicate === 0, 'resume count/loss/duplicate failure');

  const cleanBeforeRerun = await artifactHashes(clean);
  const rerun = importCli(clean);
  assert(rerun.status === 1 && /refusing to overwrite/i.test(rerun.stderr), `in-place rerun result ${rerun.status}: ${rerun.stderr}`);
  assert(JSON.stringify(await artifactHashes(clean)) === JSON.stringify(cleanBeforeRerun), 'in-place rerun changed final artifacts');

  const confinement = [];
  for (const directory of [path.join(releaseRoot, 'runs'), path.join(releaseRoot, 'runs', 'nested', 'run'), path.join(root, 'outside')]) {
    confinement.push(await expectReject(() => publishCorpusRun({ releaseRoot, runDirectory: directory }), /direct child/i, `confinement ${directory}`));
  }
  const outsideValid = path.join(root, 'outside-valid');
  const junctionEscape = path.join(releaseRoot, 'runs', 'junction-escape');
  await mkdir(outsideValid, { recursive: true });
  for (const file of ['accepted.jsonl', 'quarantine.jsonl', 'manifest.json', 'checkpoint.json']) {
    await copyFile(path.join(clean, file), path.join(outsideValid, file));
  }
  await symlink(outsideValid, junctionEscape, process.platform === 'win32' ? 'junction' : 'dir');
  const junctionError = await expectReject(
    () => publishCorpusRun({ releaseRoot, runDirectory: junctionEscape }),
    /symbolic link|junction|physical direct child/i,
    'physical junction escape',
  );
  let outsideSealCreated = true;
  try { await stat(path.join(outsideValid, 'seal.json')); } catch (error) {
    if (error?.code === 'ENOENT') outsideSealCreated = false;
    else throw error;
  }
  assert(!outsideSealCreated, 'junction rejection still wrote an outside seal');

  const managedBefore = { clean: await artifactHashes(clean), resumed: await artifactHashes(resumed) };
  const firstProcess = managerCli('publish', '--release-root', releaseRoot, '--run-dir', clean);
  assert(firstProcess.status === 0, `first publish CLI: ${firstProcess.stderr}`);
  const first = JSON.parse(firstProcess.stdout);
  assert(first.activeRun === 'clean' && first.history.length === 0, 'first pointer');
  const firstSeal = JSON.parse(await readFile(path.join(clean, 'seal.json'), 'utf8'));
  assert(firstSeal.sealSchemaVersion === 'corpus-run-seal.v1'
    && firstSeal.manifestSha256 === await sha256File(targets(clean).manifestOutput)
    && firstSeal.outputSha256 === await sha256File(targets(clean).output)
    && firstSeal.quarantineSha256 === await sha256File(targets(clean).quarantineOutput), 'first seal');
  const statusProcess = managerCli('status', '--release-root', releaseRoot);
  assert(statusProcess.status === 0 && JSON.stringify(JSON.parse(statusProcess.stdout)) === JSON.stringify(first), 'status CLI');
  const browserStates = [await browserSmoke('after-publish-clean')];

  const pointerPath = path.join(releaseRoot, 'current.json');
  const pointerBeforeNoop = await readFile(pointerPath);
  const pointerMtimeBeforeNoop = (await stat(pointerPath)).mtimeMs;
  const noOp = await publishCorpusRun({ releaseRoot, runDirectory: clean });
  assert(JSON.stringify(noOp) === JSON.stringify(first), 'repeated publish return');
  assert((await readFile(pointerPath)).equals(pointerBeforeNoop) && (await stat(pointerPath)).mtimeMs === pointerMtimeBeforeNoop, 'repeated publish rewrote pointer');

  const incomplete = path.join(releaseRoot, 'runs', 'incomplete');
  await mkdir(incomplete, { recursive: true });
  await writeFile(path.join(incomplete, 'accepted.jsonl.partial'), 'incomplete');
  const pointerBeforeIncomplete = await readFile(pointerPath);
  const incompleteError = await expectReject(() => publishCorpusRun({ releaseRoot, runDirectory: incomplete }), /manifest|complete/i, 'incomplete publish');
  assert((await readFile(pointerPath)).equals(pointerBeforeIncomplete), 'incomplete publish changed pointer');

  const secondProcess = managerCli('publish', '--release-root', releaseRoot, '--run-dir', resumed);
  assert(secondProcess.status === 0, `second publish CLI: ${secondProcess.stderr}`);
  const second = JSON.parse(secondProcess.stdout);
  assert(second.activeRun === 'resumed' && JSON.stringify(second.history) === JSON.stringify(['clean']), 'second pointer history');
  browserStates.push(await browserSmoke('after-publish-resumed'));

  const pointerBeforeCorruption = await readFile(pointerPath);
  const originalResumedAccepted = await readFile(targets(resumed).output);
  await writeFile(targets(resumed).output, 'corrupt');
  const corruptActiveError = await expectReject(() => publishCorpusRun({ releaseRoot, runDirectory: resumed }), /checksum/i, 'corrupt active republish');
  assert((await readFile(pointerPath)).equals(pointerBeforeCorruption), 'corrupt active changed pointer');
  await writeFile(targets(resumed).output, originalResumedAccepted);

  const originalCleanAccepted = await readFile(targets(clean).output);
  await writeFile(targets(clean).output, 'corrupt');
  const corruptRollbackError = await expectReject(() => rollbackCorpusRun(releaseRoot), /checksum/i, 'corrupt rollback target');
  assert((await readFile(pointerPath)).equals(pointerBeforeCorruption), 'corrupt rollback target changed pointer');
  await writeFile(targets(clean).output, originalCleanAccepted);

  const originalCleanManifest = await readFile(targets(clean).manifestOutput);
  const tamperedManifest = JSON.parse(originalCleanManifest.toString('utf8'));
  tamperedManifest.elapsedMs += 1;
  await writeFile(targets(clean).manifestOutput, `${JSON.stringify(tamperedManifest, null, 2)}\n`);
  const sealError = await expectReject(() => rollbackCorpusRun(releaseRoot), /seal/i, 'sealed manifest tamper');
  assert((await readFile(pointerPath)).equals(pointerBeforeCorruption), 'seal failure changed pointer');
  await writeFile(targets(clean).manifestOutput, originalCleanManifest);

  const rollbackProcess = managerCli('rollback', '--release-root', releaseRoot);
  assert(rollbackProcess.status === 0, `rollback CLI: ${rollbackProcess.stderr}`);
  const rolledBack = JSON.parse(rollbackProcess.stdout);
  assert(rolledBack.activeRun === 'clean' && rolledBack.history.length === 0, 'rollback pointer');
  browserStates.push(await browserSmoke('after-rollback'));

  assert(JSON.stringify(await artifactHashes(clean)) === JSON.stringify(managedBefore.clean), 'manager overwrote clean run artifact');
  assert(JSON.stringify(await artifactHashes(resumed)) === JSON.stringify(managedBefore.resumed), 'manager overwrote resumed run artifact');
  const pointerTemps = (await readdir(releaseRoot)).filter((name) => name.startsWith('current.json.tmp-'));
  assert(pointerTemps.length === 0, `pointer temp leftovers: ${pointerTemps}`);

  const result = {
    verdict: 'PASS', generatedAt: new Date().toISOString(), tempRunRoot: root,
    source: { path: source, size: sourceStats.size, sha256: officialSha },
    processRecovery: {
      interruptedExitCode: interrupted.status, interruptedCounts: interruptedResult.counts,
      checkpoint: { status: checkpoint.status, sourceRowsCommitted: checkpoint.sourceRowsCommitted,
        acceptedBytes: checkpoint.acceptedBytes, quarantineBytes: checkpoint.quarantineBytes },
      resumedExitCode: resumedProcess.status, resumedCounts: resumedResult.counts,
    },
    reproducibility: {
      acceptedByteIdentical: true, quarantineByteIdentical: true,
      acceptedSha256: createHash('sha256').update(cleanAccepted).digest('hex'),
      quarantineSha256: createHash('sha256').update(cleanQuarantine).digest('hex'),
      cleanContentIdentitySha256: cleanResult.manifest.contentIdentitySha256,
      resumedContentIdentitySha256: resumedResult.manifest.contentIdentitySha256,
    },
    idempotency: { inPlaceRerunExitCode: rerun.status, finalArtifactsUnchanged: true, repeatedPublishNoOpNoWrite: true },
    confinement: { lexical: confinement, junctionError, outsideSealCreated },
    release: { first, status: JSON.parse(statusProcess.stdout), second, rolledBack, firstSeal,
      incompleteError, corruptActiveError, corruptRollbackError, sealError,
      pointerAtomicNoTempLeftovers: true, runArtifactsUnchanged: true },
    browserStates,
  };
  await writeFile(path.join(evidenceRoot, 'recovery-release-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(async (error) => {
  const result = { verdict: 'FAIL', generatedAt: new Date().toISOString(), tempRunRoot: root,
    error: error instanceof Error ? error.stack : String(error) };
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(path.join(evidenceRoot, 'recovery-release-failure.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stderr.write(`${result.error}\n`);
  process.exitCode = 1;
});
