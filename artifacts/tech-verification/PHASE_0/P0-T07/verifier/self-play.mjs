import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = 'http://127.0.0.1:4182';
const outputDir = 'artifacts/tech-verification/PHASE_0/P0-T07/verifier';
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__p0t07Worker = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes('stockfish-worker.js')) {
        window.__p0t07Worker.starts.push(String(url));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__p0t07Worker.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
            window.__p0t07Worker.bestmoves.push(event.data.data);
          }
        });
      }
    }
  };
});

function history() {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function clickSquare(square) {
  const board = await page.locator('.chess-board-container').boundingBox();
  if (!board) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(
    board.x + (file + 0.5) * board.width / 8,
    board.y + (8 - rank + 0.5) * board.height / 8,
  );
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) await skip.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  const replay = new Chess();
  for (const preferredUci of ['e2e4', 'g1f3', 'd2d3']) {
    const legalMoves = replay.moves({ verbose: true });
    const move = legalMoves.find((candidate) => `${candidate.from}${candidate.to}` === preferredUci)
      || legalMoves.find((candidate) => !candidate.promotion);
    const previousPlies = (await history()).length;
    await clickSquare(move.from);
    await clickSquare(move.to);
    await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
      .map((span) => span.textContent?.trim() || '')
      .filter((value) => /^\d+\.\s+\S+/.test(value)).length >= expected, previousPlies + 2, { timeout: 30000 });
    replay.reset();
    for (const san of await history()) replay.move(san);
  }

  const sanMoves = await history();
  if (sanMoves.length < 6) throw new Error(`Only ${sanMoves.length} plies completed`);
  const worker = await page.evaluate(() => window.__p0t07Worker);
  if (!worker.starts.length || !worker.ready.some((entry) => entry.success === true) || worker.bestmoves.length < 3) {
    throw new Error(`Missing real Stockfish evidence: ${JSON.stringify(worker)}`);
  }

  await page.locator('a[href="/training"]').first().click();
  await page.waitForURL('**/training');
  await page.getByText('Nhiệm vụ hôm nay', { exact: true }).waitFor({ state: 'visible' });
  const taskLabels = ['Bài học', 'Bài tập', 'Thực chiến', 'Rèn luyện'];
  for (const label of taskLabels) await page.getByText(label, { exact: true }).waitFor({ state: 'visible' });

  const trainingProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));
  const taskTypes = trainingProfile.dailyTrainingPlan.tasks.map((task) => task.type);
  if (trainingProfile.schemaVersion !== 'profile.v1') throw new Error(`Profile version: ${trainingProfile.schemaVersion}`);
  if (trainingProfile.dailyTrainingPlan.schemaVersion !== 'training.v1') {
    throw new Error(`Training version: ${trainingProfile.dailyTrainingPlan.schemaVersion}`);
  }
  if (!['lesson', 'exercise', 'opening', 'challenge'].every((type) => taskTypes.includes(type))) {
    throw new Error(`Missing canonical task type: ${taskTypes.join(',')}`);
  }
  const canonicalTasksPass = trainingProfile.dailyTrainingPlan.tasks.length > 0
    && trainingProfile.dailyTrainingPlan.tasks.every((task) =>
      ['lesson', 'exercise', 'opening', 'challenge'].includes(task.type)
      && [task.id, task.title, task.reason].every((value) => typeof value === 'string' && value.trim()));

  await page.getByRole('button', { name: 'Luyện tập' }).click();
  await page.locator('a[href="/exercises"]').click();
  await page.waitForURL('**/exercises');
  await page.getByRole('heading', { name: 'Chiếu hết trong 1: Hậu áp sát' }).waitFor({ state: 'visible' });
  const from = await page.locator('[data-square="g6"]').boundingBox();
  const to = await page.locator('[data-square="f7"]').boundingBox();
  if (!from || !to) throw new Error('Exercise move squares are not visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();
  await page.getByText('Chính xác! Nước cờ tối ưu.', { exact: true }).waitFor({ state: 'visible' });

  const updatedProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));
  if (updatedProfile.exerciseStats.total !== 1 || !updatedProfile.exercisesCompleted.includes('mate_one_queen')) {
    throw new Error(`Exercise progress not persisted: ${JSON.stringify(updatedProfile)}`);
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  await page.screenshot({ path: `${outputDir}/self-play.png`, fullPage: true });
  const evidence = {
    verdict: 'BROWSER_PASS',
    server: 'fresh Vite production preview of dist/',
    browser: 'Chromium',
    viewport: '1440x900',
    route: '/play -> visible navigation -> /training -> visible navigation -> /exercises',
    plies: sanMoves.length,
    sanMoves,
    finalFen: replay.fen(),
    pgnReplay: 'PASS',
    engineSource: 'stockfish_wasm',
    profileSchemaVersion: trainingProfile.schemaVersion,
    planSchemaVersion: trainingProfile.dailyTrainingPlan.schemaVersion,
    taskTypes,
    taskCount: trainingProfile.dailyTrainingPlan.tasks.length,
    canonicalTasksPass,
    canonicalTasks: trainingProfile.dailyTrainingPlan.tasks.map(({ id, type, title, reason }) => ({ id, type, title, reason })),
    renderedLabels: taskLabels,
    exerciseId: 'mate_one_queen',
    exerciseMove: 'g6f7',
    persistedExerciseTotal: updatedProfile.exerciseStats.total,
    persistedCompletedExercises: updatedProfile.exercisesCompleted,
    worker,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
