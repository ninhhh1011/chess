import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4176';
const outputDir = 'artifacts/tech-verification/PHASE_0/P0-T07';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

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
  window.__workerEvidence = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(workerUrl, options) {
      super(workerUrl, options);
      if (String(workerUrl).includes('stockfish-worker.js')) {
        window.__workerEvidence.starts.push(String(workerUrl));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__workerEvidence.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
            window.__workerEvidence.bestmoves.push(event.data.data);
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
  const box = await page.locator('.chess-board-container').boundingBox();
  if (!box) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(box.x + (file + 0.5) * box.width / 8, box.y + (8 - rank + 0.5) * box.height / 8);
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const skipOnboarding = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skipOnboarding.isVisible({ timeout: 500 }).catch(() => false)) await skipOnboarding.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  const replay = new Chess();
  for (const preferred of ['e2e4', 'g1f3', 'd2d3']) {
    const legal = replay.moves({ verbose: true });
    const choice = legal.find((move) => `${move.from}${move.to}` === preferred) || legal.find((move) => !move.promotion);
    const before = (await history()).length;
    await clickSquare(choice.from);
    await clickSquare(choice.to);
    await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
      .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= count, before + 2, { timeout: 30000 });
    const moves = await history();
    replay.reset();
    for (const san of moves) replay.move(san);
  }

  const sanMoves = await history();
  if (sanMoves.length !== 6 || replay.turn() !== 'w') throw new Error(`Invalid self-play state: ${sanMoves.join(' ')}`);
  const worker = await page.evaluate(() => window.__workerEvidence);
  if (!worker.ready.some((entry) => entry.success === true) || worker.bestmoves.length < 3) {
    throw new Error('Missing real Stockfish evidence');
  }

  await page.getByRole('link', { name: 'Tiến bộ', exact: true }).click();
  await page.waitForURL('**/training');
  await page.getByText('Nhiệm vụ hôm nay', { exact: true }).waitFor({ state: 'visible' });
  for (const label of ['Bài học', 'Bài tập', 'Rèn luyện', 'Thực chiến']) {
    await page.getByText(label, { exact: true }).waitFor({ state: 'visible' });
  }
  const trainingProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));
  const taskTypes = trainingProfile.dailyTrainingPlan.tasks.map((task) => task.type);
  if (trainingProfile.schemaVersion !== 'profile.v1' || trainingProfile.dailyTrainingPlan.schemaVersion !== 'training.v1') {
    throw new Error(`Unversioned training profile: ${JSON.stringify(trainingProfile)}`);
  }
  if (!['lesson', 'exercise', 'opening', 'challenge'].every((type) => taskTypes.includes(type))) {
    throw new Error(`Missing rendered task type: ${taskTypes.join(',')}`);
  }

  await page.getByRole('button', { name: 'Luyện tập' }).click();
  await page.getByRole('link', { name: 'Bài tập chiến thuật' }).click();
  await page.waitForURL('**/exercises');
  await page.getByRole('heading', { name: 'Chiếu hết trong 1: Hậu áp sát' }).waitFor({ state: 'visible' });
  const source = await page.locator('[data-square="g6"]').boundingBox();
  const target = await page.locator('[data-square="f7"]').boundingBox();
  if (!source || !target) throw new Error('Exercise move squares are not visible');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 });
  await page.mouse.up();
  await page.getByText('Chính xác! Nước cờ tối ưu.', { exact: true }).waitFor({ state: 'visible' });

  const updatedProfile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));
  if (updatedProfile.exerciseStats.total !== 1 || !updatedProfile.exercisesCompleted.includes('mate_one_queen')) {
    throw new Error(`Exercise progress was not persisted: ${JSON.stringify(updatedProfile.exerciseStats)}`);
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  const evidence = {
    verdict: 'PASS',
    route: '/play → /training → /exercises',
    browser: 'Chromium',
    viewport: '1440x900',
    plies: sanMoves.length,
    sanMoves,
    finalFen: replay.fen(),
    pgnReplay: 'PASS',
    engineSource: 'stockfish_wasm',
    profileSchemaVersion: trainingProfile.schemaVersion,
    planSchemaVersion: trainingProfile.dailyTrainingPlan.schemaVersion,
    taskTypes,
    taskCount: trainingProfile.dailyTrainingPlan.tasks.length,
    exerciseId: 'mate_one_queen',
    exerciseResult: 'correct',
    persistedExerciseTotal: updatedProfile.exerciseStats.total,
    persistedCompletedExercises: updatedProfile.exercisesCompleted,
    worker,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await page.screenshot({ path: `${outputDir}/self-play.png`, fullPage: true });
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
