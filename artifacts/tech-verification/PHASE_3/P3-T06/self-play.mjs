import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T06');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = { console: [], page: [], network: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });
await page.addInitScript(() => {
  if (!sessionStorage.getItem('__p3t06Initialized')) {
    localStorage.clear();
    sessionStorage.setItem('__p3t06Initialized', 'true');
  }
  localStorage.setItem('chess-app-onboarding', 'true');
});

async function dragMove(from, to) {
  const source = await page.locator(`[data-square="${from}"]`).boundingBox();
  const target = await page.locator(`[data-square="${to}"]`).boundingBox();
  assert(source && target, `Missing board square for ${from}${to}`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await page.mouse.up();
}

async function solve00008() {
  await dragMove('e6', 'e7');
  await page.getByText(/ti.p t.c/i).waitFor();
  await dragMove('b3', 'c1');
  await page.getByText(/ti.p t.c/i).waitFor();
  await dragMove('h6', 'c1');
  await page.getByText(/^Ch.nh x.c!/i).waitFor();
  await page.waitForTimeout(200);
}

const profile = () => page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30000 });

  await dragMove('e6', 'f6');
  await page.getByText(/Ch.a .úng/i).waitFor();
  await page.getByRole('button', { name: /L.m l.i/i }).click();
  await solve00008();

  const afterFirstSolve = await profile();
  const first = afterFirstSolve.persistence.puzzleAttempts[0];
  assert.equal(first.status, 'solved');
  assert.deepEqual(first.events.map(({ type, solved }) => ({ type, solved })), [
    { type: 'wrong', solved: false },
    { type: 'retry', solved: false },
    { type: 'correct', solved: false },
    { type: 'correct', solved: false },
    { type: 'correct', solved: true },
  ]);
  assert.equal(new Set(first.events.map(({ eventId }) => eventId)).size, 5);

  const rawBeforeNewAttempt = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  await page.getByRole('button', { name: /L.m l.i/i }).click();
  await page.getByText(/^K.o qu.n/i).waitFor();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile')), rawBeforeNewAttempt);
  await solve00008();

  const afterSecondSolve = await profile();
  assert.equal(afterSecondSolve.persistence.puzzleAttempts.length, 2);
  const second = afterSecondSolve.persistence.puzzleAttempts[1];
  assert.notEqual(second.attemptId, first.attemptId);
  assert.deepEqual(second.events.map(({ type, solved }) => ({ type, solved })), [
    { type: 'correct', solved: false },
    { type: 'correct', solved: false },
    { type: 'correct', solved: true },
  ]);

  await page.getByRole('button', { name: /B.i ti.p theo/i }).click();
  await page.getByText('Lichess puzzle 0000D').waitFor();
  await page.getByRole('button', { name: /B.i ti.p theo/i }).click();
  await page.getByText('Lichess puzzle 0008Q').waitFor();
  await page.screenshot({ path: path.join(output, 'next-real-puzzle.png'), fullPage: true });

  const rawBeforeReload = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile')), rawBeforeReload);
  assert(!errors.console.length && !errors.page.length && !errors.network.length, JSON.stringify(errors));

  const result = {
    verdict: 'PASS', puzzleId: first.puzzleId,
    firstAttempt: { attemptId: first.attemptId, events: first.events.length, status: first.status },
    secondAttempt: { attemptId: second.attemptId, events: second.events.length, status: second.status },
    distinctAttemptIds: first.attemptId !== second.attemptId,
    nextPuzzles: ['lichess-0000D', 'lichess-0008Q'],
    exactReloadBytes: true, errors,
  };
  await Promise.all([
    writeFile(path.join(output, 'self-play.json'), `${JSON.stringify(result, null, 2)}\n`),
    writeFile(path.join(output, 'browser-console.json'), `${JSON.stringify(errors.console, null, 2)}\n`),
    writeFile(path.join(output, 'page-errors.json'), `${JSON.stringify(errors.page, null, 2)}\n`),
    writeFile(path.join(output, 'network-errors.json'), `${JSON.stringify(errors.network, null, 2)}\n`),
  ]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}
