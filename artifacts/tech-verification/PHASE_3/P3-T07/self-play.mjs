import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T07');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let page = await context.newPage();
const errors = { console: [], page: [], network: [] };
const observe = (target) => {
  target.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
  target.on('pageerror', (error) => errors.page.push(error.message));
  target.on('requestfailed', (request) => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  target.on('response', (response) => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });
};
observe(page);
await page.addInitScript(() => {
  if (!sessionStorage.getItem('__p3t07Initialized')) {
    localStorage.clear();
    sessionStorage.setItem('__p3t07Initialized', 'true');
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

const rawProfile = () => page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30000 });
  await dragMove('e6', 'f6');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')).persistence.puzzleAttempts[0]?.events.length === 1);
  await page.getByRole('button', { name: /L.m l.i/i }).click();
  await dragMove('e6', 'e7');
  await page.getByText(/ti.p t.c/i).waitFor();
  await dragMove('b3', 'c1');
  await page.getByText(/ti.p t.c/i).waitFor();
  await dragMove('h6', 'c1');
  await page.getByText(/^Ch.nh x.c!/i).waitFor();
  await page.waitForTimeout(200);

  const durableRaw = await rawProfile();
  const durable = JSON.parse(durableRaw);
  assert.equal(durable.persistence.puzzleAttempts[0].status, 'solved');
  assert.equal(durable.persistence.puzzleAttempts[0].events.length, 5);
  assert.equal(durable.persistence.skillStates[0].evidenceIds.length, 2);
  assert(durable.persistence.trainingPlans.some(({ planId }) => planId === durable.dailyTrainingPlan.planId));

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await rawProfile(), durableRaw);
  await page.close();
  page = await context.newPage();
  observe(page);
  await page.goto(`${baseUrl}/training`, { waitUntil: 'networkidle' });
  await page.getByText('Bài tập: crushing').waitFor();
  assert.equal(await rawProfile(), durableRaw);

  const malformed = '{"schemaVersion":"profile.v2","profileId":';
  await page.evaluate((value) => localStorage.setItem('vuaCoUserTrainingProfile', value), malformed);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await rawProfile(), malformed);
  await page.evaluate((value) => localStorage.setItem('vuaCoUserTrainingProfile', value), durableRaw);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Bài tập: crushing').waitFor();
  assert.equal(await rawProfile(), durableRaw);
  await page.screenshot({ path: path.join(output, 'restored-progress.png'), fullPage: true });
  assert(!errors.console.length && !errors.page.length && !errors.network.length, JSON.stringify(errors));

  const result = {
    verdict: 'PASS', profileId: durable.profileId, revision: durable.revision,
    attemptEvents: durable.persistence.puzzleAttempts[0].events.length,
    skillEvidence: durable.persistence.skillStates[0].evidenceIds.length,
    reloadExact: true, newTabExact: true, malformedBytesPreserved: true,
    restoredExact: true, errors,
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
