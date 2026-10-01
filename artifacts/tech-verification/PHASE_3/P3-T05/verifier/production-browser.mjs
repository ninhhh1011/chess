import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4291';
const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T05/verifier');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = { console: [], page: [], network: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });
await page.addInitScript(() => {
  if (!sessionStorage.getItem('__p3t05Initialized')) {
    localStorage.clear();
    sessionStorage.setItem('__p3t05Initialized', 'true');
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

const profile = () => page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30000 });
  const initial = await profile();
  assert(initial.dailyTrainingPlan.tasks.length > 0);
  assert(initial.persistence.trainingPlans.some(({ planId }) => planId === initial.dailyTrainingPlan.planId));

  await dragMove('e6', 'f6');
  await page.getByText(/Chưa đúng/).waitFor();
  await page.waitForTimeout(250);
  const afterWrong = await profile();
  const wrongEventId = afterWrong.persistence.puzzleAttempts[0].events[0].eventId;
  const wrongTask = afterWrong.dailyTrainingPlan.tasks.find(({ type }) => type === 'exercise');
  assert.notEqual(afterWrong.dailyTrainingPlan.planId, initial.dailyTrainingPlan.planId);
  assert.deepEqual(
    { id: wrongTask.id, skillTag: wrongTask.skillTag, evidenceIds: wrongTask.evidenceIds },
    { id: 'skill:crushing', skillTag: 'crushing', evidenceIds: [wrongEventId] },
  );

  await page.getByRole('button', { name: 'Làm lại' }).click();
  await page.waitForTimeout(250);
  const afterRetry = await profile();
  await dragMove('e6', 'e7');
  await page.getByText(/hãy tiếp tục/).waitFor();
  const afterIntermediate = await profile();
  assert.equal(afterRetry.dailyTrainingPlan.planId, afterWrong.dailyTrainingPlan.planId);
  assert.equal(afterIntermediate.dailyTrainingPlan.planId, afterWrong.dailyTrainingPlan.planId);

  await dragMove('b3', 'c1');
  await page.getByText(/hãy tiếp tục/).waitFor();
  await dragMove('h6', 'c1');
  await page.getByText('Chính xác! Bạn đã hoàn tất lời giải.').waitFor();
  await page.waitForTimeout(250);
  const rawBeforeReload = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  const solved = JSON.parse(rawBeforeReload);
  const solvedEventId = solved.persistence.puzzleAttempts[0].events.at(-1).eventId;
  const solvedTask = solved.dailyTrainingPlan.tasks.find(({ type }) => type === 'exercise');
  assert.notEqual(solved.dailyTrainingPlan.planId, afterWrong.dailyTrainingPlan.planId);
  assert.deepEqual(solvedTask.evidenceIds, [wrongEventId, solvedEventId]);
  assert(solved.dailyTrainingPlan.tasks.length > 0);
  assert(solved.persistence.trainingPlans.some(({ planId }) => planId === solved.dailyTrainingPlan.planId));
  assert.equal(new Set(solved.persistence.trainingPlans.map(({ planId }) => planId)).size, solved.persistence.trainingPlans.length);

  await page.goto(`${baseUrl}/training`, { waitUntil: 'networkidle' });
  await page.getByText('Bài tập: crushing').waitFor();
  await page.getByText('crushing', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'evidence-driven-plan.png'), fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Bài tập: crushing').waitFor();
  const rawAfterReload = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  assert.equal(rawAfterReload, rawBeforeReload);
  assert(!errors.console.length && !errors.page.length && !errors.network.length, JSON.stringify(errors));

  const result = {
    verdict: 'PASS', initialPlanId: initial.dailyTrainingPlan.planId,
    wrongPlanId: afterWrong.dailyTrainingPlan.planId, solvedPlanId: solved.dailyTrainingPlan.planId,
    initialTaskCount: initial.dailyTrainingPlan.tasks.length, solvedTask,
    trainingPlanHistory: solved.persistence.trainingPlans.length,
    retryKeptPlan: afterRetry.dailyTrainingPlan.planId === afterWrong.dailyTrainingPlan.planId,
    intermediateKeptPlan: afterIntermediate.dailyTrainingPlan.planId === afterWrong.dailyTrainingPlan.planId,
    exactReloadBytes: rawAfterReload === rawBeforeReload, errors,
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
