import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T04');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = { console: [], page: [], network: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });
await page.addInitScript(() => {
  if (!sessionStorage.getItem('__p3t04Initialized')) {
    localStorage.clear();
    sessionStorage.setItem('__p3t04Initialized', 'true');
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

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30000 });
  await dragMove('e6', 'f6');
  await page.getByText(/Chưa đúng/).waitFor();
  await page.waitForTimeout(250);
  const afterWrong = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));
  const wrongEventId = afterWrong.persistence.puzzleAttempts[0].events[0].eventId;
  assert.equal(afterWrong.persistence.skillStates.length, 4);
  assert(afterWrong.persistence.skillStates.every((state) => state.score === -1
    && state.evidenceIds.length === 1 && state.evidenceIds[0] === wrongEventId));

  await page.getByRole('button', { name: 'Làm lại' }).click();
  await page.waitForTimeout(250);
  await dragMove('e6', 'e7');
  await page.getByText(/hãy tiếp tục/).waitFor();
  await dragMove('b3', 'c1');
  await page.getByText(/hãy tiếp tục/).waitFor();
  await dragMove('h6', 'c1');
  await page.getByText('Chính xác! Bạn đã hoàn tất lời giải.').waitFor();

  const rawBeforeReload = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  const profile = JSON.parse(rawBeforeReload);
  const attempt = profile.persistence.puzzleAttempts[0];
  const solvedEventId = attempt.events.at(-1).eventId;
  const expectedSkills = ['crushing', 'hangingPiece', 'long', 'middlegame'];
  assert.deepEqual(profile.persistence.skillStates.map(({ skillId }) => skillId), expectedSkills);
  for (const state of profile.persistence.skillStates) {
    assert.deepEqual(
      { score: state.score, evidenceIds: state.evidenceIds, createdAt: state.createdAt, updatedAt: state.updatedAt },
      { score: 0, evidenceIds: [wrongEventId, solvedEventId], createdAt: attempt.events[0].at, updatedAt: attempt.events.at(-1).at },
    );
    assert(attempt.skillTags.includes(state.skillId));
    assert(state.evidenceIds.every((evidenceId) => attempt.events.some((event) => event.eventId === evidenceId)));
  }
  await page.screenshot({ path: path.join(output, 'skill-state-trace.png'), fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30000 });
  const rawAfterReload = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  assert.equal(rawAfterReload, rawBeforeReload);
  assert(!errors.console.length && !errors.page.length && !errors.network.length, JSON.stringify(errors));

  const result = {
    verdict: 'PASS', puzzleId: attempt.puzzleId, sourcePuzzleId: attempt.sourcePuzzleId,
    attemptId: attempt.attemptId, attemptSkillTags: attempt.skillTags,
    skillStates: profile.persistence.skillStates, exactReloadBytes: rawAfterReload === rawBeforeReload, errors,
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
