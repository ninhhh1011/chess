import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { BOT_ELO_LEVELS } from '../../../../../src/data/botLevels.js';

const baseUrl = process.env.VERIFIER_BASE_URL || 'http://127.0.0.1:4182';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T02/verifier';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const engineResponses = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (/stockfish-worker\.js|stockfish\.(?:js|wasm)/.test(response.url())) {
    engineResponses.push({ url: response.url(), status: response.status() });
  }
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__p1t02 = { workerUrls: [], commands: [], options: [], searches: [] };

  window.Worker = class TrackedWorker extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('stockfish-worker.js');
      if (!this.__stockfish) return;
      window.__p1t02.workerUrls.push(String(url));
      this.addEventListener('message', (event) => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string') return;
        if (line.startsWith('option name ')) window.__p1t02.options.push(line);
        const search = window.__p1t02.searches.findLast((item) => !item.bestmove);
        if (!search) return;
        const depth = line.match(/\bdepth (\d+)/);
        const time = line.match(/\btime (\d+)/);
        if (depth) search.depth = Math.max(search.depth, Number(depth[1]));
        if (time) search.engineTimeMs = Number(time[1]);
        if (line.startsWith('bestmove ')) {
          search.bestmove = line.split(/\s+/)[1];
          search.wallTimeMs = Math.round(performance.now() - search.startedAt);
        }
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        const commandIndex = window.__p1t02.commands.push(message) - 1;
        if (message.startsWith('go ')) {
          window.__p1t02.searches.push({
            command: message,
            commandIndex,
            startedAt: performance.now(),
            depth: 0,
            engineTimeMs: null,
            wallTimeMs: null,
            bestmove: null,
          });
        }
      }
      return super.postMessage(message, ...rest);
    }
  };
});

function strictIncrease(key) {
  return BOT_ELO_LEVELS.every((level, index) => index === 0 || level[key] > BOT_ELO_LEVELS[index - 1][key]);
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const initialButtons = page.locator('button[aria-pressed]');
  if (await initialButtons.count() !== 4) throw new Error('Expected exactly four displayed difficulty controls');
  const displayed = await initialButtons.evaluateAll((buttons) => buttons.map((button) => ({
    label: button.textContent.trim(),
    ariaLabel: button.getAttribute('aria-label'),
  })));

  const runs = [];
  const sequence = [0, 1, 2, 3, 0];
  for (let runIndex = 0; runIndex < sequence.length; runIndex += 1) {
    const levelIndex = sequence[runIndex];
    const level = BOT_ELO_LEVELS[levelIndex];
    const searchStart = await page.evaluate(() => window.__p1t02.searches.length);
    const buttons = page.locator('button[aria-pressed]');
    await buttons.nth(levelIndex).click();
    const colorButtons = page.locator('button[aria-label]');
    await colorButtons.last().click();
    await page.locator('.pt-2 button').click();
    await page.locator('.chess-board-container').waitFor({ state: 'visible' });

    const expectedGo = `go movetime ${level.movetime}`;
    await page.waitForFunction(
      ({ start, command }) => window.__p1t02.searches.slice(start).some((search) => search.command === command && search.bestmove),
      { start: searchStart, command: expectedGo },
      { timeout: 30000 },
    );
    await page.waitForFunction(
      (start) => window.__p1t02.searches.slice(start).filter((search) => search.bestmove).length >= 3,
      searchStart,
      { timeout: 15000 },
    );

    const captured = await page.evaluate(({ start, command }) => {
      const all = window.__p1t02;
      const search = all.searches.slice(start).find((item) => item.command === command && item.bestmove);
      const previousGoIndex = all.commands.findLastIndex((item, index) => index < search.commandIndex && item.startsWith('go '));
      return {
        search,
        scopedCommands: all.commands.slice(previousGoIndex + 1, search.commandIndex + 1),
        searchesAfterMove: all.searches.slice(start),
        allCommands: [...all.commands],
      };
    }, { start: searchStart, command: expectedGo });

    const game = new Chess();
    const move = captured.search.bestmove;
    const legal = Boolean(game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] }));
    const expectedMode = `setoption name UCI_LimitStrength value ${!level.useSkillLevelOnly}`;
    const expectedStrength = level.useSkillLevelOnly
      ? `setoption name Skill Level value ${level.skillLevel}`
      : `setoption name UCI_Elo value ${level.elo}`;

    await page.screenshot({ path: `${outputDir}/run-${runIndex + 1}-${level.elo}.png`, fullPage: true });
    runs.push({
      runIndex: runIndex + 1,
      displayed: displayed[levelIndex],
      config: level,
      source: 'stockfish_wasm',
      legal,
      expectedMode,
      expectedStrength,
      ...captured,
    });

    if (runIndex < sequence.length - 1) {
      await page.locator('button[aria-label="Ván mới"]').click();
      await page.getByRole('button', { name: 'Đổi cấp độ' }).click();
      await page.locator('button[aria-pressed]').first().waitFor({ state: 'visible' });
    }
  }

  const state = await page.evaluate(() => window.__p1t02);
  const eloOption = state.options.find((line) => line.startsWith('option name UCI_Elo '));
  const skillOption = state.options.find((line) => line.startsWith('option name Skill Level '));
  const eloMatch = eloOption?.match(/min (\d+) max (\d+)/);
  const skillMatch = skillOption?.match(/min (\d+) max (\d+)/);
  const advertisedRanges = {
    elo: eloMatch ? { min: Number(eloMatch[1]), max: Number(eloMatch[2]), raw: eloOption } : null,
    skill: skillMatch ? { min: Number(skillMatch[1]), max: Number(skillMatch[2]), raw: skillOption } : null,
  };
  const sentElos = state.commands
    .map((command) => command.match(/^setoption name UCI_Elo value (\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const outOfRangeEloCommands = advertisedRanges.elo
    ? sentElos.filter((elo) => elo < advertisedRanges.elo.min || elo > advertisedRanges.elo.max)
    : sentElos;

  const monotonic = Object.fromEntries(['elo', 'depth', 'movetime', 'skillLevel'].map((key) => [key, strictIncrease(key)]));
  const botRunsValid = runs.every((run) => run.legal
    && run.scopedCommands.includes(run.expectedMode)
    && run.scopedCommands.includes(run.expectedStrength)
    && run.scopedCommands.includes(run.search.command));
  const result = {
    verdict: botRunsValid && Object.values(monotonic).every(Boolean) && outOfRangeEloCommands.length === 0 ? 'PASS' : 'FAIL',
    browser: 'Chromium',
    buildUrl: baseUrl,
    displayed,
    monotonic,
    advertisedRanges,
    engineResponses,
    workerUrls: state.workerUrls,
    runs,
    sentElos,
    outOfRangeEloCommands,
    consoleErrors,
    pageErrors,
    networkErrors,
  };

  await writeFile(`${outputDir}/browser.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
